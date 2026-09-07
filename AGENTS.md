# Working Agreement

## Communication

- Conversation and explanations in Portuguese; everything written into the project —
  interface, code, comments, documentation — in English.
- Code comments only where a decision is not obvious from the code.
- Explain the cause and the trade-off; do not flatter a fragile decision.
- Treat `PRODUCT.md` and the ADRs as sources of truth. Do not fill a gap with a silent
  assumption.

## Engineering

- Start with the smallest vertical slice that proves the architecture.
- Apply TDD to new behaviour and to regressions.
- Keep domain, orchestration, filesystem/processes and Tauri glue apart.
- Use specific names; avoid `manager`, `helper`, `utils` modules and generic services.
- Keep tool configuration and versions in a single source.
- No arbitrary shell execution from the frontend.
- Do not commit, branch or publish without being asked.

## Product boundaries

- Do not add AI.
- Do not claim support for a format without a fixture and a contract test.
- Do not ship a third-party binary without its licence, origin, version and hash.
- Do not build the final interface before the flow and the visual system are confirmed.
