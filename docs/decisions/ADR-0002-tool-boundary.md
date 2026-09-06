# ADR-0002: Typed tool adapters, no arbitrary shell

- Status: accepted
- Date: 2026-09-04

## Context

Expor flags das CLIs diretamente seria rápido, mas acoplaria UX, segurança e testes a
interfaces instáveis e permitiria combinações perigosas.

## Decision

A UI envia operações de domínio tipadas. Adaptadores Rust transformam somente valores
validados em programa conhecido + array de argumentos. O frontend não recebe uma API
de shell genérica.

## Consequences

- Menor superfície para command injection.
- UX consistente entre ferramentas.
- Cada nova capacidade exige contrato e teste explícitos.
- Usuários avançados não terão todas as flags upstream no MVP; presets customizáveis
  podem ser adicionados depois sem aceitar command line livre.
- A decisão vale para todo o escopo amplo do pedido; cada capacidade nova entra por
  contrato, adapter e fixture, não por exposição direta da CLI.
