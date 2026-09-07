# Build prerequisites

`setup.ps1` at the repository root checks all of this and reports whatever is missing,
so this file is the reference rather than the procedure.

## What the build needs

- **Node.js 24 or newer**, with npm.
- **A stable Rust toolchain** with the `x86_64-pc-windows-msvc` target.
- **Microsoft C++ Build Tools** and the Windows SDK, which Tauri needs to link on
  Windows. The "Desktop development with C++" workload covers both.
- **A clean Windows x64 machine** for the installer smoke tests, because a machine that
  already carries the tools cannot tell you whether the installer delivers them.

## This machine

- Node.js and npm: available.
- Rust/Cargo: installed and active (`rustc 1.98.1`, `cargo 1.98.1`, MSVC target).
- Visual Studio Build Tools 2022: installed, with the VC++ x64 tools and Windows SDK
  10.0.26100.0.

The toolchain was installed with explicit authorisation to produce the Windows app. The
Tauri CLI version is pinned in `package.json`, and compilation uses the MSVC x64
environment loaded by `VsDevCmd.bat`.

## Rebuilding

```powershell
.\setup.ps1          # toolchain, dependencies, pinned tools, checks, installer
npm run tauri:build  # just the build
```
