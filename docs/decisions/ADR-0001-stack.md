# ADR-0001: Tauri, Rust and React

- Status: accepted
- Date: 2026-09-04

## Context

O produto é Windows-first, processa arquivos localmente e precisa distribuir CLIs e
bibliotecas existentes com uma UI rica. O usuário escolheu Tauri como builder e
delegou o restante da stack.

## Decision

Usar Tauri 2, Rust no host e React + TypeScript + Vite no frontend. SQLite é a
persistência local recomendada.

## Consequences

- Reaproveita experiência do autor com React/TypeScript.
- Rust é adequado para processos, filesystem, concorrência e contratos tipados.
- WebView reduz o tamanho do shell, mas o bundle total continuará dominado pelos
  binários de terceiros.
- Mais de uma linguagem aumenta a disciplina necessária nos contratos IPC.
- O usuário confirmou a stack delegada e a plataforma inicial Windows x64.
