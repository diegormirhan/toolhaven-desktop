# Roadmap

## Fase 0 — decisões e prova de distribuição

- Responder `QUESTIONS.md`.
- Escolher nome, licença do app, arquitetura suportada e limite de bundle.
- Fazer spikes de licença/tamanho para FFmpeg, yt-dlp + Deno, libvips e qpdf.
- Definir núcleo leve e canal assinado de componentes sob demanda.
- Incluir yt-dlp + Deno no catálogo da primeira versão, sem colocá-los no instalador.
- Gerar um instalador vazio assinado ou registrar conscientemente a limitação de
  SmartScreen para portfólio.
- Fixar a matriz real do MVP.

**Saída:** ADRs confirmados e tool manifest inicial, sem UI final.

## Fase 1 — primeiro fluxo vertical

- Scaffold Tauri 2 + React/TypeScript.
- Job lifecycle, temp workspace, cancelamento e eventos.
- FFmpeg/ffprobe: extrair áudio de um vídeo.
- Histórico mínimo e teste em VM limpa.

**Saída:** uma tarefa leve funciona ponta a ponta no instalador.

## Fase 2 — mídia útil

- Conversão e compressão de vídeo/áudio.
- Presets explícitos e opções avançadas.
- Fixtures de codecs suportados.
- Fila com concorrência limitada.

## Fase 3 — imagens e PDFs

- Spike decide libvips versus Rust para imagens.
- Batch de imagem com política de conflito.
- qpdf para operações estruturais.
- PDFium apenas se preview/rasterização justificar o custo.

## Fase 4 — download e instalação interna (primeira versão)

- Cards instalam yt-dlp + Deno e dependências sem sair do app.
- Download retomável, hash, staging, health check, ativação atômica e rollback.
- URLs públicas primeiro; autenticação fica fora até ameaça/UX serem definidos.
- Atualização frequente da integração coberta por contratos gravados.

## Fase 5 — acabamento de portfólio

- Onboarding curto, empty/error states e acessibilidade.
- Tela Sobre com componentes e licenças.
- Site/release com hashes, SBOM, screenshots e demo honesta.
- Benchmark de tamanho, tempo e memória com fixtures publicáveis.

## Fase 6 — expansão controlada

Avaliar arquivos compactados, metadados, documentos e dev tools um fluxo por vez.
Uma categoria entra apenas com usuário-alvo, formatos, ferramenta, licença, fixtures
e orçamento de bundle definidos.

## Fora do roadmap até validação

- Marketplace de plugins.
- Execução de comandos arbitrários.
- Editor de timeline/canvas completo.
- Cloud sync e conta.
- IA, OCR neural e super-resolution.
