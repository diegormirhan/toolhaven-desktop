use std::io::{BufRead, BufReader, Read};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            execute_operation,
            detect_available_tools
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct OperationRequest {
    tool_id: String,
    operation_id: String,
    input_paths: Vec<String>,
    output_path: Option<String>,
    #[serde(default)]
    options: std::collections::HashMap<String, String>,
    #[serde(default)]
    source_url: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationResult {
    executable: String,
    stdout: String,
    stderr: String,
    output_path: Option<String>,
    message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct OperationProgress {
    tool_id: String,
    operation_id: String,
    phase: String,
    progress: Option<f64>,
    message: String,
}

#[tauri::command]
fn detect_available_tools() -> Vec<String> {
    [
        "ffmpeg", "ffprobe", "yt-dlp", "deno", "qpdf", "libvips", "jq", "yq", "ripgrep", "fd",
        "7zip", "pandoc",
    ]
    .into_iter()
    .filter(|tool_id| {
        executable_name(tool_id)
            .and_then(|name| resolve_executable(&name))
            .is_ok()
    })
    .map(str::to_string)
    .collect()
}

#[tauri::command]
async fn execute_operation(
    app: tauri::AppHandle,
    request: OperationRequest,
) -> Result<OperationResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        execute_operation_with_progress(request, &|progress| {
            let _ = app.emit("operation-progress", progress);
        })
    })
    .await
    .map_err(|error| format!("A tarefa foi interrompida: {error}"))?
}

#[cfg(test)]
fn execute_operation_inner(request: OperationRequest) -> Result<OperationResult, String> {
    execute_operation_with_progress(request, &|_| {})
}

fn execute_operation_with_progress(
    mut request: OperationRequest,
    report_progress: &(dyn Fn(OperationProgress) + Send + Sync),
) -> Result<OperationResult, String> {
    if operation_writes_file(&request) && request.output_path.is_none() {
        request.output_path = Some(default_output_path(&request));
    }
    validate_request(&request)?;
    let executable = executable_name(&request.tool_id)?;
    let executable_path = resolve_executable(&executable)?;
    let args = resolve_args(&request)?;
    let output_path = operation_writes_file(&request).then(|| {
        request
            .output_path
            .clone()
            .unwrap_or_else(|| default_output_path(&request))
    });
    let mut command = std::process::Command::new(&executable_path);
    command.args(args).stdin(std::process::Stdio::null());
    if request.tool_id == "yt-dlp" {
        if let Ok(ffmpeg) = resolve_executable("ffmpeg.exe") {
            command
                .arg("--ffmpeg-location")
                .arg(ffmpeg.parent().unwrap());
        }
        if let Ok(deno) = resolve_executable("deno.exe") {
            command
                .arg("--js-runtimes")
                .arg(format!("deno:{}", deno.display()));
        }
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW keeps CLI children out of the desktop.
    }
    let completion_message = if request.tool_id == "yt-dlp" {
        "Download concluído.".into()
    } else if request.tool_id == "libvips" && request.operation_id == "upscale" {
        format!(
            "Imagem ampliada em {}× com Lanczos3.",
            request
                .options
                .get("scale")
                .map(String::as_str)
                .unwrap_or("2")
        )
    } else {
        "Operação concluída.".into()
    };
    report_progress(OperationProgress {
        tool_id: request.tool_id.clone(),
        operation_id: request.operation_id.clone(),
        phase: "starting".into(),
        progress: Some(0.0),
        message: format!("Iniciando {executable}…"),
    });
    let output = if request.tool_id == "yt-dlp"
        && matches!(
            request.operation_id.as_str(),
            "download-video" | "download-audio"
        ) {
        run_download_process(&mut command, &request, report_progress)
            .map_err(|error| format!("Não foi possível iniciar {executable}: {error}"))?
    } else {
        command
            .output()
            .map_err(|error| format!("Não foi possível iniciar {executable}: {error}"))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
    let no_matches = request.tool_id == "ripgrep" && output.status.code() == Some(1);
    if !output.status.success() && !no_matches {
        report_progress(OperationProgress {
            tool_id: request.tool_id.clone(),
            operation_id: request.operation_id.clone(),
            phase: "error".into(),
            progress: None,
            message: compact_error(if stderr.is_empty() { &stdout } else { &stderr }),
        });
        return Err(format!(
            "{executable} falhou ({}): {}",
            output.status,
            compact_error(if stderr.is_empty() { &stdout } else { &stderr })
        ));
    }

    report_progress(OperationProgress {
        tool_id: request.tool_id.clone(),
        operation_id: request.operation_id.clone(),
        phase: "completed".into(),
        progress: Some(1.0),
        message: completion_message.clone(),
    });

    Ok(OperationResult {
        executable,
        stdout: if no_matches {
            "Nenhuma correspondência encontrada.".into()
        } else {
            stdout
        },
        stderr,
        output_path,
        message: completion_message,
    })
}

fn run_download_process(
    command: &mut std::process::Command,
    request: &OperationRequest,
    report_progress: &(dyn Fn(OperationProgress) + Send + Sync),
) -> std::io::Result<std::process::Output> {
    command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = command.spawn()?;
    let stdout = child.stdout.take().expect("stdout was piped");
    let stderr = child.stderr.take().expect("stderr was piped");
    let stdout_thread = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let mut reader = BufReader::new(stdout);
        let _ = reader.read_to_end(&mut bytes);
        bytes
    });
    let mut stderr_reader = BufReader::new(stderr);
    let mut stderr_text = String::new();
    let mut line = String::new();
    loop {
        line.clear();
        let bytes_read = stderr_reader.read_line(&mut line)?;
        if bytes_read == 0 {
            break;
        }
        stderr_text.push_str(&line);
        let trimmed = line.trim();
        report_progress(OperationProgress {
            tool_id: request.tool_id.clone(),
            operation_id: request.operation_id.clone(),
            phase: "downloading".into(),
            progress: parse_download_percentage(trimmed),
            message: friendly_download_message(trimmed),
        });
    }
    let status = child.wait()?;
    let stdout = stdout_thread.join().unwrap_or_default();
    Ok(std::process::Output {
        status,
        stdout,
        stderr: stderr_text.into_bytes(),
    })
}

fn parse_download_percentage(line: &str) -> Option<f64> {
    line.split_whitespace().find_map(|token| {
        let value = token.strip_suffix('%')?.parse::<f64>().ok()?;
        Some((value / 100.0).clamp(0.0, 1.0))
    })
}

fn friendly_download_message(line: &str) -> String {
    let normalized = line.trim();
    if normalized.is_empty() {
        "Baixando mídia…".into()
    } else if normalized.contains("Extracting") || normalized.contains("[ExtractAudio]") {
        "Convertendo o áudio…".into()
    } else if normalized.contains("Destination:") {
        "Preparando arquivo de destino…".into()
    } else {
        normalized.to_string()
    }
}

fn validate_request(request: &OperationRequest) -> Result<(), String> {
    if request.input_paths.is_empty()
        && request.source_url.as_deref().unwrap_or("").is_empty()
        && !matches!(
            (request.tool_id.as_str(), request.operation_id.as_str()),
            ("deno", "runtime")
        )
    {
        return Err("Selecione um arquivo ou informe uma URL.".into());
    }
    for path in &request.input_paths {
        if path.trim().is_empty() || path.contains('\0') {
            return Err("O caminho de entrada é inválido.".into());
        }
        if !std::path::Path::new(path).exists() {
            return Err(format!(
                "Arquivo ou pasta de entrada não encontrado: {path}"
            ));
        }
    }
    if let Some(output_path) = &request.output_path {
        if output_path.trim().is_empty() || output_path.contains('\0') {
            return Err("O caminho de saída é inválido.".into());
        }
        let target = std::path::Path::new(output_path);
        let extracting = request.tool_id == "7zip" && request.operation_id == "extract";
        if operation_writes_file(request) && target.exists() && !extracting {
            return Err(
                "O destino já existe. Escolha outro nome para preservar o arquivo original.".into(),
            );
        }
        if extracting
            && target.exists()
            && (!target.is_dir()
                || std::fs::read_dir(target)
                    .map_err(|e| e.to_string())?
                    .next()
                    .is_some())
        {
            return Err("Escolha uma pasta vazia para extrair sem sobrescrever arquivos.".into());
        }
    }
    if let Some(source_url) = &request.source_url {
        let trimmed = source_url.trim();
        if request.tool_id != "yt-dlp"
            || !(trimmed.starts_with("https://") || trimmed.starts_with("http://"))
        {
            return Err("A URL de origem deve ser HTTP(S) e só é aceita pelo yt-dlp.".into());
        }
    }
    if request.tool_id == "libvips" && matches!(request.operation_id.as_str(), "resize" | "upscale")
    {
        let default_scale = if request.operation_id == "upscale" {
            "2"
        } else {
            "1"
        };
        let scale = request
            .options
            .get("scale")
            .map(String::as_str)
            .unwrap_or(default_scale)
            .parse::<f64>()
            .map_err(|_| "A escala deve ser um número.".to_string())?;
        if !scale.is_finite() || scale <= 0.0 || (request.operation_id == "upscale" && scale <= 1.0)
        {
            return Err(if request.operation_id == "upscale" {
                "O aumento precisa ser maior que 1×.".into()
            } else {
                "A escala precisa ser maior que zero.".into()
            });
        }
    }
    Ok(())
}

fn executable_name(tool_id: &str) -> Result<String, String> {
    let executable = match tool_id {
        "ffmpeg" => "ffmpeg.exe",
        "ffprobe" => "ffprobe.exe",
        "yt-dlp" => "yt-dlp.exe",
        "deno" => "deno.exe",
        "qpdf" => "qpdf.exe",
        "libvips" => "vips.exe",
        "jq" => "jq.exe",
        "yq" => "yq.exe",
        "ripgrep" => "rg.exe",
        "fd" => "fd.exe",
        "7zip" => "7z.exe",
        "pandoc" => "pandoc.exe",
        "exiftool" => "exiftool.exe",
        _ => return Err(format!("Ferramenta não cadastrada: {tool_id}")),
    };
    Ok(executable.into())
}

fn resolve_executable(executable: &str) -> Result<std::path::PathBuf, String> {
    let path_value = std::env::var_os("PATH").unwrap_or_default();
    for directory in std::env::split_paths(&path_value) {
        let candidate = directory.join(executable);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    for directory in known_tool_directories() {
        let candidate = directory.join(executable);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    if let Some(candidate) = search_winget_packages(executable) {
        return Ok(candidate);
    }
    Err(format!(
        "{executable} não foi encontrado neste Windows. O download integrado ainda não está disponível."
    ))
}

fn known_tool_directories() -> Vec<std::path::PathBuf> {
    let mut directories = Vec::new();
    if let Some(program_files) = std::env::var_os("ProgramFiles") {
        directories.push(std::path::PathBuf::from(&program_files).join("7-Zip"));
        if let Ok(entries) = std::fs::read_dir(&program_files) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
                if name.starts_with("qpdf") || name.starts_with("libvips") {
                    directories.push(entry.path().join("bin"));
                }
            }
        }
    }
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        directories.push(std::path::PathBuf::from(&local_app_data).join("Pandoc"));
        directories.push(
            std::path::PathBuf::from(&local_app_data)
                .join("Programs")
                .join("ExifTool"),
        );
    }
    directories
}

fn search_winget_packages(executable: &str) -> Option<std::path::PathBuf> {
    let root = std::env::var_os("LOCALAPPDATA")
        .map(std::path::PathBuf::from)?
        .join("Microsoft")
        .join("WinGet")
        .join("Packages");
    let mut pending = vec![(root, 0_u8)];
    while let Some((directory, depth)) = pending.pop() {
        let Ok(entries) = std::fs::read_dir(directory) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file()
                && path
                    .file_name()
                    .map(|name| name.to_string_lossy().eq_ignore_ascii_case(executable))
                    .unwrap_or(false)
            {
                return Some(path);
            }
            if depth < 4 && path.is_dir() {
                pending.push((path, depth + 1));
            }
        }
    }
    None
}

fn resolve_args(request: &OperationRequest) -> Result<Vec<String>, String> {
    let input = request.input_paths.first().cloned().unwrap_or_default();
    let output = request
        .output_path
        .clone()
        .unwrap_or_else(|| default_output_path(request));
    let option = |key: &str, fallback: &str| {
        request
            .options
            .get(key)
            .map(String::as_str)
            .unwrap_or(fallback)
            .to_string()
    };

    match (request.tool_id.as_str(), request.operation_id.as_str()) {
        ("ffmpeg", "convert") => Ok(vec![
            "-n".into(),
            "-nostdin".into(),
            "-i".into(),
            input,
            output,
        ]),
        ("ffmpeg", "extract-audio") => Ok(vec![
            "-n".into(),
            "-nostdin".into(),
            "-i".into(),
            input,
            "-map".into(),
            "0:a:0".into(),
            "-vn".into(),
            output,
        ]),
        ("ffmpeg", "compress") => Ok(vec![
            "-n".into(),
            "-nostdin".into(),
            "-i".into(),
            input,
            "-c:v".into(),
            "libx264".into(),
            "-crf".into(),
            option("crf", "23"),
            "-preset".into(),
            option("preset", "medium"),
            output,
        ]),
        ("ffmpeg", "trim") => Ok(vec![
            "-n".into(),
            "-nostdin".into(),
            "-ss".into(),
            option("start", "0"),
            "-to".into(),
            option("end", "10"),
            "-i".into(),
            input,
            "-c".into(),
            "copy".into(),
            output,
        ]),
        ("ffprobe", "inspect") => Ok(vec![
            "-v".into(),
            "quiet".into(),
            "-print_format".into(),
            "json".into(),
            "-show_format".into(),
            "-show_streams".into(),
            input,
        ]),
        ("qpdf", "merge") => {
            let mut args = vec!["--empty".into(), "--pages".into()];
            args.extend(request.input_paths.clone());
            args.extend(["--".into(), output]);
            Ok(args)
        }
        ("qpdf", "split") => Ok(vec![
            input,
            "--pages".into(),
            ".".into(),
            option("pages", "1-z"),
            "--".into(),
            output,
        ]),
        ("qpdf", "rotate") => Ok(vec![
            input,
            format!("--rotate={}:1-z", option("degrees", "90")),
            output,
        ]),
        ("qpdf", "protect") => {
            let password = option("password", "");
            Ok(vec![
                input,
                "--encrypt".into(),
                password.clone(),
                password,
                "256".into(),
                "--".into(),
                output,
            ])
        }
        ("qpdf", "linearize") => Ok(vec!["--linearize".into(), input, output]),
        ("yt-dlp", "download-video") => Ok(vec![
            "--no-playlist".into(),
            "--no-overwrites".into(),
            "--extractor-args".into(),
            "youtube:player_client=web_embedded".into(),
            "--progress".into(),
            "--newline".into(),
            "--recode-video".into(),
            "mp4".into(),
            "-o".into(),
            output,
            request.source_url.clone().unwrap_or(input),
        ]),
        ("yt-dlp", "download-audio") => Ok(vec![
            "--no-playlist".into(),
            "--no-overwrites".into(),
            "--extractor-args".into(),
            "youtube:player_client=web_embedded".into(),
            "--progress".into(),
            "--newline".into(),
            "-x".into(),
            "--audio-format".into(),
            "mp3".into(),
            "-o".into(),
            output,
            request.source_url.clone().unwrap_or(input),
        ]),
        ("yt-dlp", "inspect-url") => Ok(vec![
            "--dump-single-json".into(),
            "--skip-download".into(),
            request.source_url.clone().unwrap_or(input),
        ]),
        ("deno", "runtime") => Ok(vec!["--version".into()]),
        ("jq", "format") => Ok(vec![".".into(), input]),
        ("jq", "query") => Ok(vec![option("query", "."), input]),
        ("yq", "format") => Ok(vec![".".into(), input]),
        ("yq", "query") => Ok(vec![option("query", "."), input]),
        ("ripgrep", "search") => Ok(vec![
            "--line-number".into(),
            "--color=never".into(),
            "--".into(),
            option("query", ""),
            input,
        ]),
        ("fd", "find") => Ok(vec![
            "--color=never".into(),
            "--".into(),
            option("query", ""),
            input,
        ]),
        ("7zip", "compress") => {
            let mut args = vec!["a".into(), output];
            args.extend(request.input_paths.clone());
            Ok(args)
        }
        ("7zip", "extract") => Ok(vec![
            "x".into(),
            "-aos".into(),
            input,
            format!("-o{output}"),
        ]),
        ("pandoc", "convert") => Ok(vec![input, "-o".into(), output]),
        ("libvips", "resize") | ("libvips", "upscale") => Ok(vec![
            "resize".into(),
            input,
            output,
            option(
                "scale",
                if request.operation_id == "upscale" {
                    "2"
                } else {
                    "1"
                },
            ),
            "--kernel".into(),
            "lanczos3".into(),
        ]),
        ("libvips", "crop") => Ok(vec![
            "crop".into(),
            input,
            output,
            option("left", "0"),
            option("top", "0"),
            option("width", "100"),
            option("height", "100"),
        ]),
        ("libvips", "compress") => Ok(vec![
            "copy".into(),
            input,
            format!("{}[Q={}]", output, option("quality", "80")),
        ]),
        ("libvips", "convert") => Ok(vec!["copy".into(), input, output]),
        _ => Err(format!(
            "Operação não suportada: {}/{}",
            request.tool_id, request.operation_id
        )),
    }
}

fn operation_writes_file(request: &OperationRequest) -> bool {
    !matches!(
        (request.tool_id.as_str(), request.operation_id.as_str()),
        ("ffprobe", "inspect")
            | ("yt-dlp", "inspect-url")
            | ("jq", _)
            | ("yq", _)
            | ("ripgrep", "search")
            | ("fd", "find")
            | ("deno", "runtime")
    )
}

fn default_output_path(request: &OperationRequest) -> String {
    if request.tool_id == "yt-dlp" {
        if let Some(downloads) = std::env::var_os("USERPROFILE") {
            return std::path::PathBuf::from(downloads)
                .join("Downloads")
                .join("%(title)s.%(ext)s")
                .to_string_lossy()
                .into_owned();
        }
        return "%(title)s.%(ext)s".into();
    }
    let Some(input) = request.input_paths.first() else {
        return String::new();
    };
    let path = std::path::Path::new(input);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("resultado");
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("out");
    path.with_file_name(format!("{stem}-{}.{}", request.operation_id, extension))
        .to_string_lossy()
        .into_owned()
}

fn compact_error(stderr: &str) -> String {
    stderr
        .lines()
        .filter(|line| !line.trim().is_empty())
        .take(3)
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod runtime_smoke;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_ffmpeg_audio_plan_without_shell_interpolation() {
        let request = OperationRequest {
            tool_id: "ffmpeg".into(),
            operation_id: "extract-audio".into(),
            input_paths: vec!["clip.mp4".into()],
            output_path: Some("clip.mp3".into()),
            options: std::collections::HashMap::new(),
            source_url: None,
        };
        assert_eq!(
            resolve_args(&request).unwrap(),
            vec!["-n", "-nostdin", "-i", "clip.mp4", "-map", "0:a:0", "-vn", "clip.mp3"]
        );
    }

    #[test]
    fn parses_yt_dlp_progress_lines_for_visual_feedback() {
        assert_eq!(
            parse_download_percentage("[download]  37.5% of 10.00MiB"),
            Some(0.375)
        );
        assert_eq!(
            parse_download_percentage("[ExtractAudio] Destination: audio.mp3"),
            None
        );
        assert_eq!(
            friendly_download_message("[ExtractAudio] Destination: audio.mp3"),
            "Convertendo o áudio…"
        );
    }

    #[test]
    fn uses_explicit_progress_and_lanczos_arguments() {
        let download = OperationRequest {
            tool_id: "yt-dlp".into(),
            operation_id: "download-video".into(),
            input_paths: Vec::new(),
            output_path: Some("video.mp4".into()),
            options: std::collections::HashMap::new(),
            source_url: Some("https://example.com/video".into()),
        };
        let args = resolve_args(&download).unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--progress", "--newline"]));
        assert!(args.windows(2).any(|pair| {
            pair == ["--extractor-args", "youtube:player_client=web_embedded"]
        }));

        let upscale = OperationRequest {
            tool_id: "libvips".into(),
            operation_id: "upscale".into(),
            input_paths: vec!["image.png".into()],
            output_path: Some("image-upscale.png".into()),
            options: std::collections::HashMap::new(),
            source_url: None,
        };
        let args = resolve_args(&upscale).unwrap();
        assert!(args.windows(2).any(|pair| pair == ["--kernel", "lanczos3"]));
        assert!(args.contains(&"2".into()));
    }

    #[test]
    fn rejects_an_upscale_factor_that_cannot_increase_resolution() {
        let request = OperationRequest {
            tool_id: "libvips".into(),
            operation_id: "upscale".into(),
            input_paths: vec![std::env::temp_dir().to_string_lossy().into_owned()],
            output_path: Some(
                std::env::temp_dir()
                    .join("workbench-invalid-upscale.png")
                    .to_string_lossy()
                    .into_owned(),
            ),
            options: [("scale".into(), "1".into())].into_iter().collect(),
            source_url: None,
        };
        assert!(validate_request(&request)
            .unwrap_err()
            .contains("maior que 1"));
    }

    #[test]
    fn rejects_unknown_tools_before_process_start() {
        assert!(executable_name("powershell").is_err());
    }

    #[test]
    fn detects_available_tools_without_starting_a_process() {
        let available = detect_available_tools();
        assert!(available.iter().all(|tool_id| !tool_id.is_empty()));
    }

    #[test]
    fn resolves_every_catalog_operation_to_a_typed_argv() {
        let cases = [
            ("ffmpeg", "convert"),
            ("ffmpeg", "extract-audio"),
            ("ffmpeg", "compress"),
            ("ffmpeg", "trim"),
            ("ffprobe", "inspect"),
            ("qpdf", "merge"),
            ("qpdf", "split"),
            ("qpdf", "rotate"),
            ("qpdf", "protect"),
            ("qpdf", "linearize"),
            ("yt-dlp", "download-video"),
            ("yt-dlp", "download-audio"),
            ("yt-dlp", "inspect-url"),
            ("deno", "runtime"),
            ("jq", "format"),
            ("jq", "query"),
            ("yq", "format"),
            ("yq", "query"),
            ("ripgrep", "search"),
            ("fd", "find"),
            ("7zip", "compress"),
            ("7zip", "extract"),
            ("pandoc", "convert"),
            ("libvips", "resize"),
            ("libvips", "upscale"),
            ("libvips", "crop"),
            ("libvips", "compress"),
            ("libvips", "convert"),
        ];

        for (tool_id, operation_id) in cases {
            let request = OperationRequest {
                tool_id: tool_id.into(),
                operation_id: operation_id.into(),
                input_paths: vec!["input.fixture".into(), "second.fixture".into()],
                output_path: Some("output.fixture".into()),
                options: std::collections::HashMap::new(),
                source_url: Some("https://example.com/media".into()),
            };
            assert!(
                !resolve_args(&request).unwrap().is_empty(),
                "{tool_id}/{operation_id}"
            );
        }
    }

    #[test]
    fn keeps_all_inputs_in_archive_plan() {
        let request = OperationRequest {
            tool_id: "7zip".into(),
            operation_id: "compress".into(),
            input_paths: vec!["one.txt".into(), "two.txt".into()],
            output_path: Some("archive.7z".into()),
            options: std::collections::HashMap::new(),
            source_url: None,
        };
        assert_eq!(
            resolve_args(&request).unwrap(),
            vec!["a", "archive.7z", "one.txt", "two.txt"]
        );
    }

    #[test]
    fn rejects_missing_inputs_and_non_http_source_urls() {
        let missing = OperationRequest {
            tool_id: "jq".into(),
            operation_id: "format".into(),
            input_paths: vec!["missing.json".into()],
            output_path: None,
            options: std::collections::HashMap::new(),
            source_url: None,
        };
        assert!(validate_request(&missing).is_err());

        let invalid_url = OperationRequest {
            tool_id: "yt-dlp".into(),
            operation_id: "inspect-url".into(),
            input_paths: Vec::new(),
            output_path: None,
            options: std::collections::HashMap::new(),
            source_url: Some("file:///secret".into()),
        };
        assert!(validate_request(&invalid_url).is_err());

        let runtime = OperationRequest {
            tool_id: "deno".into(),
            operation_id: "runtime".into(),
            input_paths: Vec::new(),
            output_path: None,
            options: std::collections::HashMap::new(),
            source_url: None,
        };
        assert!(validate_request(&runtime).is_ok());
        assert!(!operation_writes_file(&runtime));
    }
}
