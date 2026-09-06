# Third-party licensing plan

> Planejamento técnico, não aconselhamento jurídico.

## Regra de entrada

Nenhuma ferramenta ou build pré-compilada entra no produto sem:

- projeto e URL upstream;
- versão/tag e artefato exato;
- SHA-256 e, quando houver, verificação de assinatura;
- licença do código e do artefato distribuído;
- lista de componentes transitivos e notices;
- instruções de oferta de código-fonte quando exigidas;
- decisão registrada sobre codecs/patentes relevantes.

## FFmpeg

FFmpeg é LGPL-2.1-or-later por padrão, mas opções GPL fazem o FFmpeg completo cair
sob GPL. O build distribuído precisa ser nosso ou vir de fornecedor cuja configuração
e fontes correspondentes sejam verificáveis. Para uma rota conservadora, evitar
`--enable-gpl` e `--enable-nonfree`, cumprir o checklist LGPL do projeto e documentar
quais codecs deixam de estar disponíveis.

## yt-dlp

O repositório usa Unlicense, mas os executáveis empacotados podem conter componentes
sob outras licenças. O README upstream alerta que builds PyInstaller podem ser GPLv3+.
Logo, “yt-dlp é Unlicense” não basta: o artefato escolhido e seu arquivo de terceiros
precisam ser auditados. Suporte completo ao YouTube também requer runtime JS externo;
Deno é atualmente a opção recomendada e deve ser incluído/registrado se esse fluxo
for confirmado.

## PDF e imagem

qpdf é Apache-2.0 e cobre transformação estrutural, mas não renderização. PDFium usa
licença BSD-style no core e carrega notices transitivos. libvips é LGPL-2.1-or-later.
Esses fatos tornam a combinação possível, não automaticamente compatível: o pacote
Windows exato ainda precisa de inventário.

## Saídas do pipeline

- `THIRD-PARTY-NOTICES.txt` para o núcleo e notices de cada pacote sob demanda,
  acessíveis na tela Sobre antes e depois da instalação.
- `sbom.cdx.json` no release.
- `tool-inventory.json` exibindo nome, versão, licença e site.
- Arquivos-fonte/ofertas correspondentes para componentes LGPL/GPL.
- Relatório de diferenças/configuração para builds próprios.

## Decisão que muda tudo

A licença do aplicativo ainda está aberta. Um app de portfólio público sob licença
permissiva e um produto fechado/comercial têm tolerâncias diferentes para dependências
copyleft. Definir isso antes de baixar binários para o repositório.

## Fontes

- https://ffmpeg.org/legal.html
- https://github.com/yt-dlp/yt-dlp/blob/master/README.md
- https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE
- https://github.com/qpdf/qpdf
- https://github.com/libvips/libvips
- https://github.com/chromium/pdfium/blob/main/LICENSE
