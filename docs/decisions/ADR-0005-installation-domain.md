# ADR-0005: Separate stable availability from installation activity

- Status: accepted
- Date: 2026-09-05

## Context

Uma ferramenta pode continuar pronta para uso enquanto uma atualização é baixada ou
falha. Um único enum como `installing | ready | failed` perderia essa informação e
forçaria o card a esconder uma versão ainda saudável.

## Decision

Modelar disponibilidade estável e fase transitória separadamente. Resolver o plano por
grafo acíclico, ordenar dependências antes do pedido e excluir itens embutidos ou já
instalados. Ativação só ocorre depois da verificação e instalação completas.

## Consequences

- Falha de update preserva a versão ativa.
- Cards conseguem mostrar progresso sem bloquear “Abrir” quando isso for seguro.
- Ciclos e dependências ausentes falham antes de qualquer download.
- Os contratos Node atuais serão portados para Rust e usados como casos de aceitação.

