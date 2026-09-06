# Build prerequisites

## Current machine check

- Node.js: available.
- npm: available.
- pnpm: available.
- Rust/Cargo: installed and active (`rustc 1.98.1`, `cargo 1.98.1`, MSVC target).
- Visual Studio Build Tools 2022: installed with VC++ x64 tools and Windows SDK 10.0.26100.0.

## Required before executable bootstrap

- Stable Rust toolchain with the Windows MSVC target.
- Microsoft C++ Build Tools / Windows SDK as required by Tauri on Windows.
- A package manager choice (npm or pnpm) recorded in the project.
- A clean Windows x64 test environment for installer smoke tests.

O toolchain foi instalado com autorização explícita para gerar o app Windows. A
versão do Tauri CLI fica fixada no `package.json`; a compilação usa o ambiente
MSVC x64 carregado por `VsDevCmd.bat`.

Para reconstruir o instalador:

```powershell
npm run tauri:build
```
