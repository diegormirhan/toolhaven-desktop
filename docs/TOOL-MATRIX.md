# Tool matrix

> Candidatos, não dependências aprovadas. Cada linha precisa passar por revisão de
> licença, origem do binário, tamanho e teste antes de entrar no manifesto real.

| Área | Ferramenta candidata | Papel | Entrega | Estado inicial | Observação |
|---|---|---|---|---|---|
| Vídeo/áudio | FFmpeg + ffprobe | transcode, remux, trim, metadata, thumbnails | Sob demanda | MVP | Build e codecs determinam LGPL/GPL e risco de patentes |
| Download | yt-dlp | extração e download de mídia | Sob demanda | MVP | Executável oficial inclui componentes com licenças adicionais |
| Runtime yt-dlp | Deno | resolver desafios JS do YouTube | Dependência sob demanda | MVP | Recomendado pelo upstream; fixar versão compatível |
| Imagem | libvips CLI | resize, crop, convert, compress, batch | Sob demanda | spike | Rápido e econômico; distribuição Windows inclui DLLs |
| Imagem simples | Rust `image` | operações pequenas sem processo externo | Embutida | avaliar | Menor bundle, mas cobertura de formatos é mais estreita |
| PDF estrutural | qpdf | merge, split, rotate, encrypt, linearize | Embutida inicialmente | MVP | Apache-2.0; não renderiza nem extrai texto |
| PDF render | PDFium | preview e rasterização | A decidir | spike | BSD-style no core, com notices transitivos a auditar |
| Metadados | ExifTool | leitura/edição ampla | Sob demanda | pós-MVP | Perl Artistic/GPL; empacotamento e notices precisam revisão |
| Arquivos | 7-Zip | compactar/extrair | Embutida se o pacote continuar leve | pós-MVP | LGPL com restrição separada no código unRAR |
| Documentos | LibreOffice headless | Office ↔ PDF/formatos abertos | Sob demanda | futuro | Muito grande; fidelidade varia; distribuição complexa |
| Conversão texto | Pandoc | documentos markup e ebooks | Sob demanda | futuro | GPL; impacto da redistribuição precisa de parecer jurídico |
| Checksums | Rust nativo | hash e verificação | Embutida | pós-MVP | Não precisa de sidecar |
| JSON/YAML | Rust nativo | formatar, validar, converter | Embutida | pós-MVP | “Dev tools” precisa de definição de usuário |

## Dev tools incluídas no catálogo inicial

O catálogo agora reserva cards para `jq` (JSON), `yq` (YAML), `ripgrep` (busca),
`fd` (localização de arquivos), Deno (runtime do yt-dlp), 7-Zip (compactação) e
Pandoc (conversão de documentos). Todas entram como `planned` até versões, artefatos,
hashes e notices serem fixados; isso evita prometer uma instalação embutida sem os
metadados de distribuição aprovados.

## Candidatos validados em 2026-09-07

Cada linha abaixo teve licença, origem e disponibilidade de build Windows conferidas
nas fontes upstream na data indicada. Todas as cinco foram **integradas em 2026-09-07**:
têm card, adaptador Rust com argv tipado, operações no painel e teste de contrato.

As cinco rodaram contra o binário real: o sweep de contrato executa cada operação sobre
fixtures geradas e passou em todas. Quando uma ferramenta não está instalada, o teste a
pula e **nomeia o que não verificou** em vez de fingir aprovação; e o app não mente sobre
ela — sem o binário, o card mostra “Ver disponibilidade”, não “Abrir”.

### Aprovadas para o manifesto

| Ferramenta | Operações integradas | Licença verificada | Contrato real |
|---|---|---|---|
| ExifTool 13.59 | ler metadados, remover metadados, definir título | `Artistic-1.0-Perl OR GPL-1.0-or-later` (“same terms as Perl itself”) | ✅ verificado |
| Poppler 25.07 | extrair texto, página como imagem | `GPL-2.0-only OR GPL-3.0-only` | ✅ verificado |
| Oxipng 10.1.1 | otimizar PNG sem perdas | `MIT` | ✅ verificado |
| MKVToolNix 100 | converter para MKV, inspecionar faixas | `GPL-2.0-or-later` | ✅ verificado |
| ImageMagick 7.1.2 | converter formato, converter para cinza, inspecionar | `ImageMagick` (permissiva, exige atribuição e cópia da licença) | ✅ verificado |

Instaladas nesta máquina com:

```powershell
winget install -e --id Shssoichiro.Oxipng
winget install -e --id MoritzBunkus.MKVToolNix
winget install -e --id oschwartz10612.Poppler
```

Ressalvas que precisam virar tarefa antes de qualquer uma passar a `bundled`:

- **Poppler e MKVToolNix são GPL.** ToolHaven os invoca como processos separados, com
  array de argumentos, sem linkagem — a posição usual de agregação. Ainda assim os dois
  entram apenas como pacote sob demanda, com oferta de código correspondente.
- **A distribuição Windows do ImageMagick embute delegates** com licenças próprias.
  A licença do ImageMagick ser permissiva não basta: o inventário do artefato exato
  precisa ser feito antes de fixar hash.
- **ExifTool é Perl empacotado.** O executável Windows carrega um interpretador; os
  notices desse empacotamento precisam entrar junto.
- **Xpdf não é Poppler.** O `pdftotext.exe` que aparece no PATH de muitas máquinas vem
  do Git for Windows e é o Xpdf 4.06, um projeto diferente com licenciamento comercial
  próprio — e, com o Poppler instalado, ele **continua vindo antes no PATH**. Por isso a
  detecção usa `pdftoppm.exe`, que o Xpdf não distribui, e todos os comandos do Poppler
  são resolvidos no diretório dessa instalação, nunca por PATH.
- **O instalador do MKVToolNix não mexe no PATH.** Ele fica em
  `%ProgramFiles%\MKVToolNix`, que passou a ser um diretório conhecido do host.

### Dev tools adicionadas em 2026-09-07

Todas de licença permissiva, binário Windows oficial, instaladas via winget e verificadas
pelo sweep de contrato. Todas são **somente leitura**: escrevem em stdout, nunca em disco,
então não têm destino nem risco de sobrescrever um arquivo.

| Ferramenta | Lacuna que fecha | Licença | Comando |
|---|---|---|---|
| Miller 6.20 | CSV, TSV e JSON — o catálogo não tinha nada tabular | `BSD-2-Clause` | `mlr.exe` |
| Difftastic 0.70 | comparar dois arquivos pela sintaxe, não por linha | `MIT` | `difft.exe` |
| tokei 12.1 | estatística de código por linguagem | `MIT OR Apache-2.0` | `tokei.exe` |
| hexyl 0.17 | ver os bytes de um arquivo desconhecido | `MIT OR Apache-2.0` | `hexyl.exe` |
| Dust 1.2 | descobrir o que ocupa espaço em disco | `Apache-2.0` | `dust.exe` |

```powershell
winget install -e --id Miller.Miller
winget install -e --id Wilfred.difftastic
winget install -e --id XAMPPRocky.Tokei
winget install -e --id sharkdp.hexyl
winget install -e --id bootandy.dust
```

Notas:

- **tokei sem serialização.** O binário pré-compilado é publicado sem os formatos de
  serialização, então `--output json` não funciona. O adaptador usa a saída em tabela.
- **Difftastic exige dois arquivos.** É a primeira operação do catálogo com essa forma;
  o host recusa antes de iniciar o processo e o painel só habilita "Executar" com dois.

### Como cada ferramenta chega ao usuário (2026-09-07)

O usuário nunca instala nada por fora. Ou a ferramenta vem no instalador, ou o próprio
app a baixa.

| Canal | Ferramentas |
|---|---|
| **No instalador** (9) | jq, yq, ripgrep, fd, Miller, tokei, hexyl, Dust, Oxipng |
| **Baixadas pelo app** (9) | FFmpeg, ffprobe, yt-dlp, Deno, qpdf, libvips, Poppler, Pandoc, Difftastic |
| **Sem artefato fixado** (4) | 7-Zip, MKVToolNix, ImageMagick, ExifTool |

Por que as quatro últimas ainda não entram no canal automático:

| Ferramenta | Obstáculo |
|---|---|
| 7-Zip | Distribuída como instalador NSIS `.exe` ou como `.7z`. Extrair um `.7z` exige o próprio 7-Zip — o app precisaria dele para instalá-lo. |
| MKVToolNix | Mesmo caso: instalador `.exe` ou portátil `.7z`. |
| ImageMagick | O GitHub publica só um `.7z` de 728 MB. O `.zip` portátil não tem URL versionada que resolva. |
| ExifTool | O `exiftool.org` mantém apenas a versão corrente no ar, então não há URL versionada estável para fixar. O SourceForge tem, mas por trás de redirecionamento de espelho. |

Nenhuma delas é bloqueio de licença — é formato de distribuição. Resolver exige ou
suporte a `.7z` e NSIS no instalador de componentes, ou reempacotar os artefatos em um
canal próprio, o que traz responsabilidade de redistribuição.

**Sobre o FFmpeg:** o projeto não publica binários para Windows. Está fixado o build
**LGPL** do `BtbN/FFmpeg-Builds`, na tag datada `autobuild-2026-09-06-13-06`, que é
imutável — a tag `latest` do mesmo repositório é rolante e não serve para fixar. A
variante LGPL é a rota conservadora que o `LICENSING.md` recomenda: evita `--enable-gpl`
ao custo de alguns codecs.

### Reprovadas, com o motivo

| Ferramenta | Por que não entra |
|---|---|
| Ghostscript | AGPL-3.0 com licenciamento comercial paralelo da Artifex, que trata distribuição junto a aplicativo não-AGPL como violação e declara que age judicialmente. Incompatível com um app MIT que instala o componente para o usuário. Só entraria se o ToolHaven inteiro virasse AGPL. |
| Tesseract | Licença Apache-2.0 não é o problema. O motor das versões 4 e 5 é uma rede neural LSTM, e `PRODUCT.md` diz que o produto não usa IA; o roadmap lista “OCR neural” fora de escopo. Reprovada por produto, não por licença. |
| pngquant | GPL-3.0-or-later com licença comercial oferecida explicitamente para uso em aplicativos não-GPL. Mesmo com fronteira de processo, o upstream enquadra esse uso como caso comercial — exatamente a ambiguidade jurídica que `LICENSING.md` manda evitar. Fica retida até haver parecer. |
| hyperfine | Licença MIT/Apache-2.0 sem problema. O que reprova é a função: hyperfine mede o tempo de **comandos de shell arbitrários** fornecidos pelo usuário. Integrá-lo seria oferecer execução arbitrária de shell pela interface, exatamente o que a ADR-0002 e o modelo de segurança proíbem. |

### Fontes conferidas

- Miller: https://github.com/johnkerl/miller
- Difftastic: https://github.com/Wilfred/difftastic
- tokei: https://github.com/XAMPPRocky/tokei
- hexyl: https://github.com/sharkdp/hexyl
- Dust: https://github.com/bootandy/dust
- hyperfine: https://github.com/sharkdp/hyperfine
- ExifTool: https://exiftool.org/ e https://github.com/exiftool/exiftool
- Poppler: https://poppler.freedesktop.org/ e https://github.com/oschwartz10612/poppler-windows
- Oxipng: https://github.com/oxipng/oxipng
- MKVToolNix: https://mkvtoolnix.download/
- ImageMagick: https://imagemagick.org/license/
- Ghostscript: https://ghostscript.com/licensing/ e https://artifex.com/licensing
- Tesseract: https://github.com/tesseract-ocr/tesseract
- pngquant: https://github.com/kornelski/pngquant

## Perfis de capacidade recomendados

### Media

- Converter contêiner/formato.
- Extrair áudio.
- Comprimir por alvo simples (qualidade/tamanho aproximado).
- Cortar sem reencode quando possível; explicar quando reencode é necessário.
- Inspecionar streams e metadados.

### Images

- Resize por dimensões, percentual ou limite.
- Crop manual e presets de proporção.
- Conversão em lote com política de conflito.
- Compressão com preview estimado.
- Upscale clássico (Lanczos); sem promessa de “recuperar detalhes”.

### PDFs

- Merge, split, reorder, rotate, extract pages.
- Optimize/linearize e compressão quando aplicável.
- Add/remove password quando autorizado pelo documento.
- Preview com renderer separado da ferramenta estrutural.

### Downloads

- URL pública, metadados, escolha de vídeo/áudio e destino.
- Fila, limite de concorrência e progresso.
- Cookies/autenticação somente se explicitamente aprovados depois.
- Mensagem clara sobre responsabilidade do usuário e termos do site.

## O que não prometer

- “Qualquer arquivo” sem matriz de entrada/saída testada.
- Compressão para tamanho exato em uma única passada.
- Upscale com ganho real de detalhe sem IA.
- Remoção de DRM, bypass de acesso ou download de conteúdo não autorizado.
- Fidelidade perfeita de documentos proprietários.

## Fontes verificadas

- FFmpeg legal: https://ffmpeg.org/legal.html
- yt-dlp license/readme: https://github.com/yt-dlp/yt-dlp
- yt-dlp EJS: https://github.com/yt-dlp/yt-dlp/wiki/EJS
- libvips: https://github.com/libvips/libvips
- qpdf: https://github.com/qpdf/qpdf
- PDFium: https://github.com/chromium/pdfium
