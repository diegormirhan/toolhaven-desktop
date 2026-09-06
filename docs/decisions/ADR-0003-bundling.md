# ADR-0003: Hybrid delivery for the toolchain

- Status: accepted
- Date: 2026-09-04

## Context

O requisito central é instalar uma vez e não baixar dependências externas. Guardar
executáveis manualmente no repositório não garante origem, licença ou repetibilidade.

## Decision

Um manifesto fixa estratégia de entrega, versão, URL, hash, licença, dependências e
arquivos esperados. Ferramentas leves entram no instalador. Ferramentas pesadas são
publicadas como pacotes sob demanda e instaladas dentro do app por catálogo assinado,
staging, verificação, health check e ativação atômica.

## Consequences

- Usuário final recebe o núcleo imediatamente e escolhe quais pacotes pesados instalar.
- Repositório permanece auditável e evita blobs opacos como fonte de verdade.
- O app assume responsabilidade por download, retomada, integridade, espaço e rollback.
- O instalador inicial não cresce com todas as integrações disponíveis.
- yt-dlp aparece na primeira versão, mas é instalado sob demanda com suas dependências.
- Ferramentas leves e pesadas usam a mesma linguagem de cards; o estado de instalação
  muda a ação, não a posição mental da ferramenta.
