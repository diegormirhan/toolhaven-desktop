//! Component store: downloads, verifies, extracts and activates the tools that do not
//! ship inside the installer. The user never leaves ToolHaven to install anything.
//!
//! Everything here is keyed by the artifact's SHA-256, so two tools that share an
//! archive — ffmpeg and ffprobe come from the same build — are installed once.

use std::io::Read;
use std::path::{Path, PathBuf};

/// The manifest is the single source of truth for what we distribute, so the host reads
/// the same file the build and the catalog read, compiled in.
const MANIFEST: &str = include_str!("../../../../tooling/tools.json");

#[derive(Debug, serde::Deserialize)]
struct Manifest {
    tools: Vec<ManifestTool>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestTool {
    pub id: String,
    pub display_name: String,
    pub status: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub artifacts: Vec<Artifact>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub url: String,
    pub sha256: String,
    #[serde(default)]
    pub binary_directory: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentProgress {
    pub tool_id: String,
    pub phase: String,
    pub progress: Option<f64>,
    pub message: String,
}

fn manifest() -> &'static Manifest {
    static PARSED: std::sync::OnceLock<Manifest> = std::sync::OnceLock::new();
    PARSED.get_or_init(|| serde_json::from_str(MANIFEST).expect("tools.json ships with the binary"))
}

pub fn tool(tool_id: &str) -> Option<&'static ManifestTool> {
    manifest().tools.iter().find(|tool| tool.id == tool_id)
}

/// Where installed components live. Under the user's local app data, never in Program
/// Files, so installing a component never needs elevation.
fn store_root() -> Result<PathBuf, String> {
    let base = std::env::var_os("LOCALAPPDATA")
        .ok_or("Could not locate the application data folder.")?;
    Ok(PathBuf::from(base).join("ToolHaven").join("components"))
}

/// One directory per artifact digest: re-installing the same version is idempotent and
/// a different version never overwrites a working one.
fn artifact_directory(artifact: &Artifact) -> Result<PathBuf, String> {
    Ok(store_root()?.join(&artifact.sha256[..16]))
}

/// The directory holding a tool's executables once it is installed, if it is installed.
pub fn installed_binary_directory(tool_id: &str) -> Option<PathBuf> {
    let artifact = tool(tool_id)?.artifacts.first()?;
    let mut directory = artifact_directory(artifact).ok()?;
    if !artifact.binary_directory.is_empty() {
        for segment in artifact.binary_directory.split(['/', '\\']) {
            directory = directory.join(segment);
        }
    }
    directory.is_dir().then_some(directory)
}

/// Tools that must be installed before this one, the requested tool last, skipping
/// whatever is already present.
pub fn installation_plan(tool_id: &str) -> Result<Vec<&'static ManifestTool>, String> {
    let mut ordered = Vec::new();
    let mut visiting = Vec::new();
    resolve_plan(tool_id, &mut ordered, &mut visiting)?;
    Ok(ordered)
}

fn resolve_plan(
    tool_id: &str,
    ordered: &mut Vec<&'static ManifestTool>,
    visiting: &mut Vec<String>,
) -> Result<(), String> {
    if ordered.iter().any(|tool| tool.id == tool_id) {
        return Ok(());
    }
    if visiting.iter().any(|id| id == tool_id) {
        visiting.push(tool_id.to_string());
        return Err(format!("Circular dependency: {}", visiting.join(" -> ")));
    }
    let entry = tool(tool_id).ok_or_else(|| format!("Tool outside the catalog: {tool_id}"))?;

    visiting.push(tool_id.to_string());
    for dependency in &entry.dependencies {
        resolve_plan(dependency, ordered, visiting)?;
    }
    visiting.pop();

    // Tools inside the installer are already there; nothing to download for them.
    if entry.status != "bundled" {
        ordered.push(entry);
    }
    Ok(())
}

pub fn is_installed(tool_id: &str) -> bool {
    match tool(tool_id) {
        Some(entry) if entry.status == "bundled" => true,
        Some(_) => installed_binary_directory(tool_id).is_some(),
        None => false,
    }
}

/// Downloads, verifies and activates one component. Existing installations are left
/// untouched until the new one is complete and verified.
pub fn install(
    tool_id: &str,
    report: &(dyn Fn(ComponentProgress) + Send + Sync),
) -> Result<(), String> {
    let entry = tool(tool_id).ok_or_else(|| format!("Tool outside the catalog: {tool_id}"))?;
    if entry.status == "bundled" {
        return Ok(());
    }
    if entry.status != "downloadable" {
        return Err(format!(
            "{} has no pinned artifact yet, so the app cannot install it.",
            entry.display_name
        ));
    }
    let artifact = entry
        .artifacts
        .first()
        .ok_or("The tool declares no artifact.")?;

    let target = artifact_directory(artifact)?;
    if target.is_dir() {
        return Ok(());
    }

    report(ComponentProgress {
        tool_id: tool_id.into(),
        phase: "downloading".into(),
        progress: Some(0.0),
        message: format!("Downloading {} {}…", entry.display_name, entry.version.as_deref().unwrap_or("")),
    });
    let bytes = download(&artifact.url, tool_id, report)?;

    report(ComponentProgress {
        tool_id: tool_id.into(),
        phase: "verifying".into(),
        progress: None,
        message: "Verifying the download…".into(),
    });
    let digest = sha256(&bytes);
    if digest != artifact.sha256.to_ascii_lowercase() {
        return Err(format!(
            "The download does not match what was expected.\nexpected {}\ngot      {digest}",
            artifact.sha256
        ));
    }

    report(ComponentProgress {
        tool_id: tool_id.into(),
        phase: "installing".into(),
        progress: None,
        message: format!("Installing {} {}…", entry.display_name, entry.version.as_deref().unwrap_or("")),
    });
    // Staging beside the final directory keeps activation on the same volume, so the
    // rename is atomic and a failure never leaves a half-installed component active.
    let staging = target.with_extension("staging");
    let _ = std::fs::remove_dir_all(&staging);
    std::fs::create_dir_all(&staging).map_err(|error| format!("Could not prepare the installation: {error}"))?;

    let result = if artifact.url.to_ascii_lowercase().ends_with(".exe") {
        write_single_executable(&artifact.url, &bytes, &staging)
    } else {
        extract_zip(&bytes, &staging)
    };
    if let Err(error) = result {
        let _ = std::fs::remove_dir_all(&staging);
        return Err(error);
    }

    if let Err(error) = std::fs::rename(&staging, &target) {
        let _ = std::fs::remove_dir_all(&staging);
        return Err(format!("Could not activate the component: {error}"));
    }

    report(ComponentProgress {
        tool_id: tool_id.into(),
        phase: "ready".into(),
        progress: Some(1.0),
        message: format!("{} installed.", entry.display_name),
    });
    Ok(())
}

fn download(
    url: &str,
    tool_id: &str,
    report: &(dyn Fn(ComponentProgress) + Send + Sync),
) -> Result<Vec<u8>, String> {
    let response = ureq::get(url)
        .call()
        .map_err(|error| format!("Failed to download the component: {error}"))?;
    let expected = response
        .header("Content-Length")
        .and_then(|value| value.parse::<usize>().ok());

    let mut reader = response.into_reader();
    let mut bytes = Vec::with_capacity(expected.unwrap_or(0));
    let mut chunk = vec![0_u8; 256 * 1024];
    let mut announced = 0.0_f64;

    loop {
        let read = reader
            .read(&mut chunk)
            .map_err(|error| format!("The download was interrupted: {error}"))?;
        if read == 0 {
            break;
        }
        bytes.extend_from_slice(&chunk[..read]);

        if let Some(total) = expected.filter(|total| *total > 0) {
            let progress = (bytes.len() as f64 / total as f64).clamp(0.0, 1.0);
            // One event per percent: enough for a smooth bar, far less chatter than one
            // per chunk.
            if progress - announced >= 0.01 || progress >= 1.0 {
                announced = progress;
                report(ComponentProgress {
                    tool_id: tool_id.into(),
                    phase: "downloading".into(),
                    progress: Some(progress),
                    message: format!(
                        "Downloading… {:.0} of {:.0} MB",
                        bytes.len() as f64 / 1_048_576.0,
                        total as f64 / 1_048_576.0
                    ),
                });
            }
        }
    }
    Ok(bytes)
}

fn sha256(bytes: &[u8]) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(bytes);
    hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn write_single_executable(url: &str, bytes: &[u8], destination: &Path) -> Result<(), String> {
    let name = url
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty())
        .ok_or("The artifact URL has no file name.")?;
    std::fs::write(destination.join(name), bytes)
        .map_err(|error| format!("Could not write the executable: {error}"))
}

fn extract_zip(bytes: &[u8], destination: &Path) -> Result<(), String> {
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes))
        .map_err(|error| format!("The download is not a valid zip: {error}"))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Could not read the package contents: {error}"))?;
        // `enclosed_name` rejects absolute paths and `..`, so a malicious archive cannot
        // write outside the store.
        let Some(relative) = entry.enclosed_name() else {
            return Err(format!("The package contains an unsafe path: {}", entry.name()));
        };
        let path = destination.join(relative);

        if entry.is_dir() {
            std::fs::create_dir_all(&path)
                .map_err(|error| format!("Could not create {}: {error}", path.display()))?;
            continue;
        }
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
        }
        let mut file = std::fs::File::create(&path)
            .map_err(|error| format!("Could not write {}: {error}", path.display()))?;
        std::io::copy(&mut entry, &mut file)
            .map_err(|error| format!("Failed to extract {}: {error}", path.display()))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_catalog_tool_declares_a_delivery_that_the_app_can_honour() {
        for entry in &manifest().tools {
            match entry.status.as_str() {
                "bundled" | "downloadable" => {
                    assert!(entry.version.is_some(), "{} has no version", entry.id);
                    assert!(!entry.artifacts.is_empty(), "{} has no artifact", entry.id);
                }
                "planned" => assert!(entry.artifacts.is_empty(), "{} should declare no artifact", entry.id),
                other => panic!("unknown status on {}: {other}", entry.id),
            }
        }
    }

    #[test]
    fn plans_dependencies_first_and_skips_what_the_installer_already_ships() {
        let plan = installation_plan("yt-dlp").unwrap();
        let ids: Vec<&str> = plan.iter().map(|tool| tool.id.as_str()).collect();

        assert_eq!(ids, ["deno", "ffmpeg", "ffprobe", "yt-dlp"]);
        assert!(installation_plan("no-such-tool").is_err());
    }

    #[test]
    fn tools_sharing_an_archive_install_into_the_same_directory() {
        let ffmpeg = tool("ffmpeg").unwrap().artifacts.first().unwrap();
        let ffprobe = tool("ffprobe").unwrap().artifacts.first().unwrap();

        assert_eq!(ffmpeg.sha256, ffprobe.sha256);
        assert_eq!(
            artifact_directory(ffmpeg).unwrap(),
            artifact_directory(ffprobe).unwrap()
        );
    }

    #[test]
    #[ignore = "Baixa um componente real da internet"]
    fn installs_a_real_component_end_to_end() {
        let artifact = tool("difftastic").unwrap().artifacts.first().unwrap();
        let directory = artifact_directory(artifact).unwrap();
        let _ = std::fs::remove_dir_all(&directory);

        let seen = std::sync::Mutex::new(Vec::new());
        install("difftastic", &|progress| {
            seen.lock().unwrap().push(progress.phase);
        })
        .unwrap();

        let phases = seen.into_inner().unwrap();
        assert!(phases.contains(&"downloading".to_string()), "{phases:?}");
        assert!(phases.contains(&"verifying".to_string()), "{phases:?}");
        assert!(phases.contains(&"ready".to_string()), "{phases:?}");
        assert!(is_installed("difftastic"));

        let binaries = installed_binary_directory("difftastic").expect("installed");
        assert!(binaries.join("difft.exe").is_file());
        // Re-installing an artifact already in the store must be a no-op, not a re-download.
        install("difftastic", &|_| panic!("must not download twice")).unwrap();
        println!("Component installed at {}", binaries.display());
    }

    #[test]
    fn refuses_to_install_a_tool_without_a_pinned_artifact() {
        let error = install("7zip", &|_| {}).unwrap_err();
        assert!(error.contains("no pinned artifact"), "{error}");
    }
}
