# Build scripts

Current responsibility: validate the versioned tool catalog without external runtime
dependencies. Planned responsibilities: fetch pinned tools, verify signatures/hashes,
stage bundle resources, run smoke tests, generate third-party notices, emit SBOM and
verify the installer in a clean Windows environment.

The `execution/` boundary now contains a pure operation-plan resolver. It translates
typed tool/operation requests into an executable name plus an argument array. It does
not spawn processes and never constructs shell strings; the future Rust supervisor will
consume the same contract after the Tauri host is enabled.
