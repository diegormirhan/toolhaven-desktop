# Desktop app

React and TypeScript frontend plus the Tauri 2 host for the Windows desktop application.

## Run locally

```powershell
npm install
npm run dev
```

`npm run build` generates the production frontend in `apps/desktop/dist`.

`npm run tauri:dev` opens the native development window. `npm run tauri:build`
generates the Windows x64 executable, MSI and NSIS installer under
`apps/desktop/src-tauri/target/release/`.

The native panel calls typed Tauri commands (`detect_available_tools` and
`execute_operation`). It resolves only registered executables, passes an argv array
without a shell, uses native Windows file dialogs and reports the real process result.
The web preview intentionally refuses execution. Missing component packs are reported
honestly until their signed, versioned artifacts and SHA-256 values are added to the
manifest.

## Local rule

Do not add real third-party executables here by hand. The release pipeline stages them
from the manifest under `tooling/` after license and hash verification.
