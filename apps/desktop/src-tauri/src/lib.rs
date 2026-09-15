mod components;

use std::io::{BufRead, BufReader, Read};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            execute_operation,
            detect_available_tools,
            install_component,
            allow_preview
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
    /// Correlates every progress event with the queue entry the UI already created.
    #[serde(default)]
    job_id: Option<String>,
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
    job_id: Option<String>,
    tool_id: String,
    operation_id: String,
    phase: String,
    progress: Option<f64>,
    message: String,
}

/// Grants the WebView read access to exactly one file, so it can be previewed.
///
/// The asset protocol ships with an empty scope: granting it per file, at the
/// moment the user picks that file, keeps the window from being able to read
/// anything else. A blanket scope would hand it every file the account can
/// open in order to show the handful it actually displays.
#[tauri::command]
fn allow_preview(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let target = std::path::Path::new(&path);
    if !target.is_file() {
        return Err("That file no longer exists.".into());
    }
    app.asset_protocol_scope()
        .allow_file(target)
        .map_err(|error| format!("Could not open that file for preview: {error}"))
}

#[tauri::command]
fn detect_available_tools() -> Vec<String> {
    [
        "ffmpeg",
        "ffprobe",
        "yt-dlp",
        "gallery-dl",
        "tesseract",
        "deno",
        "qpdf",
        "libvips",
        "jq",
        "yq",
        "ripgrep",
        "fd",
        "7zip",
        "pandoc",
        "exiftool",
        "poppler",
        "oxipng",
        "mkvtoolnix",
        "imagemagick",
        "miller",
        "hexyl",
        "tokei",
        "difftastic",
        "dust",
    ]
    .into_iter()
    .filter(|tool_id| {
        if components::installed_binary_directory(tool_id).is_some() {
            return true;
        }
        executable_name(tool_id)
            .and_then(|name| resolve_executable(&name))
            .is_ok()
    })
    .map(str::to_string)
    .collect()
}

/// Downloads and activates a component and everything it depends on. Progress is
/// reported per tool so the card that was clicked can show what is happening.
#[tauri::command]
async fn install_component(app: tauri::AppHandle, tool_id: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let plan = components::installation_plan(&tool_id)?;
        let mut installed = Vec::new();
        for entry in plan {
            if components::is_installed(&entry.id) {
                continue;
            }
            components::install(&entry.id, &|progress| {
                let _ = app.emit("component-progress", progress);
            })?;
            installed.push(entry.id.clone());
        }
        Ok(installed)
    })
    .await
    .map_err(|error| format!("The installation was interrupted: {error}"))?
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
    .map_err(|error| format!("The job was interrupted: {error}"))?
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
    let executable = operation_executable(&request)?;
    let executable_path = resolve_suite_executable(&request.tool_id, &executable)?;
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
        "Download finished.".into()
    } else if request.tool_id == "libvips" && request.operation_id == "upscale" {
        format!(
            "Image enlarged {}× with Lanczos3.",
            request
                .options
                .get("scale")
                .map(String::as_str)
                .unwrap_or("2")
        )
    } else {
        "Operation finished.".into()
    };
    report_progress(OperationProgress {
        job_id: request.job_id.clone(),
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
            .map_err(|error| format!("Could not start {executable}: {error}"))?
    } else {
        command
            .output()
            .map_err(|error| format!("Could not start {executable}: {error}"))?
    };

    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
    let no_matches = request.tool_id == "ripgrep" && output.status.code() == Some(1);
    if !output.status.success() && !no_matches {
        report_progress(OperationProgress {
            job_id: request.job_id.clone(),
            tool_id: request.tool_id.clone(),
            operation_id: request.operation_id.clone(),
            phase: "error".into(),
            progress: None,
            message: compact_error(if stderr.is_empty() { &stdout } else { &stderr }),
        });
        let detail = compact_error(if stderr.is_empty() { &stdout } else { &stderr });
        return Err(format!(
            "{executable} failed ({}): {}{}",
            output.status,
            detail,
            explain_known_failure(&detail)
        ));
    }

    report_progress(OperationProgress {
        job_id: request.job_id.clone(),
        tool_id: request.tool_id.clone(),
        operation_id: request.operation_id.clone(),
        phase: "completed".into(),
        progress: Some(1.0),
        message: completion_message.clone(),
    });

    Ok(OperationResult {
        executable,
        stdout: if no_matches {
            "No match found.".into()
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
    // yt-dlp reports progress on stdout, so that is the stream parsed line by line.
    // stderr only carries warnings and the failure reason; it is drained on a thread
    // so a full pipe can never block the child.
    let stderr_thread = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let mut reader = BufReader::new(stderr);
        let _ = reader.read_to_end(&mut bytes);
        bytes
    });
    let mut stdout_reader = BufReader::new(stdout);
    let mut stdout_text = String::new();
    let mut line = String::new();
    loop {
        line.clear();
        let bytes_read = stdout_reader.read_line(&mut line)?;
        if bytes_read == 0 {
            break;
        }
        stdout_text.push_str(&line);
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        report_progress(OperationProgress {
            job_id: request.job_id.clone(),
            tool_id: request.tool_id.clone(),
            operation_id: request.operation_id.clone(),
            phase: "downloading".into(),
            progress: parse_download_percentage(trimmed),
            message: friendly_download_message(trimmed),
        });
    }
    let status = child.wait()?;
    let stderr_bytes = stderr_thread.join().unwrap_or_default();
    Ok(std::process::Output {
        status,
        stdout: stdout_text.into_bytes(),
        stderr: stderr_bytes,
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
        "Downloading media…".into()
    } else if normalized.contains("Extracting") || normalized.contains("[ExtractAudio]") {
        "Converting the audio…".into()
    } else if normalized.contains("[Merger]") {
        "Merging video and audio…".into()
    } else if normalized.contains("[VideoRemuxer]") || normalized.contains("[VideoConvertor]") {
        "Adjusting the container…".into()
    } else if normalized.contains("Destination:") {
        "Preparing the destination file…".into()
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
        return Err("Select a file or provide a URL.".into());
    }
    for path in &request.input_paths {
        if path.trim().is_empty() || path.contains('\0') {
            return Err("That input path is not valid.".into());
        }
        if !std::path::Path::new(path).exists() {
            return Err(format!("Input file or folder not found: {path}"));
        }
    }
    if request.tool_id == "difftastic" && request.input_paths.len() < 2 {
        return Err("Choose both files that should be compared.".into());
    }
    if let Some(output_path) = &request.output_path {
        if output_path.trim().is_empty() || output_path.contains('\0') {
            return Err("That output path is not valid.".into());
        }
        let target = std::path::Path::new(output_path);
        // Some operations produce a set of files, so their destination is an
        // existing folder rather than a name that must not be taken yet.
        let into_directory = matches!(
            (request.tool_id.as_str(), request.operation_id.as_str()),
            ("7zip", "extract") | ("gallery-dl", "download-gallery")
        );
        if operation_writes_file(request) && target.exists() && !into_directory {
            return Err(
                "That destination already exists. Choose another name so the original survives."
                    .into(),
            );
        }
        if into_directory && target.exists() && !target.is_dir() {
            return Err("That destination is a file. Choose a folder instead.".into());
        }
        // Extracting would overwrite whatever shares a name, so it demands an
        // empty folder. gallery-dl skips what it has already downloaded, which
        // is the point of pointing it at the same folder twice.
        if request.tool_id == "7zip"
            && request.operation_id == "extract"
            && target.exists()
            && std::fs::read_dir(target)
                .map_err(|e| e.to_string())?
                .next()
                .is_some()
        {
            return Err("Choose an empty folder so extracting overwrites nothing.".into());
        }
    }
    if let Some(source_url) = &request.source_url {
        let trimmed = source_url.trim();
        if !URL_TOOLS.contains(&request.tool_id.as_str())
            || !(trimmed.starts_with("https://") || trimmed.starts_with("http://"))
        {
            return Err(format!(
                "The source URL must be HTTP(S), and only {} accept one.",
                URL_TOOLS.join(" and ")
            ));
        }
    }
    validate_options(request)?;
    Ok(())
}

/// Pure option checks: no filesystem, no process, so they are testable on their own.
fn validate_options(request: &OperationRequest) -> Result<(), String> {
    if URL_TOOLS.contains(&request.tool_id.as_str()) {
        let browser = request
            .options
            .get("cookiesFrom")
            .map(|value| value.trim())
            .unwrap_or("");
        let file = request
            .options
            .get("cookieFile")
            .map(|value| value.trim())
            .unwrap_or("");

        if !browser.is_empty() && !file.is_empty() {
            return Err("Choose one sign-in method: a browser or a cookie file, not both.".into());
        }
        if !browser.is_empty() && !COOKIE_BROWSERS.contains(&browser) {
            return Err(format!(
                "yt-dlp cannot read cookies from \"{browser}\". Supported: {}.",
                COOKIE_BROWSERS.join(", ")
            ));
        }
        if !file.is_empty() && !std::path::Path::new(file).is_file() {
            return Err("That cookie file does not exist.".into());
        }
        // Only yt-dlp picks a format; gallery-dl takes what the site serves.
        if request.tool_id == "yt-dlp" {
            let quality = request
                .options
                .get("quality")
                .map(|value| value.trim())
                .unwrap_or("compatible");
            if !matches!(quality, "compatible" | "best") {
                return Err("Quality must be either \"compatible\" or \"best\".".into());
            }
        }
    }
    if request.tool_id == "exiftool"
        && request.operation_id == "set-title"
        && request
            .options
            .get("title")
            .map(|title| title.trim().is_empty())
            .unwrap_or(true)
    {
        return Err("Type the title that should be written into the file.".into());
    }
    if request.tool_id == "poppler" && request.operation_id == "rasterize" {
        let dpi = request
            .options
            .get("dpi")
            .map(String::as_str)
            .unwrap_or("150")
            .parse::<f64>()
            .map_err(|_| "The resolution must be a number.".to_string())?;
        if !dpi.is_finite() || dpi <= 0.0 || dpi > 2400.0 {
            return Err("The resolution must be between 1 and 2400 DPI.".into());
        }
        let page = request
            .options
            .get("page")
            .map(String::as_str)
            .unwrap_or("1")
            .parse::<u32>()
            .map_err(|_| "The page must be a whole number.".to_string())?;
        if page == 0 {
            return Err("Page numbering starts at 1.".into());
        }
    }
    if request.tool_id == "oxipng" && request.operation_id == "optimize" {
        let level = request
            .options
            .get("level")
            .map(String::as_str)
            .unwrap_or("2");
        let accepted = level == "max" || matches!(level.parse::<u8>(), Ok(0..=6));
        if !accepted {
            return Err("The optimisation level runs from 0 to 6, or \"max\".".into());
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
            .map_err(|_| "The scale must be a number.".to_string())?;
        if !scale.is_finite() || scale <= 0.0 || (request.operation_id == "upscale" && scale <= 1.0)
        {
            return Err(if request.operation_id == "upscale" {
                "An upscale has to be larger than 1×.".into()
            } else {
                "The scale has to be greater than zero.".into()
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
        "tesseract" => "tesseract.exe",
        "gallery-dl" => "gallery-dl.exe",
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
        "poppler" => "pdftoppm.exe",
        "oxipng" => "oxipng.exe",
        "mkvtoolnix" => "mkvmerge.exe",
        "imagemagick" => "magick.exe",
        "miller" => "mlr.exe",
        "hexyl" => "hexyl.exe",
        "tokei" => "tokei.exe",
        "difftastic" => "difft.exe",
        "dust" => "dust.exe",
        _ => return Err(format!("Unregistered tool: {tool_id}")),
    };
    Ok(executable.into())
}

/// Poppler ships several binaries in one directory, and other projects publish
/// executables with the same file names — Xpdf, bundled with Git for Windows, also has a
/// `pdftotext.exe`, and it usually comes first on PATH. Resolving every Poppler command
/// next to the binary that identified the installation keeps the two from being mixed.
fn resolve_suite_executable(tool_id: &str, executable: &str) -> Result<std::path::PathBuf, String> {
    if let Some(installed) = components::installed_binary_directory(tool_id) {
        let candidate = installed.join(executable);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
    if tool_id != "poppler" {
        return resolve_executable(executable);
    }
    let probe = resolve_executable("pdftoppm.exe")?;
    let sibling = probe.with_file_name(executable);
    if sibling.is_file() {
        return Ok(sibling);
    }
    Err(format!(
        "{executable} was not found beside Poppler in {}.",
        probe
            .parent()
            .map(|parent| parent.display().to_string())
            .unwrap_or_default()
    ))
}

fn operation_executable(request: &OperationRequest) -> Result<String, String> {
    let executable = match (request.tool_id.as_str(), request.operation_id.as_str()) {
        ("poppler", "extract-text") => "pdftotext.exe",
        ("poppler", "rasterize") => "pdftoppm.exe",
        ("mkvtoolnix", "remux") | ("mkvtoolnix", "inspect") => "mkvmerge.exe",
        _ => return executable_name(&request.tool_id),
    };
    Ok(executable.into())
}

/// Tools shipped inside the installer live next to the executable. They are checked
/// before PATH so the version we pinned, verified and tested is the one that runs —
/// whatever the machine happens to have installed elsewhere.
fn bundled_tool_directory() -> Option<std::path::PathBuf> {
    Some(std::env::current_exe().ok()?.parent()?.join("tools"))
}

fn resolve_executable(executable: &str) -> Result<std::path::PathBuf, String> {
    if let Some(bundled) = bundled_tool_directory() {
        let candidate = bundled.join(executable);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }
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
        "{executable} is not available yet. It does not ship in the installer, and the in-app download for this component is not implemented."
    ))
}

fn known_tool_directories() -> Vec<std::path::PathBuf> {
    let mut directories = Vec::new();
    if let Some(program_files) = std::env::var_os("ProgramFiles") {
        directories.push(std::path::PathBuf::from(&program_files).join("7-Zip"));
        directories.push(std::path::PathBuf::from(&program_files).join("MKVToolNix"));
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

/// Browsers yt-dlp can read cookies from. A fixed list, so a value typed in
/// the interface never reaches the command line unchecked.
const COOKIE_BROWSERS: [&str; 7] = [
    "firefox", "chrome", "chromium", "edge", "brave", "opera", "vivaldi",
];

/// Turns an upstream error that people cannot act on into one they can.
///
/// Chromium bound its cookie key to the browser process in Chrome 127, so
/// `--cookies-from-browser` fails for Chrome, Edge and their relatives on
/// Windows no matter the permissions. The message yt-dlp prints names DPAPI
/// and a bug number, neither of which tells anyone what to do instead.
fn explain_known_failure(detail: &str) -> String {
    let lowered = detail.to_ascii_lowercase();
    if lowered.contains("failed to decrypt with dpapi")
        || lowered.contains("could not copy chrome cookie database")
    {
        return "

Chrome, Edge and other Chromium browsers encrypt their cookies with a key tied to the browser process, so no other program can read them on Windows. Two ways round it: pick Firefox, which does not do this, or export a cookie file from the browser you are signed in to and choose \"Cookie file\" instead. Export it from a private window and close that window straight away, because YouTube rotates the cookies of any tab left open."
            .to_string();
    }
    String::new()
}

/// Never overwrite, never wait on stdin, then the input.
fn ffmpeg_base(input: &str) -> Vec<String> {
    vec![
        "-n".to_string(),
        "-nostdin".to_string(),
        "-i".to_string(),
        input.to_string(),
    ]
}

/// Video encoding for the build ToolHaven actually ships.
///
/// That build is BtbN's **LGPL** FFmpeg, which carries no libx264 and no
/// libx265 — both are GPL. It does carry Cisco's `libopenh264`, so real H.264
/// is available; it simply takes a bitrate rather than x264's CRF, which is a
/// different quality scale and not interchangeable. AV1 through `libsvtav1`
/// does take CRF, and compresses far better at the cost of encoding time and
/// of players old enough not to know it.
fn ffmpeg_video_encoder(codec: &str, quality: &str) -> Vec<String> {
    match codec {
        // Remux: keep the streams, change only the container.
        "copy" => vec!["-c".into(), "copy".into()],
        "av1" => {
            let crf = match quality {
                "high" => "28",
                "small" => "45",
                _ => "35",
            };
            vec![
                "-c:v".into(),
                "libsvtav1".into(),
                "-crf".into(),
                crf.into(),
                "-preset".into(),
                "8".into(),
                "-c:a".into(),
                "libopus".into(),
            ]
        }
        // Bitrate is coarse next to CRF because it ignores resolution, but
        // libopenh264 offers no scale-free quality target.
        _ => {
            let bitrate = match quality {
                "high" => "4M",
                "small" => "1M",
                _ => "2M",
            };
            vec![
                "-c:v".into(),
                "libopenh264".into(),
                "-b:v".into(),
                bitrate.into(),
                "-c:a".into(),
                "aac".into(),
            ]
        }
    }
}

/// A filter that re-encodes video while the audio is carried through untouched.
fn ffmpeg_filter_args(filter: String, codec: &str, quality: &str) -> Vec<String> {
    let mut args = vec!["-vf".to_string(), filter];
    if codec == "copy" {
        // A filter has to decode and re-encode; "copy" cannot apply one.
        args.extend(ffmpeg_video_encoder("h264", quality));
    } else {
        args.extend(ffmpeg_video_encoder(codec, quality));
    }
    args
}

/// Tools driven by a URL instead of input files.
const URL_TOOLS: [&str; 2] = ["yt-dlp", "gallery-dl"];

/// Cookie flags. yt-dlp and gallery-dl spell them identically, so one builder
/// serves both. Empty when no credentials were chosen.
fn cookie_args(request: &OperationRequest) -> Vec<String> {
    let browser = request
        .options
        .get("cookiesFrom")
        .map(|value| value.trim())
        .unwrap_or("");
    if !browser.is_empty() {
        return vec!["--cookies-from-browser".into(), browser.to_string()];
    }

    let file = request
        .options
        .get("cookieFile")
        .map(|value| value.trim())
        .unwrap_or("");
    if !file.is_empty() {
        return vec!["--cookies".into(), file.to_string()];
    }

    Vec::new()
}

/// Authentication, plus the client selection that depends on it.
///
/// `player_client=web_embedded` is a workaround for the 403 an anonymous
/// request gets, and it is dropped once cookies are supplied. yt-dlp already
/// picks cookie-aware clients on its own — `web_embedded, tv_downgraded, web`
/// for a free account and `web_creator, tv_downgraded, web` for Premium — so
/// forcing the embedded client would deny a Premium account the `web_creator`
/// client its higher-quality formats come from.
fn yt_dlp_session_args(request: &OperationRequest) -> Vec<String> {
    let cookies = cookie_args(request);
    if !cookies.is_empty() {
        return cookies;
    }
    vec![
        "--extractor-args".into(),
        "youtube:player_client=web_embedded".into(),
    ]
}

/// `compatible` keeps the H.264/AAC pair every player opens. `best` lifts that
/// restriction, which is what actually reaches 4K and beyond: YouTube publishes
/// nothing above 1080p in mp4, so the compatible chain caps resolution by
/// construction. Merging into Matroska because it holds VP9 and AV1, which mp4
/// does not.
fn yt_dlp_format_args(quality: &str) -> Vec<String> {
    if quality == "best" {
        vec![
            "-f".into(),
            "bv*+ba/b".into(),
            "--merge-output-format".into(),
            "mkv".into(),
        ]
    } else {
        vec![
            "-f".into(),
            "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b".into(),
            "--merge-output-format".into(),
            "mp4".into(),
        ]
    }
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
        ("ffmpeg", "convert") => {
            let mut args = ffmpeg_base(&input);
            args.extend(ffmpeg_video_encoder(
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "extract-audio") => {
            let mut args = ffmpeg_base(&input);
            args.extend(["-map".to_string(), "0:a:0".to_string(), "-vn".to_string()]);
            // The destination extension already names the format; naming the
            // encoder only matters where the default would cost quality.
            if option("format", "mp3") == "mp3" {
                args.extend([
                    "-c:a".to_string(),
                    "libmp3lame".to_string(),
                    "-q:a".to_string(),
                    "2".to_string(),
                ]);
            }
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "compress") => {
            let mut args = ffmpeg_base(&input);
            args.extend(ffmpeg_video_encoder(
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.push(output);
            Ok(args)
        }
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
        ("ffmpeg", "resize") => {
            let mut args = ffmpeg_base(&input);
            // -2 preserves the aspect ratio and lands on an even number, which
            // every H.264 profile requires.
            args.extend(ffmpeg_filter_args(
                format!("scale={}:-2", option("width", "1280")),
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.extend(["-c:a".to_string(), "copy".to_string()]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "crop") => {
            let mut args = ffmpeg_base(&input);
            args.extend(ffmpeg_filter_args(
                format!(
                    "crop={}:{}:{}:{}",
                    option("width", "640"),
                    option("height", "480"),
                    option("left", "0"),
                    option("top", "0")
                ),
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.extend(["-c:a".to_string(), "copy".to_string()]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "rotate") => {
            // transpose only turns by quarters, so 180 is two of them.
            let filter = match option("degrees", "90").as_str() {
                "180" => "transpose=1,transpose=1".to_string(),
                "270" => "transpose=2".to_string(),
                _ => "transpose=1".to_string(),
            };
            let mut args = ffmpeg_base(&input);
            args.extend(ffmpeg_filter_args(
                filter,
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.extend(["-c:a".to_string(), "copy".to_string()]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "change-speed") => {
            let factor = option("factor", "2").parse::<f64>().unwrap_or(2.0);
            let mut args = ffmpeg_base(&input);
            args.extend(ffmpeg_filter_args(
                format!("setpts={:.4}*PTS", 1.0 / factor),
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.extend(["-af".to_string(), format!("atempo={factor:.4}")]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "fps") => {
            let mut args = ffmpeg_base(&input);
            args.extend(["-r".to_string(), option("rate", "30")]);
            args.extend(ffmpeg_video_encoder(
                &option("codec", "h264"),
                &option("quality", "balanced"),
            ));
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "to-gif") => {
            // Deriving a palette from the clip and applying it in the same
            // filter graph, because the default 256-colour quantisation
            // produces a dithered mess on real footage.
            let mut args = ffmpeg_base(&input);
            args.extend([
                "-vf".to_string(),
                format!(
                    "fps={},scale={}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
                    option("rate", "12"),
                    option("width", "480")
                ),
            ]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "thumbnail") => {
            let mut args = vec!["-n".to_string(), "-nostdin".to_string()];
            // Seeking before -i jumps by keyframe: fast, and accurate enough
            // for a still.
            args.extend(["-ss".to_string(), option("at", "1")]);
            args.extend(["-i".to_string(), input]);
            args.extend(["-frames:v".to_string(), "1".to_string()]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "contact-sheet") => {
            let mut args = ffmpeg_base(&input);
            args.extend([
                "-vf".to_string(),
                format!(
                    r"select=not(mod(n\,{})),scale={}:-1,tile={}x{}",
                    option("every", "48"),
                    option("width", "240"),
                    option("columns", "3"),
                    option("rows", "3")
                ),
                "-frames:v".to_string(),
                "1".to_string(),
            ]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "remove-audio") => {
            let mut args = ffmpeg_base(&input);
            args.extend(["-c".to_string(), "copy".to_string(), "-an".to_string()]);
            args.push(output);
            Ok(args)
        }
        ("ffmpeg", "normalize-audio") => {
            let mut args = ffmpeg_base(&input);
            // EBU R128 at broadcast defaults, leaving the video untouched.
            args.extend([
                "-af".to_string(),
                "loudnorm=I=-16:TP=-1.5:LRA=11".to_string(),
                "-c:v".to_string(),
                "copy".to_string(),
            ]);
            args.push(output);
            Ok(args)
        }
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
        ("yt-dlp", "download-video") => {
            let mut args: Vec<String> = vec!["--no-playlist".into(), "--no-overwrites".into()];
            args.extend(yt_dlp_session_args(request));
            args.extend(["--progress".to_string(), "--newline".to_string()]);
            args.extend(yt_dlp_format_args(&option("quality", "compatible")));
            args.extend([
                "-o".to_string(),
                output,
                request.source_url.clone().unwrap_or(input),
            ]);
            Ok(args)
        }
        ("yt-dlp", "download-audio") => {
            let mut args: Vec<String> = vec!["--no-playlist".into(), "--no-overwrites".into()];
            args.extend(yt_dlp_session_args(request));
            args.extend([
                "--progress".to_string(),
                "--newline".to_string(),
                "-x".to_string(),
                "--audio-format".to_string(),
                "mp3".to_string(),
                "-o".to_string(),
                output,
                request.source_url.clone().unwrap_or(input),
            ]);
            Ok(args)
        }
        ("yt-dlp", "inspect-url") => {
            let mut args: Vec<String> = vec!["--dump-single-json".into(), "--skip-download".into()];
            args.extend(yt_dlp_session_args(request));
            args.push(request.source_url.clone().unwrap_or(input));
            Ok(args)
        }
        ("gallery-dl", "download-gallery") => {
            let mut args: Vec<String> = vec!["--no-mtime".into()];
            args.extend(cookie_args(request));
            args.extend([
                "-D".to_string(),
                output,
                request.source_url.clone().unwrap_or(input),
            ]);
            Ok(args)
        }
        ("gallery-dl", "inspect-url") => {
            let mut args: Vec<String> = vec!["--dump-json".into(), "--no-download".into()];
            args.extend(cookie_args(request));
            args.push(request.source_url.clone().unwrap_or(input));
            Ok(args)
        }
        ("tesseract", "ocr") => Ok(vec![
            input,
            // Tesseract appends the extension itself, so it is handed a base
            // name — the same shape pdftoppm needs.
            rasterize_prefix(&output),
            "-l".into(),
            option("language", "eng"),
        ]),
        ("tesseract", "ocr-pdf") => Ok(vec![
            input,
            rasterize_prefix(&output),
            "-l".into(),
            option("language", "eng"),
            // A PDF with the recognised text behind the original image, so the
            // page still looks like the scan it came from.
            "pdf".into(),
        ]),
        ("exiftool", "inspect") => Ok(vec!["-G".into(), "-s".into(), input]),
        ("exiftool", "strip") => Ok(vec!["-all=".into(), "-o".into(), output, input]),
        ("exiftool", "set-title") => Ok(vec![
            format!("-Title={}", option("title", "")),
            "-o".into(),
            output,
            input,
        ]),
        ("poppler", "extract-text") => Ok(vec![
            "-layout".into(),
            "-enc".into(),
            "UTF-8".into(),
            input,
            output,
        ]),
        ("poppler", "rasterize") => Ok(vec![
            "-png".into(),
            "-singlefile".into(),
            "-r".into(),
            option("dpi", "150"),
            "-f".into(),
            option("page", "1"),
            "-l".into(),
            option("page", "1"),
            input,
            rasterize_prefix(&output),
        ]),
        ("oxipng", "optimize") => Ok(vec![
            "-o".into(),
            option("level", "2"),
            "--strip".into(),
            "safe".into(),
            "--out".into(),
            output,
            input,
        ]),
        ("mkvtoolnix", "remux") => Ok(vec!["-o".into(), output, input]),
        ("mkvtoolnix", "inspect") => Ok(vec![
            "--identify".into(),
            "--identification-format".into(),
            "json".into(),
            input,
        ]),
        ("imagemagick", "convert") => Ok(vec![input, output]),
        ("imagemagick", "grayscale") => {
            Ok(vec![input, "-colorspace".into(), "Gray".into(), output])
        }
        ("imagemagick", "inspect") => Ok(vec!["identify".into(), "-verbose".into(), input]),
        ("miller", "to-json") => Ok(vec!["--icsv".into(), "--ojson".into(), "cat".into(), input]),
        ("miller", "to-csv") => Ok(vec!["--ijson".into(), "--ocsv".into(), "cat".into(), input]),
        ("miller", "summary") => Ok(vec![
            "--icsv".into(),
            "--opprint".into(),
            "summary".into(),
            input,
        ]),
        ("hexyl", "preview") => Ok(vec![
            "--color".into(),
            "never".into(),
            "--border".into(),
            "none".into(),
            "--length".into(),
            option("length", "256"),
            input,
        ]),
        ("tokei", "count") => Ok(vec![
            "--sort".into(),
            "code".into(),
            "--num-format".into(),
            "plain".into(),
            input,
        ]),
        ("difftastic", "compare") => Ok(vec![
            "--color".into(),
            "never".into(),
            "--display".into(),
            "inline".into(),
            input,
            request
                .input_paths
                .get(1)
                .cloned()
                .ok_or("Choose both files that should be compared.")?,
        ]),
        ("dust", "usage") => Ok(vec![
            "--no-colors".into(),
            "--depth".into(),
            option("depth", "2"),
            "--number-of-lines".into(),
            option("lines", "20"),
            input,
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
            "Unsupported operation: {}/{}",
            request.tool_id, request.operation_id
        )),
    }
}

fn operation_writes_file(request: &OperationRequest) -> bool {
    !matches!(
        (request.tool_id.as_str(), request.operation_id.as_str()),
        ("ffprobe", "inspect")
            | ("yt-dlp", "inspect-url")
            | ("gallery-dl", "inspect-url")
            | ("jq", _)
            | ("yq", _)
            | ("ripgrep", "search")
            | ("fd", "find")
            | ("deno", "runtime")
            | ("exiftool", "inspect")
            | ("mkvtoolnix", "inspect")
            | ("imagemagick", "inspect")
            | ("miller", _)
            | ("hexyl", _)
            | ("tokei", _)
            | ("difftastic", _)
            | ("dust", _)
    )
}

/// `pdftoppm --singlefile` appends the format extension itself, so it takes the
/// destination without one.
fn rasterize_prefix(output: &str) -> String {
    let path = std::path::Path::new(output);
    match path.extension() {
        Some(_) => path.with_extension("").to_string_lossy().into_owned(),
        None => output.to_string(),
    }
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
            job_id: None,
        };
        assert_eq!(
            resolve_args(&request).unwrap(),
            vec![
                "-n",
                "-nostdin",
                "-i",
                "clip.mp4",
                "-map",
                "0:a:0",
                "-vn",
                "-c:a",
                "libmp3lame",
                "-q:a",
                "2",
                "clip.mp3"
            ]
        );
        // The shipped build has no libx264 at all — it is GPL and the pinned
        // artifact is the LGPL one — so asking for it produced a hard failure
        // for every user who let the app fetch FFmpeg.
        let compress = OperationRequest {
            operation_id: "compress".into(),
            output_path: Some("clip-small.mp4".into()),
            ..request
        };
        let args = resolve_args(&compress).unwrap();
        assert!(!args.iter().any(|arg| arg == "libx264"));
        assert!(args.windows(2).any(|pair| pair == ["-c:v", "libopenh264"]));
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
            "Converting the audio…"
        );
        assert_eq!(
            friendly_download_message("[Merger] Merging formats into \"video.mp4\""),
            "Merging video and audio…"
        );
    }

    fn request_for(tool: &str, operation: &str, options: &[(&str, &str)]) -> OperationRequest {
        OperationRequest {
            tool_id: tool.into(),
            operation_id: operation.into(),
            input_paths: vec!["input.fixture".into()],
            output_path: Some("output.fixture".into()),
            options: options
                .iter()
                .map(|(key, value)| (key.to_string(), value.to_string()))
                .collect(),
            source_url: None,
            job_id: None,
        }
    }

    #[test]
    fn writes_metadata_edits_to_a_new_file_instead_of_the_original() {
        for operation in ["strip", "set-title"] {
            let request = request_for("exiftool", operation, &[("title", "Contrato")]);
            let args = resolve_args(&request).unwrap();
            assert!(
                args.windows(2).any(|pair| pair == ["-o", "output.fixture"]),
                "{operation} must publish to a new path"
            );
            assert!(!args.iter().any(|arg| arg == "-overwrite_original"));
        }
        assert!(
            validate_options(&request_for("exiftool", "set-title", &[("title", "  ")])).is_err()
        );
    }

    #[test]
    fn prefers_the_binary_shipped_with_the_app_over_the_one_on_path() {
        // cmd.exe is always on PATH and never invoked by any adapter, so it is a safe
        // stand-in for "a name the machine already provides".
        let bundled = bundled_tool_directory().expect("the test binary has a parent directory");
        std::fs::create_dir_all(&bundled).unwrap();
        let shipped = bundled.join("cmd.exe");
        std::fs::write(&shipped, b"fixture").unwrap();

        let resolved = resolve_executable("cmd.exe").unwrap();

        std::fs::remove_file(&shipped).ok();
        assert_eq!(resolved, shipped, "the installed copy must win over PATH");
    }

    #[test]
    fn probes_poppler_through_a_binary_xpdf_does_not_ship() {
        // Xpdf installs its own pdftotext.exe; probing that name would report Poppler
        // as available when it is not.
        assert_eq!(executable_name("poppler").unwrap(), "pdftoppm.exe");
        assert_eq!(
            operation_executable(&request_for("poppler", "extract-text", &[])).unwrap(),
            "pdftotext.exe"
        );
        assert_eq!(
            operation_executable(&request_for("mkvtoolnix", "remux", &[])).unwrap(),
            "mkvmerge.exe"
        );
    }

    #[test]
    fn rasterizes_a_single_page_to_the_chosen_destination() {
        let args = resolve_args(&request_for("poppler", "rasterize", &[("dpi", "200")])).unwrap();
        assert!(args.contains(&"-singlefile".into()));
        assert!(args.windows(2).any(|pair| pair == ["-r", "200"]));
        // pdftoppm appends the extension, so it receives the destination without one.
        assert_eq!(args.last().unwrap(), "output");
        assert!(validate_options(&request_for("poppler", "rasterize", &[("dpi", "0")])).is_err());
    }

    #[test]
    fn calls_imagemagick_by_its_own_binary_never_the_windows_convert() {
        assert_eq!(executable_name("imagemagick").unwrap(), "magick.exe");
        let args = resolve_args(&request_for("imagemagick", "grayscale", &[])).unwrap();
        assert_eq!(
            args,
            vec!["input.fixture", "-colorspace", "Gray", "output.fixture"]
        );
        assert!(validate_options(&request_for("oxipng", "optimize", &[("level", "9")])).is_err());
        assert!(validate_options(&request_for("oxipng", "optimize", &[("level", "max")])).is_ok());
    }

    /// Builds a yt-dlp request; the tool takes a URL rather than input paths.
    fn download_request(operation: &str, options: &[(&str, &str)]) -> OperationRequest {
        OperationRequest {
            tool_id: "yt-dlp".into(),
            operation_id: operation.into(),
            input_paths: Vec::new(),
            output_path: Some("video.mkv".into()),
            options: options
                .iter()
                .map(|(key, value)| (key.to_string(), value.to_string()))
                .collect(),
            source_url: Some("https://example.com/video".into()),
            job_id: None,
        }
    }

    #[test]
    fn a_gallery_lands_in_the_folder_the_user_chose() {
        let mut request = download_request("download-gallery", &[]);
        request.tool_id = "gallery-dl".into();
        request.output_path = Some("C:/galerias".into());

        let args = resolve_args(&request).unwrap();
        // -D writes into that exact folder, instead of the site/author subtree
        // gallery-dl builds by default under -d.
        assert!(args.windows(2).any(|pair| pair == ["-D", "C:/galerias"]));
        assert_eq!(args.last().unwrap(), "https://example.com/video");
        assert_eq!(executable_name("gallery-dl").unwrap(), "gallery-dl.exe");
    }

    #[test]
    fn gallery_dl_takes_the_same_credentials_as_yt_dlp() {
        // Both spell the flags identically, so one builder serves both.
        let mut request = download_request("download-gallery", &[("cookiesFrom", "firefox")]);
        request.tool_id = "gallery-dl".into();
        request.output_path = Some("C:/galerias".into());

        let args = resolve_args(&request).unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--cookies-from-browser", "firefox"]));
        // The YouTube client workaround is yt-dlp's alone.
        assert!(!args.iter().any(|arg| arg.contains("player_client")));

        let mut bad = download_request("download-gallery", &[("cookiesFrom", "netscape")]);
        bad.tool_id = "gallery-dl".into();
        assert!(validate_options(&bad).is_err());
    }

    #[test]
    fn a_gallery_may_reuse_a_folder_that_an_archive_may_not() {
        let folder = std::env::temp_dir().join("toolhaven-gallery-target");
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(folder.join("existing.jpg"), b"x").unwrap();
        let path = folder.to_string_lossy().to_string();

        let mut gallery = download_request("download-gallery", &[]);
        gallery.tool_id = "gallery-dl".into();
        gallery.output_path = Some(path.clone());
        // gallery-dl skips what it already has, so a populated folder is the
        // normal case rather than an error.
        assert!(validate_request(&gallery).is_ok());

        let extract = OperationRequest {
            tool_id: "7zip".into(),
            operation_id: "extract".into(),
            input_paths: vec!["input.fixture".into()],
            output_path: Some(path),
            options: std::collections::HashMap::new(),
            source_url: None,
            job_id: None,
        };
        // Extracting would overwrite whatever shares a name.
        assert!(validate_request(&extract).is_err());

        std::fs::remove_dir_all(folder).ok();
    }

    #[test]
    fn signing_in_replaces_the_anonymous_client_workaround() {
        // The forced embedded client exists to dodge the 403 an anonymous
        // request gets. With cookies it would cost a Premium account the
        // web_creator client its best formats come from, so it must go.
        let args = resolve_args(&download_request(
            "download-video",
            &[("cookiesFrom", "firefox")],
        ))
        .unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--cookies-from-browser", "firefox"]));
        assert!(!args.iter().any(|arg| arg.contains("player_client")));

        // Without credentials the workaround stays.
        let anonymous = resolve_args(&download_request("download-video", &[])).unwrap();
        assert!(anonymous
            .iter()
            .any(|arg| arg == "youtube:player_client=web_embedded"));
        assert!(!anonymous.iter().any(|arg| arg.starts_with("--cookies")));
    }

    #[test]
    fn a_cookie_file_is_passed_through_and_checked_for_existence() {
        let file = std::env::temp_dir().join("toolhaven-cookies-test.txt");
        std::fs::write(
            &file,
            "# Netscape HTTP Cookie File
",
        )
        .unwrap();
        let path = file.to_string_lossy().to_string();

        let args = resolve_args(&download_request(
            "download-video",
            &[("cookieFile", &path)],
        ))
        .unwrap();
        assert!(args.windows(2).any(|pair| pair == ["--cookies", &path]));

        assert!(validate_options(&download_request(
            "download-video",
            &[("cookieFile", &path)]
        ))
        .is_ok());
        assert!(validate_options(&download_request(
            "download-video",
            &[("cookieFile", r"C:\nowhere\cookies.txt")]
        ))
        .is_err());
        std::fs::remove_file(file).ok();
    }

    #[test]
    fn rejects_credentials_that_could_not_work() {
        // Two sources at once is ambiguous rather than additive.
        assert!(validate_options(&download_request(
            "download-video",
            &[("cookiesFrom", "firefox"), ("cookieFile", "cookies.txt")]
        ))
        .is_err());
        // An unknown browser must never reach the command line.
        assert!(validate_options(&download_request(
            "download-video",
            &[("cookiesFrom", "netscape")]
        ))
        .is_err());
        assert!(
            validate_options(&download_request("download-video", &[("quality", "ultra")])).is_err()
        );
    }

    #[test]
    fn best_quality_lifts_the_mp4_ceiling() {
        // YouTube publishes nothing above 1080p in mp4, so the compatible
        // chain caps resolution by construction.
        let best =
            resolve_args(&download_request("download-video", &[("quality", "best")])).unwrap();
        assert!(best.windows(2).any(|pair| pair == ["-f", "bv*+ba/b"]));
        assert!(best
            .windows(2)
            .any(|pair| pair == ["--merge-output-format", "mkv"]));

        let compatible = resolve_args(&download_request("download-video", &[])).unwrap();
        assert!(compatible
            .iter()
            .any(|arg| arg.contains("bv*[ext=mp4]+ba[ext=m4a]")));
        assert!(compatible
            .windows(2)
            .any(|pair| pair == ["--merge-output-format", "mp4"]));
    }

    #[test]
    fn inspecting_a_url_uses_the_same_credentials() {
        // Otherwise the format list would describe what an anonymous viewer
        // gets, and the download that follows would not match it.
        let args =
            resolve_args(&download_request("inspect-url", &[("cookiesFrom", "edge")])).unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--cookies-from-browser", "edge"]));
    }

    #[test]
    fn prefers_remuxing_over_re_encoding_a_downloaded_video() {
        let download = OperationRequest {
            tool_id: "yt-dlp".into(),
            operation_id: "download-video".into(),
            input_paths: Vec::new(),
            output_path: Some("video.mp4".into()),
            options: std::collections::HashMap::new(),
            source_url: Some("https://example.com/video".into()),
            job_id: None,
        };
        let args = resolve_args(&download).unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--merge-output-format", "mp4"]));
        assert!(!args.iter().any(|arg| arg == "--recode-video"));
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
            job_id: None,
        };
        let args = resolve_args(&download).unwrap();
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--progress", "--newline"]));
        assert!(args
            .windows(2)
            .any(|pair| { pair == ["--extractor-args", "youtube:player_client=web_embedded"] }));

        let upscale = OperationRequest {
            tool_id: "libvips".into(),
            operation_id: "upscale".into(),
            input_paths: vec!["image.png".into()],
            output_path: Some("image-upscale.png".into()),
            options: std::collections::HashMap::new(),
            source_url: None,
            job_id: None,
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
                    .join("toolhaven-invalid-upscale.png")
                    .to_string_lossy()
                    .into_owned(),
            ),
            options: [("scale".into(), "1".into())].into_iter().collect(),
            source_url: None,
            job_id: None,
        };
        assert!(validate_request(&request)
            .unwrap_err()
            .contains("larger than 1"));
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
            ("ffmpeg", "resize"),
            ("ffmpeg", "crop"),
            ("ffmpeg", "rotate"),
            ("ffmpeg", "change-speed"),
            ("ffmpeg", "fps"),
            ("ffmpeg", "to-gif"),
            ("ffmpeg", "thumbnail"),
            ("ffmpeg", "contact-sheet"),
            ("ffmpeg", "remove-audio"),
            ("ffmpeg", "normalize-audio"),
            ("ffprobe", "inspect"),
            ("qpdf", "merge"),
            ("qpdf", "split"),
            ("qpdf", "rotate"),
            ("qpdf", "protect"),
            ("qpdf", "linearize"),
            ("yt-dlp", "download-video"),
            ("yt-dlp", "download-audio"),
            ("yt-dlp", "inspect-url"),
            ("gallery-dl", "download-gallery"),
            ("gallery-dl", "inspect-url"),
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
            ("exiftool", "inspect"),
            ("exiftool", "strip"),
            ("exiftool", "set-title"),
            ("poppler", "extract-text"),
            ("poppler", "rasterize"),
            ("oxipng", "optimize"),
            ("mkvtoolnix", "remux"),
            ("mkvtoolnix", "inspect"),
            ("imagemagick", "convert"),
            ("imagemagick", "grayscale"),
            ("imagemagick", "inspect"),
            ("miller", "to-json"),
            ("miller", "to-csv"),
            ("miller", "summary"),
            ("hexyl", "preview"),
            ("tokei", "count"),
            ("difftastic", "compare"),
            ("dust", "usage"),
        ];

        for (tool_id, operation_id) in cases {
            let request = OperationRequest {
                tool_id: tool_id.into(),
                operation_id: operation_id.into(),
                input_paths: vec!["input.fixture".into(), "second.fixture".into()],
                output_path: Some("output.fixture".into()),
                options: std::collections::HashMap::new(),
                source_url: Some("https://example.com/media".into()),
                job_id: None,
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
            job_id: None,
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
            job_id: None,
        };
        assert!(validate_request(&missing).is_err());

        let invalid_url = OperationRequest {
            tool_id: "yt-dlp".into(),
            operation_id: "inspect-url".into(),
            input_paths: Vec::new(),
            output_path: None,
            options: std::collections::HashMap::new(),
            source_url: Some("file:///secret".into()),
            job_id: None,
        };
        assert!(validate_request(&invalid_url).is_err());

        let runtime = OperationRequest {
            tool_id: "deno".into(),
            operation_id: "runtime".into(),
            input_paths: Vec::new(),
            output_path: None,
            options: std::collections::HashMap::new(),
            source_url: None,
            job_id: None,
        };
        assert!(validate_request(&runtime).is_ok());
        assert!(!operation_writes_file(&runtime));
    }
}
