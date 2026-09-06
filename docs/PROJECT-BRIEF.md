# Project brief

## Problema

No Windows, tarefas simples como extrair áudio, reduzir uma imagem, juntar PDFs,
inspecionar metadados ou converter um arquivo frequentemente exigem descobrir uma
ferramenta, instalar dependências, lidar com PATH e aprender flags diferentes.

## Proposta

Um aplicativo local que organiza essas capacidades por intenção do usuário. O núcleo
traz ferramentas leves e oferece instalação interna para componentes maiores. Tudo
mantém uma linguagem comum para entrada, saída, presets, progresso, cancelamento,
erros e histórico.

## Não é

- Um editor profissional completo de vídeo, imagem ou PDF.
- Um terminal disfarçado.
- Uma plataforma de plugins arbitrários na primeira versão.
- Uma promessa de converter qualquer formato com fidelidade perfeita.
- Um produto de IA.

## Hipótese de MVP recomendada

Um primeiro lançamento deve provar quatro fluxos verticais:

1. **Mídia:** converter vídeo/áudio, extrair áudio e comprimir vídeo.
2. **Imagem:** resize, crop, compressão e conversão em lote.
3. **PDF:** juntar, separar, rotacionar, comprimir e proteger/desproteger quando
   permitido pelo arquivo.
4. **Download:** baixar mídia pública com escolha de formato e progresso.

Arquivos compactados, OCR, documentos Office, automações e “dev tools” entram
depois que o núcleo de jobs e empacotamento estiver comprovado.

## Níveis de suporte

- **Garantido:** combinação coberta por fixtures, teste e mensagem de erro própria.
- **Experimental:** ferramenta aceita, mas há variação conhecida de fidelidade.
- **Não suportado:** formato reconhecido; o app explica a limitação sem tentar uma
  conversão destrutiva.

## Critérios de sucesso do MVP

- Instalação limpa em uma VM Windows sem dependências de desenvolvimento.
- Uma ferramenta pesada pode ser descoberta, baixada, verificada, instalada e aberta
  sem sair do aplicativo.
- Quatro fluxos verticais concluídos sem terminal.
- Cancelamento não deixa saída parcial com nome final.
- Erros mostram ação útil e preservam o arquivo original.
- Cada binário distribuído aparece em “Sobre > Componentes de código aberto”.
- Build reproduzível gera instalador, hashes, SBOM e avisos de terceiros.

## Riscos principais

1. Escopo infinito de formatos e ferramentas.
2. Downloads interrompidos, armazenamento duplicado e updates de tool packs.
3. Licenças transitivas dos builds prontos, especialmente FFmpeg e yt-dlp.
4. Antivírus/SmartScreen em binários pouco reputados ou não assinados.
5. Mudanças frequentes em sites suportados pelo yt-dlp.
6. Fidelidade limitada em formatos proprietários de documentos.
