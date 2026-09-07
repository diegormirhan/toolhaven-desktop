# ToolHaven

> Aplicativo Windows x64 em desenvolvimento. Código próprio sob MIT.

Aplicativo desktop para Windows que reúne ferramentas abertas de mídia, imagens,
PDFs, downloads, arquivos e utilidades de desenvolvimento em uma interface única.
O instalador leva o núcleo e nove ferramentas leves; as maiores serão baixadas pelo
próprio app. **O usuário nunca instala nada por fora.**

Estado atual da entrega:

- **Incluídas no instalador (9):** jq, yq, ripgrep, fd, Miller, tokei, hexyl, Dust e
  Oxipng. Versão e SHA-256 fixados, baixados e verificados durante o build.
- **Instaladas pelo próprio app (9):** FFmpeg, ffprobe, yt-dlp, Deno, qpdf, libvips,
  Poppler, Pandoc e Difftastic. O card abre um plano, mostra o progresso do download,
  confere o SHA-256 e ativa o componente. Sem navegador, sem winget, sem administrador.
- **Ainda sem artefato fixado (4):** 7-Zip, MKVToolNix, ImageMagick e ExifTool. A
  distribuição Windows delas não é um `.zip` versionado; o motivo de cada uma está em
  `docs/TOOL-MATRIX.md`. Só funcionam se já estiverem na máquina, e o app diz isso.

## Estado atual

O catálogo React/TypeScript já é executável no navegador e no host Tauri Windows,
incluindo busca, cards, painel de ferramenta, histórico da sessão e execução nativa por
adaptadores tipados. O host detecta os componentes instalados no Windows e não finge
instalações ausentes.

Operações rodam em segundo plano: fechar o painel de uma ferramenta não interrompe
nem esconde a tarefa, que continua na Fila com progresso real e termina no Histórico.
A interface tem tema claro e escuro, com opção “sistema” como padrão, aceita arquivos
arrastados para a janela e mostra o progresso real relatado pela ferramenta — sem
inventar percentual quando ela não informa um.

Fila persistente entre reinícios e cancelamento de operação ainda estão pendentes. A
prévia no navegador não executa ferramentas: use `toolhaven.exe` ou `npm run tauri:dev`.

Teste de contrato real contra os binários instalados. Ele verifica cada ferramenta
presente e nomeia as que não conseguiu verificar, em vez de passar em silêncio:
`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml -- --include-ignored --nocapture`.
Os testes geram arquivos próprios em uma pasta temporária `toolhaven-smoke-*` e
validam as operações do catálogo, inclusive downloads em servidor HTTP local.

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
8. `docs/PROGRESS.md` — partes concluídas, evidências e próximo passo proposto.

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
