# Tests

- `tool-manifest/`: the catalog is valid, and every capability it claims is
  backed by an operation.
- `component-installation/`: the download-and-verify plan, and the state a
  half-finished install leaves behind.
- `execution/`: the pure resolver that turns a typed request into an executable
  and an argument array.
- `interface/`: rules about the stylesheet that a browser cannot tell you it is
  breaking.

The interface's own behaviour is tested beside the components, under
`apps/desktop/src`, and the Rust host's under `apps/desktop/src-tauri/src`.

```bash
npm test
```
