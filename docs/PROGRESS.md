# Progress

> Ordem: mais recente primeiro. Entradas antigas são mantidas como registro; quando
> uma decisão posterior as substitui, isso é dito na própria entrada.

## Incremento atual — o app instala os próprios componentes

Status: concluído em 2026-09-07.

A outra metade da entrega híbrida. Nove ferramentas que não cabem no instalador agora
são baixadas, verificadas e ativadas pelo próprio ToolHaven: FFmpeg, ffprobe, yt-dlp,
Deno, qpdf, libvips, Poppler, Pandoc e Difftastic.

### Modelo

- O manifesto ganhou um terceiro estado, `downloadable`: artefato fixado com versão e
  SHA-256, mas fora do instalador. `planned` continua significando "só identidade".
  Schema na versão 2, validador e fixtures acompanhando.
- Artefatos podem declarar `binaryDirectory`, o caminho dos executáveis dentro do
  pacote — `qpdf-12.4.1-msvc64/bin`, `poppler-26.07.0/Library/bin`, e assim por diante.
- `apps/desktop/src-tauri/src/components.rs` compila o `tools.json` com `include_str!`.
  Build, catálogo e runtime passaram a ler a mesma fonte de verdade.

### Instalação

- Download com progresso real (um evento por ponto percentual), SHA-256 conferido antes
  de qualquer coisa tocar o disco final, extração em `.staging` no mesmo volume e
  ativação por `rename` — atômica. Falha em qualquer etapa não deixa componente meio
  instalado ativo.
- O diretório é nomeado pelo digest do artefato. Reinstalar a mesma versão é no-op, e
  ferramentas que compartilham um pacote ocupam uma cópia só: ffmpeg e ffprobe vêm do
  mesmo build de 140 MB e são baixados uma vez.
- Instala em `%LOCALAPPDATA%\ToolHaven\components`, então **nunca pede administrador**.
- O plano resolve dependências primeiro e pula o que o instalador já traz. Pedir yt-dlp
  instala Deno, FFmpeg, ffprobe e yt-dlp, nessa ordem.
- Resolução de executável passou a consultar, nessa ordem: o que veio no instalador, o
  component store, o PATH.

### Interface

O diálogo de instalação deixou de ser um plano somente-leitura. Ele mostra o plano com
o progresso de cada dependência, tem botão "Baixar e instalar", exibe o erro quando
falha e oferece "Tentar novamente". Para as quatro ferramentas ainda sem artefato
fixado, ele não oferece botão nenhum — explica por que não pode instalar.

### O que sobra

7-Zip, MKVToolNix, ImageMagick e ExifTool continuam dependendo de instalação prévia.
Nenhuma é bloqueio de licença: é formato de distribuição — `.7z` e instalador NSIS, que
o extrator ainda não lê, e ausência de URL versionada estável. Detalhes por ferramenta
em `docs/TOOL-MATRIX.md`.

### Evidência

- 22 testes de domínio, 53 de UI e 21 Rust aprovados.
- Teste de integração real: baixa o Difftastic da internet, confere o hash, extrai,
  ativa, confirma `difft.exe` no lugar e prova que reinstalar não baixa de novo.
- Sweep de contrato seguiu com “Every catalog operation passed against a real binary”.
- Instalador NSIS 15,6 MB.

## Incremento — nove ferramentas passaram a vir no instalador

Status: concluído em 2026-09-07.

Até aqui o app **só detectava** ferramentas já instaladas no Windows. Numa máquina limpa,
todos os cards diriam "Ver disponibilidade" e nada funcionaria — as ferramentas usadas
nos testes tinham sido instaladas por fora, com winget. Isso foi corrigido para nove
delas e registrado abertamente para as outras treze.

### Pipeline de aquisição

- `tooling/tools.json` deixou de ter só identidade: nove ferramentas viraram `bundled`,
  com **versão e SHA-256 fixados** apontando para o artefato exato do release upstream.
- `scripts/tools/stage-embedded-tools.mjs` baixa cada artefato para um cache, confere o
  hash — **divergência aborta o build**, porque um artefato que não bate com o digest não
  é o artefato que foi revisado —, extrai o executável e o coloca em `resources/tools/`.
- `bundle.resources` no `tauri.conf.json` leva esse diretório para dentro do MSI e do
  NSIS. `npm run build` roda o staging antes do Vite, então o instalador nunca sai sem as
  ferramentas.
- O script também emite `THIRD-PARTY-NOTICES.txt` e `tool-inventory.json` com nome,
  versão, licença, origem, URL do artefato e hash.

### Resolução passou a preferir o que foi distribuído

`resolve_executable` procura primeiro em `<pasta do executável>/tools`. A versão fixada,
verificada e testada ganha de qualquer coisa no PATH da máquina — que é a regra que o
`ARCHITECTURE.md` já definia e que nenhuma ferramenta seguia ainda. Há teste: um binário
plantado nesse diretório vence um nome que existe no PATH do sistema.

### O que entrou e por quê

| | |
|---|---|
| Incluídas | jq, yq, ripgrep, fd, Miller, tokei, hexyl, Dust, Oxipng |
| Tamanho | ~47 MB de executáveis, instalador NSIS de **14,9 MB** |
| Licenças | todas permissivas: MIT, Apache-2.0, BSD-2, Unlicense |

O critério foi executável único, sem DLL, licença permissiva e tamanho pequeno. Nenhuma
ferramenta copyleft entrou no instalador — é a posição conservadora que o `LICENSING.md`
recomenda para a primeira versão.

Duas exclusões deliberadas:

- **Difftastic (112 MB)** é permissiva e caberia pelo critério de licença, mas sozinha
  multiplicaria o instalador por oito. Vai para o canal sob demanda.
- **tokei** foi incluída na versão 12.1.2, de janeiro de 2021, porque o upstream **parou
  de publicar binários Windows** — a tag atual v15.0.0 não tem nenhum artefato. Ficar com
  um binário antigo é ruim; deixar um card permanentemente morto é pior. Fica registrado
  para revisão, e a alternativa é compilar do fonte no build.

### O que ainda falta

As outras treze ferramentas continuam dependendo de instalação externa. O canal sob
demanda — baixar, verificar, instalar e ativar dentro do app — ainda não existe: hoje há
só o contrato em Node de `scripts/component-installation/`. Enquanto isso, a mensagem de
erro do host diz exatamente isso, em vez de sugerir que o usuário resolva sozinho.

### Evidência

- 22 testes de domínio, 50 de UI e 15 Rust aprovados.
- Manifesto validado com 22 ferramentas, 9 `bundled` com hash fixado.
- `7z l` no instalador NSIS confirma `tools\*.exe` ao lado de `toolhaven.exe`.
- Instalador NSIS 14,9 MB; MSI 20,9 MB.

## Incremento — cinco dev tools

Status: concluído em 2026-09-07.

A faixa de dev tools tinha sete cards e nenhuma capacidade tabular, de bytes ou de
comparação. Cinco ferramentas novas fecham essas lacunas — pesquisadas, validadas por
licença e origem, instaladas via winget e verificadas pelo sweep de contrato.

| Ferramenta | Operações | Licença |
|---|---|---|
| Miller | CSV para JSON, JSON para CSV, resumir colunas | `BSD-2-Clause` |
| Difftastic | comparar dois arquivos pela sintaxe | `MIT` |
| tokei | contar código por linguagem | `MIT OR Apache-2.0` |
| hexyl | prévia em hexadecimal | `MIT OR Apache-2.0` |
| Dust | maiores pastas em disco | `Apache-2.0` |

### Decisões

- **Todas são somente leitura.** Escrevem em stdout e nada em disco, então não têm
  destino nem chance de sobrescrever um arquivo. É a mesma forma do jq e do ripgrep.
- **Primeira operação com dois arquivos de entrada.** O Difftastic obrigou o painel a
  aprender seleção múltipla fora do `merge` do qpdf, e o host a recusar antes de iniciar
  o processo quando falta o segundo arquivo.
- **Primeira vez que "pasta" deixou de ser uma exceção codificada.** `folderTools` e
  `multiInputOperations` substituíram as comparações espalhadas por `fd` e `ripgrep`.
- **tokei não expõe JSON.** O binário pré-compilado vem sem os formatos de serialização,
  então o adaptador usa a saída em tabela em vez de prometer `--output json`.

### Uma reprovada que valia registrar

**hyperfine** tem licença permissiva e seria útil, mas ele mede o tempo de **comandos de
shell arbitrários** dados pelo usuário. Integrá-lo seria oferecer execução arbitrária de
shell pela interface — exatamente o que a ADR-0002 e o modelo de segurança proíbem. É a
primeira reprovação por arquitetura, não por licença nem por produto.

### Evidência

- 22 testes de domínio, 50 de UI e 15 Rust aprovados.
- Sweep de contrato: “Every catalog operation passed against a real binary”, cobrindo as
  22 ferramentas do manifesto sem nenhuma pulada.
- Auditoria de 43 capacidades aprovada; TypeScript estrito e build Windows aprovados.

## Incremento — cinco ferramentas integradas

Status: concluído em 2026-09-07.

As cinco candidatas validadas deixaram de ser só entradas de manifesto e passaram a
funcionar: card, adaptador Rust com argv tipado, opções no painel, nome de saída próprio
e teste de contrato.

| Ferramenta | Operações | Executável |
|---|---|---|
| ExifTool | ler metadados, remover metadados, definir título | `exiftool.exe` |
| Poppler | extrair texto, página como imagem | `pdftotext.exe`, `pdftoppm.exe` |
| Oxipng | otimizar PNG sem perdas | `oxipng.exe` |
| MKVToolNix | converter para MKV, inspecionar faixas | `mkvmerge.exe` |
| ImageMagick | converter formato, converter para cinza, inspecionar | `magick.exe` |

### Decisões que a integração forçou

- **Uma ferramenta pode ter mais de um executável.** Poppler e MKVToolNix dividem o
  trabalho entre binários diferentes, então surgiu `operation_executable`, que resolve o
  executável por operação e cai no representativo da ferramenta quando não há exceção.
- **Xpdf não é Poppler.** O `pdftotext.exe` que aparece no PATH via Git for Windows é o
  Xpdf 4.06, outro projeto. A detecção do Poppler passa por `pdftoppm.exe`, que o Xpdf
  não distribui — senão o app reportaria Poppler instalado sem estar. Há teste para isso.
- **Nunca chamar `convert.exe`.** O `convert` do PATH no Windows é o conversor de sistema
  de arquivos da Microsoft, não o ImageMagick. O adaptador usa apenas `magick.exe`, e um
  teste trava essa escolha.
- **ExifTool edita em uma cópia.** Todas as operações de escrita usam `-o`, nunca
  `-overwrite_original`, para manter a regra de não alterar o original.
- **`pdftoppm --singlefile` acrescenta a extensão sozinho**, então recebe o destino sem
  ela; `rasterize_prefix` cuida disso.
- **A validação de opções virou função pura.** `validate_options` saiu de dentro de
  `validate_request` porque os testes de faixa (DPI, nível do oxipng, título vazio)
  estavam passando pelo motivo errado — a checagem de arquivo inexistente disparava antes.

### O teste de contrato passou a ser honesto sobre o que não verificou

O sweep contra binários reais deixou de ser tudo-ou-nada: ele verifica cada ferramenta
instalada e **nomeia as que não conseguiu verificar**, em vez de passar em silêncio.

Com Oxipng, Poppler e MKVToolNix instalados via winget, o sweep passou a cobrir as 17
ferramentas e imprimiu “Every catalog operation passed against a real binary”.

Instalá-las revelou dois problemas de resolução que só aparecem no Windows real:

- **O instalador do MKVToolNix não mexe no PATH.** `%ProgramFiles%\MKVToolNix` virou
  diretório conhecido do host.
- **Com o Poppler instalado, o `pdftotext.exe` do Git (Xpdf) continua vindo antes no
  PATH.** A sonda por `pdftoppm.exe` evitava reportar Poppler ausente como presente, mas
  não impedia chamar o binário errado. Agora todos os comandos do Poppler são resolvidos
  no diretório da instalação identificada pela sonda — o que também é a regra de longo
  prazo do `ARCHITECTURE.md`: resolver pelo diretório da instalação, nunca por PATH.

### Evidência

- 22 testes de domínio, 46 de UI e 15 Rust aprovados; o sweep real cobriu as 17
  ferramentas, sem nenhuma pulada.
- Manifesto com 17 ferramentas validado; auditoria agora cobre 37 capacidades.
- TypeScript estrito, build Vite e `npm run tauri:build` aprovados.

## Incremento — rolagem das faixas e novos candidatos validados

Status: concluído em 2026-09-07.

### A animação lateral das faixas

- **Causa raiz do travamento:** a medição de “dá para rolar para os lados?” rodava a cada
  quadro da animação e a cada movimento do ponteiro, criando um objeto novo de estado e
  re-renderizando a faixa inteira — com todos os cards — 60 vezes por segundo. Agora a
  medição só publica quando o valor realmente muda.
- O snap nativo (`scroll-snap-type`) disputava com a mola que nós mesmos dirigimos, o que
  produzia um solavanco no fim do movimento. Ele é suspenso enquanto a faixa está sob
  arrasto ou animação e volta depois.
- A posição interna da mola não era limitada, mas o scroller limita: as duas divergiam e a
  animação dava um salto ao assentar. Agora a mola é limitada junto e zera a velocidade
  na borda.
- Os cards passando sob o cursor disparavam a transição de hover, um a um, durante a
  rolagem. Hover e transição ficam desligados enquanto a faixa se move.

### Ferramentas pesquisadas e validadas

- Cinco candidatas entraram em `tooling/tools.json` como `planned`, com licença, origem e
  build Windows conferidos na fonte upstream: ExifTool, Poppler, Oxipng, MKVToolNix e
  ImageMagick. Entrada no manifesto é identidade validada, não integração: nenhuma tem
  card, adaptador ou operação, porque isso exige contrato e fixture.
- Três foram reprovadas com motivo registrado: Ghostscript (AGPL-3.0 com enforcement
  ativo da Artifex, incompatível com um app MIT que instala o componente), Tesseract
  (motor LSTM, contra a regra de não usar IA) e pngquant (GPL-3.0 com licença comercial
  explícita para uso não-GPL — ambiguidade que `LICENSING.md` manda evitar).
- Detalhes, ressalvas e fontes em `docs/TOOL-MATRIX.md`.

### Evidência

- 22 testes de domínio, 38 de UI e 11 Rust aprovados.
- Manifesto validado com 17 ferramentas; auditoria de 27 capacidades aprovada.
- TypeScript estrito e build Vite aprovados.

## Incremento — ToolHaven: identidade, arte dos cards e progresso real

Status: concluído em 2026-09-06.

### Nome e marca

- O produto passou a se chamar **ToolHaven**, alinhado ao repositório
  `github.com/diegormirhan/toolhaven-desktop`. O nome anterior (Workbench) e o slug
  `unified-toolkit-desktop` saíram de todo o código, dos instaladores, do pacote npm,
  do crate Rust e dos documentos. O identificador Tauri virou `com.toolhaven.desktop`
  e o executável, `toolhaven.exe`.
- Ícone novo: monograma geométrico — um arco em azul de ação sobre uma base âmbar,
  no grafite da paleta. Lê como abrigo sobre bancada, sem letra. A fonte é
  `apps/desktop/src-tauri/icons/toolhaven.svg`; os rasters saem de `npx tauri icon`.
  A marca da barra lateral repete a mesma geometria, então barra de tarefas e app
  concordam. Cores de marca são tokens fixos e não seguem o tema.
- O diretório local continua `unified-toolkit-desktop`; só o clone novo nasce com o
  nome do repositório.

### Arte dos cards

- Cada integração ganhou um desenho próprio numa grade 200 × 100 compartilhada, com os
  mesmos pesos de traço e o acento do card como `currentColor`, sobre um campo pontilhado
  tingido por esse acento. São diagramas do que a ferramenta produz — páginas empilhadas,
  moldura de recorte, filme virando forma de onda — no lugar de um ícone genérico dentro
  de uma caixa vazia.
- O código truncado de três letras (`YT-`, `FFM`, `FFP`), que parecia defeito, virou o
  nome completo da integração.
- O selo de disponibilidade saiu da linha de metadados e virou um badge sobre a arte,
  eliminando a repetição do nome da ferramenta dentro do card.
- Os acentos deixaram de se chamar `orange`/`blue`/`stone`: os nomes agora descrevem o
  papel (`action`, `cool`, `amber`, `neutral`), porque `orange` já renderizava azul.

### Progresso de segundo plano que realmente funciona

- **Causa raiz:** o host lia o *stderr* do yt-dlp procurando progresso, mas o yt-dlp
  escreve `[download] … %` no *stdout*. Nenhum evento de progresso chegava; a fila
  ficava parada em 0%. Agora o stdout é lido linha a linha e o stderr é drenado numa
  thread — invertido em relação ao que estava, e sem risco de encher o pipe.
- Downloads de vídeo deixaram de usar `--recode-video mp4`, que reencodava o arquivo
  inteiro mesmo quando desnecessário e fazia a tarefa parecer travada. Agora a seleção
  de formato prefere trilhas compatíveis e usa `--merge-output-format mp4`: junta sem
  reencodar no caminho comum.
- Mensagens novas para as fases pós-download: `[Merger]` e `[VideoRemuxer]` viram
  "Juntando vídeo e áudio…" e "Ajustando o contêiner…".
- Uma tarefa começa com progresso `null`, não `0`. Enquanto a ferramenta não reporta
  percentual, a barra é indeterminada e o rótulo é só "Executando" — o produto não
  inventa número.
- A linha da fila passou a mostrar a mensagem viva do host, não só ao terminar.

### Posição do card e física da faixa

- **Causa raiz da queixa "o card está colado no canto":** `scroll-snap-align: start`
  alinha o card à borda do scrollport, ignorando a calha de 32 px. A faixa com overflow
  nascia com `scrollLeft = 32` e o card ficava deslocado do cabeçalho. Resolvido com
  `scroll-padding-inline` na faixa; agora cabeçalho e card compartilham a mesma margem
  em qualquer posição de rolagem.
- O momentum passou a escolher a borda de card mais próxima do ponto projetado, em vez
  de parar onde a inércia acabar. Um arremesso nunca mais estaciona um card pela metade.
- Rubber-band nas duas pontas, projeção de desaceleração da Apple e entrega da
  velocidade de soltura para uma mola criticamente amortecida.
- Setas somem quando a faixa não transborda e desabilitam em cada extremidade.
- Se a janela estiver com os quadros de animação suspensos, a rolagem salta para o
  destino em vez de deixar o controle morto.

### Apple Design aplicado

- Molas criticamente amortecidas (response 0,3–0,4 s) no lugar de durações fixas;
  bounce só depois de gesto com momentum.
- O painel sai pelo mesmo caminho por onde entrou, materializando e dissolvendo com
  desfoque e escala em vez de um fade plano.
- Borda de rolagem: a barra superior só ganha um limite quando há conteúdo por baixo.
- Um diálogo modal escurece o fundo; o painel paralelo apenas se separa dele. Nenhuma
  superfície translúcida clara empilhada sobre outra — o que estava acontecendo no tema
  claro e destruía a legibilidade do plano de instalação.
- Tracking específico por tamanho e hierarquia por peso, tamanho e entrelinha juntos.
- A troca de tema suspende as transições por um quadro, porque superfícies com tempos
  diferentes rasgavam a imagem no meio da troca.

### Evidência

- 22 testes de domínio, 38 de UI e 11 Rust aprovados.
- TypeScript estrito, build Vite, manifesto e auditoria de 27 capacidades aprovados.
- `npm run tauri:build` gerou `toolhaven.exe`, MSI e NSIS.
- Alinhamento verificado no preview: cabeçalho e card em 244 px nas três faixas, e a
  seta "próximos" para em 612 px — exatamente uma borda de card.
- Ícone conferido em 256, 96, 64, 48, 32 e 16 px, claro e escuro.

## Incremento — fila de segundo plano, tema e correções de UI

Status: concluído em 2026-09-06.

### Fila e progresso deixaram de morrer com o painel

- A execução saiu do `ToolPanel` e passou para um runner de aplicação
  (`apps/desktop/src/hooks/useOperationRunner.ts`) sobre a fila de sessão
  (`apps/desktop/src/domain/job-queue.ts`).
- O host recebe um `jobId` por operação e o devolve em cada evento `operation-progress`.
  Assim o progresso é endereçado a uma entrada específica da fila, não a `toolId + operationId`.
- O listener de progresso vive no nível do app. Fechar a ferramenta não cancela, não
  esconde e não perde a tarefa: ela continua na Fila com o progresso real.
- A Fila lista as operações em execução; o Histórico lista concluídas **e** com falha,
  com a mensagem devolvida pelo host e o caminho de saída produzido.
- O item “Fila” da navegação mostra a contagem de operações em andamento.
- O painel virou espelho da fila: ele não guarda mais estado de execução próprio e
  reexibe o progresso da tarefa que iniciou.

Limite honesto: cancelamento continua não implementado, e a fila ainda é de sessão —
reiniciar o app perde a lista.

### Tema claro e alternância

- Tokens de cor completos para claro e escuro em `apps/desktop/src/styles/app.css`.
  Nenhuma regra abaixo dos blocos de token usa cor literal.
- Preferência `sistema | claro | escuro`, persistida em `localStorage` e aplicada como
  `data-theme` + `color-scheme` no elemento raiz.
- `@media (prefers-color-scheme: light)` cobre o intervalo antes de o React montar,
  evitando piscar escuro em um Windows configurado como claro.
- O controle aparece na barra superior e, com rótulos, em Ajustes.

### Correções de UI/UX

- Ajustes deixou de ser um placeholder: traz o controle de tema e a lista explícita do
  que ainda não existe, em vez de uma frase genérica.
- No host nativo, a escolha de arquivos usa um botão que abre o diálogo do Windows. O
  `input type="file"` só é usado na prévia web, porque no WebView ele devolve apenas o
  nome do arquivo, nunca um caminho utilizável.
- Barras de progresso passaram a declarar `aria-valuemin`/`aria-valuemax`; o painel e as
  linhas da fila expõem `role="progressbar"` com rótulo.
- O painel lateral ganhou um scrim clicável, com o mesmo efeito de `Escape`.
- `.placeholder-view__line` era um `span` inline dentro de um cabeçalho em bloco e
  colapsava para altura zero; agora é declarado como bloco.
- Os textos duplicados no cabeçalho e no estado vazio da Fila/Histórico foram separados.
- O bloco de sobrescritas acumuladas no fim do CSS foi dissolvido nas regras reais.
- Resultado com arquivo gerado mostra o caminho e permite copiá-lo.
- Arrastar e soltar passou a funcionar de verdade. A área tracejada da tela inicial
  prometia isso desde o começo e só abria um seletor; agora o app escuta o evento de
  drag-drop do WebView, destaca o alvo enquanto o arquivo está sobre a janela e entrega
  o caminho real. Com uma ferramenta aberta, o arquivo solto vai direto para ela.

### Evidência

- 22 testes de domínio (Node), 36 testes de UI (Vitest) e 10 testes Rust aprovados.
- `cargo test -- --include-ignored`: as 28 operações do catálogo executaram contra as
  ferramentas reais instaladas no Windows.
- TypeScript estrito sem erros; build Vite aprovado.
- `npm run validate:tools` e `npm run audit:capabilities` (27 capacidades) aprovados.
- `npm run tauri:build` gerou executável, MSI e NSIS para Windows x64.
- Aceitação visual dos dois temas em 1440 × 900 e 375 × 812.

## Incremento — primeiro ícone e ajustes de execução

Status: concluído em 2026-09-06.

- Downloads do yt-dlp passaram a usar o cliente `web_embedded`, evitando o HTTP 403 que
  o cliente padrão retornava.
- O upscale do libvips usa Lanczos3 e rejeita fatores menores ou iguais a 1×.
- O ícone do aplicativo foi refeito em grafite, azul-claro e âmbar, e a mesma marca é
  usada na barra lateral.

## Incremento — execução nativa real

Status: concluído em 2026-09-05.

- O host Tauri expõe somente `execute_operation` e `detect_available_tools`; não há shell arbitrário vindo da UI.
- Adaptadores Rust executam FFmpeg/ffprobe, yt-dlp/Deno, qpdf, libvips, jq, yq, ripgrep, fd, 7-Zip e Pandoc por arrays de argumentos.
- O painel usa os diálogos nativos do Windows para selecionar entradas e destinos e mostra stdout, erros e saída gerada.
- A disponibilidade dos cards é detectada no host; a fila registra concluída apenas depois do processo real retornar sucesso.
- O preview web não executa operações e informa para abrir o aplicativo Windows.
- Componentes ausentes não são simulados: o diálogo exibe o plano de dependências até os artefatos versionados e hashes serem publicados.

Evidência daquele checkpoint: 22 testes de domínio, 14 testes de UI, 3 testes Rust,
TypeScript estrito, manifesto e auditoria de 27 capacidades aprovados; build Tauri
Windows x64 gerado.

## Bootstrap Windows x64 — Tauri nativo

Status: concluído em 2026-09-05.

- Rust/MSVC instalado com toolchain `stable-x86_64-pc-windows-msvc` (`rustc 1.98.1`).
- Visual Studio Build Tools 2022 e Windows SDK 10.0.26100.0 disponíveis.
- Host Tauri 2 gerado em `apps/desktop/src-tauri` com identificador próprio e licença MIT.
- `cargo check` aprovado para o host nativo.
- `npm run tauri:build` aprovado para o alvo Windows x64.
- Instaladores gerados: MSI e NSIS, além do executável release.
- Auditoria de catálogo cobre 27 capacidades, incluindo o conjunto inicial de dev tools.

A distribuição pública continua condicionada a artefatos versionados e hashes fixados.

## Incremento — fila e planos de execução

Status: concluído em 2026-09-05.

- A fila de operações possuía estados `queued`, `running` e `succeeded`; o progresso era demonstrativo naquele checkpoint.
- O Histórico passou a listar operações concluídas durante a sessão.
- O resolvedor `scripts/execution/resolve-operation-plan.mjs` traduz FFmpeg, ffprobe e qpdf
  para planos de execução com `executable + args`, sem shell arbitrário.
- Casos de conversão, extração de áudio, compressão, corte, inspeção e operações PDF têm contrato inicial.
- O painel expõe opções contextuais: CRF, início/fim, páginas, rotação e senha de PDF.

Evidência: 21 testes de domínio + 16 testes de UI passando; TypeScript e build Vite aprovados.

**Superado:** os estados da fila descritos acima foram substituídos por
`running | succeeded | failed` no incremento de 2026-09-06.

## Incremento — operações e paleta

Status: concluído em 2026-09-05.

- Cards passaram a expor operações concretas por ferramenta (PDF, imagem, mídia e inspeção).
- O painel permite escolher a operação e, no yt-dlp, informar uma URL de mídia.
- Naquele checkpoint, a execução ainda era demonstrativa, com estado de tarefa explícito e sem chamar binários reais.
- A paleta abandonou o verde.

**Superado:** a paleta descrita neste checkpoint (azul mineral `#7f9bb7` com laranja
para ação) não vale mais. A fonte de verdade é `DESIGN.md`: ação em azul `#88afff`,
estado positivo em azul-claro `#a8bfff`, âmbar para atenção e argila para erro, com
equivalentes de contraste próprio no tema claro.

Evidência: 18 testes de domínio + 15 testes de UI passando; TypeScript, build Vite e manifesto validados.

## Partes 4 e 5 — sistema visual e catálogo executável

Status: concluídas em 2026-09-05.

### Parte 4: sistema visual e shell

- Direção “bancada modular de pós-produção” registrada em `DESIGN.md`.
- Shell responsivo com navegação para ferramentas, fila, histórico e ajustes.
- Busca global por nome, ação, capacidade e extensão.
- Área de entrada por arquivo e estados vazios úteis, sem dados inventados.
- Vocabulário visual nativo do Windows com feedback imediato e reduced motion.

### Parte 5: catálogo e fluxo de ferramenta

- Cards variáveis organizados em faixas determinísticas, com arquivos/imagens/documentos agrupados para preservar densidade.
- Estado incluído, disponível, baixando e pronto refletido no próprio card.
- Plano de dependências real do domínio antes da integração do instalador.
- Contrato de cancelamento e transição para o estado pronto, mantido no domínio.
- Painel lateral para abrir uma ferramenta sem trocar de contexto.
- Layout alterna de faixas horizontais para grade vertical em janela estreita.

### Evidência

- 18 testes de domínio e 8 testes de interface aprovados.
- TypeScript em modo estrito sem erros.
- Build de produção Vite aprovado.
- Manifesto de ferramentas aprovado.
- Aceitação visual executada em 1440 × 900 e 390 × 844.
- Fluxo yt-dlp validado no navegador com Deno, FFmpeg, ffprobe e yt-dlp.
- Naquele checkpoint, nenhum download real, execução de binário ou escrita externa havia sido ativado.

## Partes 2 e 3 — instalação sob demanda

Status: concluídas em 2026-09-05.

### Parte 2: resolvedor de instalação

- Resolve dependências transitivas antes da ferramenta solicitada.
- Remove duplicatas quando ferramentas compartilham dependências.
- Ignora componentes embutidos e versões já instaladas.
- Detecta ciclos mostrando o caminho completo.
- Rejeita ferramentas pedidas fora do catálogo.
- Plano real validado para yt-dlp: Deno, FFmpeg, ffprobe e yt-dlp.

### Parte 3: estados, cancelamento e rollback

- Estado imutável separado entre disponibilidade e operação transitória.
- Fluxo coberto: resolver, baixar, verificar, instalar e ativar.
- Cancelamento preserva a versão ativa.
- Falha de atualização faz rollback lógico para a versão anterior.
- Falha na primeira instalação retorna ao estado disponível com erro diagnosticável.
- Transições inválidas e progresso fora de `0..1` são rejeitados.

### Evidência

- 18 testes passando.
- Cobertura total: 83,17% de linhas; novos módulos acima de 90%.
- Manifesto real validado depois das mudanças.
- Nenhum download, instalação global ou filesystem real foi implementado.

Os módulos Node são contratos executáveis temporários. O runtime final será Rust após
autorização explícita para instalar o toolchain.

## Parte 1 — contrato do catálogo de ferramentas

Status: concluída em 2026-09-05.

### Entregue

- Manifesto real `tooling/tools.json` para Windows x64.
- Entradas planejadas para FFmpeg, ffprobe, yt-dlp, Deno, qpdf e libvips.
- JSON Schema versionado para suporte de editor e documentação do formato.
- Validador puro sem dependências externas.
- CLI para validar o manifesto usado pelo build.
- Regras para impedir IDs duplicados, downloads sem HTTPS, hashes inválidos,
  destinos inseguros e ferramentas marcadas como empacotadas sem artefatos fixados.
- Estratégia `embedded` ou `on-demand` obrigatória por ferramenta.
- Dependências transitivas validadas contra o catálogo.
- Contrato do catálogo visual em `CARD-CATALOG.md` e ADR-0004.

### Evidência

- Na conclusão da Parte 1, 8 testes do contrato do catálogo foram aprovados.
- `npm run validate:tools`: manifesto aprovado.
- `node --check`: scripts aprovados.
- JSON Schema lido com sucesso.

## Próximo passo proposto

Portar os contratos Node de instalação para Rust e implementar o download real de
componentes, com retomada, verificação de hash, health check e ativação atômica. Isso
depende de artefatos versionados e hashes publicados no manifesto. Antes ou em paralelo,
cancelamento de operação em andamento é o buraco mais visível da fila.
