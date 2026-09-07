# ADR-0002: Typed tool adapters, no arbitrary shell

- Status: accepted
- Date: 2026-09-04

## Context

Exposing the CLIs' flags directly would be fast, but it would couple the interface, the
security model and the tests to unstable surfaces, and it would allow dangerous
combinations.

## Decision

The interface sends typed domain operations. Rust adapters turn validated values — and
only validated values — into a known program plus an argument array. The frontend never
receives a generic shell API.

## Consequences

- A much smaller surface for command injection.
- Consistent behaviour across tools.
- Every new capability costs an explicit contract and test.
- Advanced users will not have every upstream flag in the first version. Customisable
  presets can come later without accepting a free-form command line.
- The decision covers the whole scope of the request: a new capability arrives through a
  contract, an adapter and a fixture, never by exposing the CLI directly.
