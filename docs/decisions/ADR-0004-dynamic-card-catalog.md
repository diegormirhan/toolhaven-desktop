# ADR-0004: Dynamic cards as the tool entry point

- Status: accepted
- Date: 2026-09-05

## Context

O produto contém muitas ferramentas com diferentes estados de disponibilidade. O
usuário pediu cards dinâmicos inspirados na descoberta da Netflix e nos tiles do
Fortnite, usando princípios de interação do Apple Design.

## Decision

Cada ferramenta tem um card estável que reúne descoberta, instalação, progresso,
atualização e abertura. A home usa faixas temáticas e tamanhos controlados de card.
A ordenação pessoal é determinística por fixados e uso recente; não usa IA.

## Consequences

- O usuário entende o catálogo antes de conhecer nomes de CLIs.
- A instalação sob demanda é parte do fluxo principal, não uma tela técnica separada.
- Cards exigem uma máquina de estados única compartilhada com o backend.
- Movimento deve ser imediato, espacialmente consistente, interrompível e acessível.
- A linguagem visual final ainda precisa de checkpoint; a referência define interação
  e composição, não marca ou paleta.

