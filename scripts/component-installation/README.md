# Component installation contracts

These dependency-resolution and state-transition modules are executable domain
specifications. They let the project validate behavior before Rust is available.

The production Tauri host will implement the same contracts in Rust. Keep these tests
as cross-language acceptance cases until the Rust implementation proves equivalent;
then remove duplicated runtime logic deliberately rather than maintaining two sources
of truth.

No module in this directory performs network, filesystem or process side effects.
