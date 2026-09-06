# Workbench

> Aplicativo Windows x64 em desenvolvimento. Código próprio sob MIT.

Aplicativo desktop para Windows que reúne ferramentas abertas de mídia, imagens,
PDFs, downloads, arquivos e utilidades de desenvolvimento em uma interface única.
A distribuição planejada leva o núcleo e as ferramentas leves, com as maiores sob
demanda. **Na versão atual, as ferramentas são detectadas na instalação local do
Windows; o download integrado de componentes ainda não foi implementado.**

## Estado atual

O catálogo React/TypeScript já é executável no navegador e no host Tauri Windows,
incluindo busca, cards, painel de ferramenta, histórico da sessão e execução nativa por
adaptadores tipados. O host detecta os componentes instalados no Windows e não finge
instalações ausentes.

A fila persistente, cancelamento e ajustes ainda estão pendentes. A prévia no
navegador não executa ferramentas: use `workbench.exe` ou `npm run tauri:dev`.

Teste de contrato real (requer as 12 ferramentas instaladas):
`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -- --include-ignored --nocapture`.
Os testes geram arquivos próprios em uma pasta temporária `workbench-smoke-*` e
validam as 28 operações do catálogo, inclusive downloads em servidor HTTP local.

```powershell
npm install
npm run dev
```

Use `npm test` para executar domínio e frontend, e `npm run build` para gerar a
interface de produção.

Use `npm run tauri:build` para gerar o executável Windows x64 e os instaladores MSI/NSIS.

## Comece por aqui

1. `PRODUCT.md` — verdade de produto já confirmada e hipóteses explícitas.
2. `docs/PROJECT-BRIEF.md` — proposta, limites e definição inicial do MVP.
3. `docs/ARCHITECTURE.md` — arquitetura, fluxo de execução e estrutura do repositório.
4. `docs/TOOL-MATRIX.md` — ferramentas candidatas, funções e riscos.
5. `docs/QUESTIONS.md` — decisões de release ainda abertas.
6. `docs/ROADMAP.md` — caminho incremental até uma versão publicável.
7. `docs/CARD-CATALOG.md` — catálogo dinâmico e estados de instalação.
7. `docs/PROGRESS.md` — partes concluídas, evidências e próximo passo proposto.

## Stack recomendada

- Tauri 2 como shell e empacotador.
- Rust para domínio, fila de trabalhos, validação e supervisão de processos.
- React + TypeScript + Vite para a interface.
- SQLite local para histórico, presets e fila recuperável.
- Ferramentas leves incluídas no instalador; pacotes pesados instalados sob demanda.
- Todo binário externo é fixado por versão, hash e licença antes da distribuição.
- Código próprio planejado para repositório público sob MIT; notices de terceiros
  continuam separados.

## Princípios

- Sem IA e sem serviços obrigatórios em nuvem.
- Operações locais por padrão; rede apenas onde a função exige.
- Interface simples para o caminho comum; opções avançadas sob demanda.
- Nenhum comando de sistema arbitrário vindo do frontend.
- Saída previsível, cancelável e auditável.
- Licenças e proveniência fazem parte do build, não de uma revisão tardia.

## Diretórios preparados

- `.agents/skills/` — cópias locais das skills usadas no projeto.
- `apps/desktop/` — app Tauri + React e host nativo em `src-tauri/`.
- `crates/` — futuros módulos Rust independentes do framework.
- `docs/` — produto, arquitetura, segurança, UX e decisões.
- `scripts/` — futura automação reprodutível de aquisição dos binários.
- `tooling/` — schema e manifesto das integrações.
- `vendor/` — artefatos de terceiros gerados no build; não é fonte de verdade.
- `tests/` — testes de contratos, integração e empacotamento.
