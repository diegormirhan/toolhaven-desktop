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
