# Schemas

Contains the versioned JSON Schema for the tool manifest. The executable validator
under `scripts/tool-manifest/` enforces cross-entry rules that JSON Schema cannot
express clearly, such as unique tool IDs and unique bundle destinations.
