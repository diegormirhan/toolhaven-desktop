//! Opt-in contract tests against installed Windows tools, using only generated fixtures.
use super::*;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

fn request(
    tool: &str,
    operation: &str,
    inputs: &[PathBuf],
    output: Option<PathBuf>,
    options: &[(&str, &str)],
) -> OperationRequest {
    OperationRequest {
        tool_id: tool.into(),
        operation_id: operation.into(),
        input_paths: inputs
            .iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect(),
        output_path: output.map(|path| path.to_string_lossy().into_owned()),
        options: options
            .iter()
            .map(|(key, value)| (key.to_string(), value.to_string()))
            .collect(),
        source_url: None,
    }
}

fn run(request: OperationRequest) -> OperationResult {
    let label = format!("{}/{}", request.tool_id, request.operation_id);
    let result =
        execute_operation_inner(request).unwrap_or_else(|error| panic!("{label}: {error}"));
    if let Some(output) = &result.output_path {
        let metadata =
            std::fs::metadata(output).unwrap_or_else(|error| panic!("{label}: {output}: {error}"));
        assert!(
            metadata.is_dir() || metadata.len() > 0,
            "{label}: empty output"
        );
    }
    println!("PASS {label}");
    result
}

fn cli(executable: &str, args: &[&str]) -> String {
    let output = std::process::Command::new(resolve_executable(executable).unwrap())
        .args(args)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}: {}",
        executable,
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).into_owned()
}

fn create_pdf(path: &Path) {
    let objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>",
        "<< /Length 0 >>\nstream\n\nendstream",
    ];
    let mut pdf = String::from("%PDF-1.4\n");
    let mut offsets = Vec::new();
    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.push_str(&format!("{} 0 obj\n{object}\nendobj\n", index + 1));
    }
    let xref = pdf.len();
    pdf.push_str("xref\n0 5\n0000000000 65535 f \n");
    for offset in offsets {
        pdf.push_str(&format!("{offset:010} 00000 n \n"));
    }
    pdf.push_str(&format!(
        "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    ));
    std::fs::write(path, pdf).unwrap();
}

#[test]
#[ignore = "Requires the 12 Windows CLI integrations to be installed"]
fn every_catalog_operation_executes_on_generated_fixtures() {
    let root = std::env::temp_dir().join(format!(
        "workbench-smoke-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));
    std::fs::create_dir(&root).unwrap();
    println!("Fixtures: {}", root.display());
    let json = root.join("sample.json");
    std::fs::write(&json, r#"{"name":"Workbench","count":2}"#).unwrap();
    let yaml = root.join("sample.yaml");
    std::fs::write(&yaml, "name: Workbench\ncount: 2\n").unwrap();
    for (tool, input) in [("jq", json.clone()), ("yq", yaml)] {
        assert!(run(request(tool, "format", &[input.clone()], None, &[]))
            .stdout
            .contains("Workbench"));
        assert!(
            run(request(
                tool,
                "query",
                &[input],
                None,
                &[("query", ".count")]
            ))
            .stdout
            .trim()
                == "2"
        );
    }
    assert!(run(request(
        "ripgrep",
        "search",
        &[root.clone()],
        None,
        &[("query", "Workbench")]
    ))
    .stdout
    .contains("sample.json"));
    assert!(run(request(
        "ripgrep",
        "search",
        &[root.clone()],
        None,
        &[("query", "NoSuchFixtureValue9382")]
    ))
    .stdout
    .contains("Nenhuma correspondência"));
    assert!(run(request(
        "fd",
        "find",
        &[root.clone()],
        None,
        &[("query", "sample")]
    ))
    .stdout
    .contains("sample.json"));
    assert!(run(request("deno", "runtime", &[], None, &[]))
        .stdout
        .contains("deno "));

    let archive = root.join("sample.zip");
    run(request(
        "7zip",
        "compress",
        &[json.clone()],
        Some(archive.clone()),
        &[],
    ));
    let extracted = root.join("extracted");
    run(request(
        "7zip",
        "extract",
        &[archive],
        Some(extracted.clone()),
        &[],
    ));
    assert_eq!(
        std::fs::read(extracted.join("sample.json")).unwrap(),
        std::fs::read(&json).unwrap()
    );
    let overwrite = execute_operation_inner(request(
        "7zip",
        "compress",
        &[json.clone()],
        Some(json),
        &[],
    ));
    assert!(overwrite.unwrap_err().contains("já existe"));
    let markdown = root.join("sample.md");
    std::fs::write(&markdown, "# Workbench\n\nFixture document.\n").unwrap();
    let html = root.join("sample.html");
    run(request(
        "pandoc",
        "convert",
        &[markdown],
        Some(html.clone()),
        &[],
    ));
    assert!(std::fs::read_to_string(html).unwrap().contains("<h1"));

    let pdf = root.join("sample.pdf");
    create_pdf(&pdf);
    for operation in ["merge", "split", "rotate", "protect", "linearize"] {
        let output = root.join(format!("{operation}.pdf"));
        let inputs = if operation == "merge" {
            vec![pdf.clone(), pdf.clone()]
        } else {
            vec![pdf.clone()]
        };
        run(request(
            "qpdf",
            operation,
            &inputs,
            Some(output.clone()),
            &[("password", "fixture-only"), ("pages", "1")],
        ));
        let check = cli(
            "qpdf.exe",
            &[
                "--password=fixture-only",
                "--show-npages",
                output.to_str().unwrap(),
            ],
        );
        assert_eq!(check.trim(), if operation == "merge" { "2" } else { "1" });
    }

    let ppm = root.join("sample.ppm");
    let mut image = b"P6\n120 120\n255\n".to_vec();
    image.extend(vec![128_u8; 120 * 120 * 3]);
    std::fs::write(&ppm, image).unwrap();
    for (operation, extension, expected_width) in [
        ("resize", "png", 120),
        ("upscale", "png", 240),
        ("crop", "png", 100),
        ("compress", "jpg", 120),
        ("convert", "png", 120),
    ] {
        let output = root.join(format!("{operation}.{extension}"));
        run(request(
            "libvips",
            operation,
            &[ppm.clone()],
            Some(output.clone()),
            &[],
        ));
        let probe = cli(
            "ffprobe.exe",
            &[
                "-v",
                "quiet",
                "-of",
                "json",
                "-show_streams",
                output.to_str().unwrap(),
            ],
        );
        let data: serde_json::Value = serde_json::from_str(&probe).unwrap();
        assert_eq!(data["streams"][0]["width"], expected_width);
    }

    let video = root.join("sample.mp4");
    cli(
        "ffmpeg.exe",
        &[
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=160x120:r=10",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            video.to_str().unwrap(),
        ],
    );
    for (operation, extension) in [
        ("convert", "mkv"),
        ("extract-audio", "mp3"),
        ("compress", "mp4"),
        ("trim", "mp4"),
    ] {
        let output = root.join(format!("{operation}.{extension}"));
        run(request(
            "ffmpeg",
            operation,
            &[video.clone()],
            Some(output.clone()),
            &[("end", "0.5")],
        ));
        let result = run(request("ffprobe", "inspect", &[output], None, &[]));
        let probe: serde_json::Value = serde_json::from_str(&result.stdout).unwrap();
        assert!(!probe["streams"].as_array().unwrap().is_empty());
        if operation == "extract-audio" {
            assert_eq!(probe["streams"][0]["codec_name"], "mp3");
        }
    }

    let server = FixtureServer::start(std::fs::read(video).unwrap());
    for operation in ["inspect-url", "download-video", "download-audio"] {
        let output = match operation {
            "download-video" => Some(root.join("download.mp4")),
            "download-audio" => Some(root.join("download.mp3")),
            _ => None,
        };
        let mut input = request("yt-dlp", operation, &[], output, &[]);
        input.source_url = Some(server.url.clone());
        let result = run(input);
        if operation == "inspect-url" {
            assert!(serde_json::from_str::<serde_json::Value>(&result.stdout).is_ok());
        }
    }
    println!(
        "All 28 catalog operations passed. Generated fixtures retained at {}",
        root.display()
    );
}

struct FixtureServer {
    url: String,
    stop: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}
impl FixtureServer {
    fn start(bytes: Vec<u8>) -> Self {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/sample.mp4", listener.local_addr().unwrap());
        listener.set_nonblocking(true).unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        let stopping = stop.clone();
        let thread = std::thread::spawn(move || {
            while !stopping.load(Ordering::Relaxed) {
                if let Ok((mut stream, _)) = listener.accept() {
                    stream.set_nonblocking(false).unwrap();
                    stream
                        .set_read_timeout(Some(std::time::Duration::from_secs(2)))
                        .ok();
                    let mut request = Vec::new();
                    let mut chunk = [0; 1024];
                    while !request.windows(4).any(|part| part == b"\r\n\r\n")
                        && request.len() < 16384
                    {
                        match stream.read(&mut chunk) {
                            Ok(0) | Err(_) => break,
                            Ok(length) => request.extend_from_slice(&chunk[..length]),
                        }
                    }
                    let head = request.starts_with(b"HEAD ");
                    let header = format!("HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", bytes.len());
                    stream.write_all(header.as_bytes()).ok();
                    if !head {
                        stream.write_all(&bytes).ok();
                    }
                } else {
                    std::thread::sleep(std::time::Duration::from_millis(10));
                }
            }
        });
        Self {
            url,
            stop,
            thread: Some(thread),
        }
    }
}
impl Drop for FixtureServer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            thread.join().unwrap();
        }
    }
}
