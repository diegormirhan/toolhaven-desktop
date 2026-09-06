# Architecture

## Decisão central

Usar um monólito modular local: uma UI React em WebView, um host Tauri/Rust e um
catálogo fechado de ferramentas embutidas ou instaláveis sob demanda. Não há servidor
local separado no MVP.

```text
React UI
  │ typed invoke/events
  ▼
Tauri command boundary
  │ validates DTOs and paths
  ▼
Application use cases ─── Job registry/history (SQLite)
  │
  ├── Component installer ─ signed catalog / downloads / activation
  │
  ├── Media adapter ───── ffmpeg / ffprobe
  ├── Download adapter ── yt-dlp / deno
  ├── Image adapter ───── libvips CLI or Rust image path
  └── PDF adapter ─────── qpdf / PDFium boundary
        │
        ▼
Temporary workspace → validated output → atomic publish
```

## Por que essa forma

- Rust mantém validação, processos e filesystem fora do WebView.
- Casos de uso não dependem de Tauri nem do formato de stdout de uma CLI.
- Adaptadores traduzem pedidos tipados para argumentos permitidos.
- Um único motor de jobs resolve progresso, logs, cancelamento e concorrência para
  todas as categorias.
- Sidecars preservam as ferramentas upstream e permitem atualizar integrações sem
  reimplementar codecs.

## Fluxo de uma operação

1. UI envia um DTO tipado como `TranscodeVideoRequest`.
2. Boundary valida schema, caminhos, permissões e conflito de saída.
3. Caso de uso cria um `Job` imutável e um workspace temporário exclusivo.
4. Adaptador produz um `ExecutionPlan`; não recebe strings de shell.
5. Supervisor inicia o executável conhecido com array de argumentos.
6. Parser converte stdout/stderr em eventos de domínio normalizados.
7. UI recebe progresso, warning, conclusão ou erro.
8. Em sucesso, o arquivo temporário é validado e movido para o destino final.
9. Em cancelamento/falha, temporários são limpos e o original nunca é alterado.

## Módulos Rust propostos

- `toolkit-domain`: Job, Operation, InputFile, OutputPlan, Progress, Failure.
- `toolkit-application`: casos de uso e portas; não conhece Tauri ou CLIs.
- `toolkit-runner`: supervisor de processos, cancelamento e limites de concorrência.
- `toolkit-files`: caminhos, workspaces temporários e publicação atômica.
- `toolkit-catalog`: manifesto, versões, hashes, licenças e capacidades.
- `toolkit-adapters`: um submódulo por ferramenta externa.
- `toolkit-persistence`: SQLite para jobs, presets e configurações.
- `desktop-host`: commands/events Tauri e composição das dependências.

Só criar um crate quando houver pelo menos um limite real a proteger. O scaffold
inicial pode começar com módulos no `src-tauri` e extrair crates conforme os testes
provarem a necessidade.

## Contratos importantes

### Operation

Representa intenção estável (`extract_audio`, `merge_pdf`), nunca o nome de uma CLI.

### ExecutionPlan

Contém executável registrado, argumentos separados, ambiente mínimo, diretório de
trabalho, parser de progresso e regra de cancelamento. Não contém comando de shell.

### ToolDescriptor

Fonte única para ID, versão, alvo, arquivos do bundle, origem, hash, licença,
notices e capacidades.

### Job lifecycle

`queued → validating → running → finalizing → succeeded | failed | cancelled`

Transições inválidas falham de forma explícita. Reiniciar o app marca processos
interrompidos como `abandoned`, nunca como sucesso.

## Processos e concorrência

- Limite global conservador e limite específico para jobs pesados.
- Cancelamento gracioso primeiro; encerramento forçado após timeout.
- Process tree encerrada com Windows Job Objects para não deixar filhos órfãos.
- Backpressure: arquivos adicionados entram na fila, não iniciam todos juntos.
- Logs estruturados com redaction de URLs, cookies e paths sensíveis na UI.

## Empacotamento

Existem dois canais de entrega:

- **Embedded:** núcleo e ferramentas leves seguem no instalador como recursos Tauri.
- **On-demand:** pacotes pesados são baixados pelo app para um component store no
  diretório de dados da aplicação.

Executáveis simples embutidos podem entrar como `externalBin`. Distribuições com DLLs,
dados ou fontes auxiliares usam recursos versionados. Componentes sob demanda nunca
dependem do PATH: o backend resolve a versão ativa no component store.

### Instalação sob demanda

1. Resolver a ferramenta e suas dependências no catálogo assinado.
2. Mostrar tamanho total, versão, licença e espaço necessário no card.
3. Baixar para staging com retomada quando o servidor permitir.
4. Verificar assinatura do catálogo e SHA-256 de todos os arquivos.
5. Extrair em diretório isolado da versão e executar health check.
6. Ativar a nova versão com troca atômica de ponteiro.
7. Manter a versão anterior até o primeiro uso saudável; depois permitir limpeza.

O domínio separa disponibilidade estável (`available` ou `ready`) da fase transitória
(`idle`, `resolving`, `downloading`, `verifying`, `installing`). Assim uma atualização
falha sem apagar a versão ativa. Cancelamento nunca deixa versão parcialmente ativa.

Enquanto Rust não estiver autorizado no ambiente, os módulos Node em
`scripts/component-installation/` funcionam como especificação executável. Eles não
fazem I/O e serão portados para Rust, mantendo os mesmos casos de aceitação.

Pipeline planejado:

1. Ler `tooling/tools.json` e validá-lo contra o contrato versionado.
2. Baixar artefatos upstream fixados.
3. Verificar hash/assinatura e extrair em staging.
4. Rodar smoke test de cada executável.
5. Copiar ferramentas `embedded` para o bundle e publicar pacotes `on-demand` no canal
   de componentes.
6. Gerar `THIRD-PARTY-NOTICES`, SBOM e inventário JSON consumido pela UI.
7. Construir e assinar NSIS/MSI e manifesto do updater.

## Persistência

SQLite guarda metadados de jobs, presets e preferências. Não guarda conteúdo dos
arquivos. Logs detalhados têm retenção configurável. Segredos de cookies ou tokens,
se o download autenticado for aprovado, usam Windows Credential Manager e nunca o
banco em texto puro.

## Estratégia de testes

- Unitários: validação, naming de saída, estados e montagem de argumentos.
- Contrato: parsers contra stdout/stderr gravados de versões fixadas.
- Integração: fixtures pequenas executadas com binários reais.
- Empacotamento: VM limpa confirma recursos, licenças e smoke tests.
- Componentes: download interrompido, hash inválido, rollback e dependências transitivas.
- E2E: um caminho feliz e um erro útil por fluxo vertical.

## Estrutura do repositório

```text
unified-toolkit-desktop/
├─ .agents/skills/
├─ apps/desktop/
│  ├─ src/                 # React UI
│  └─ src-tauri/           # host Tauri e composição Rust
├─ crates/                 # extraídos apenas quando limites se provarem
├─ docs/
│  └─ decisions/
├─ scripts/                # fetch, verify, notice, SBOM, package
├─ tooling/
│  ├─ tools.json
│  └─ schemas/
├─ vendor/                 # gerado; binários não são editados manualmente
└─ tests/
   ├─ contracts/
   ├─ fixtures/
   └─ packaging/
```

## Fontes técnicas verificadas

- Tauri sidecars: https://v2.tauri.app/develop/sidecar/
- Tauri updater: https://v2.tauri.app/plugin/updater/
- Assinatura no Windows: https://v2.tauri.app/distribute/sign/windows/
