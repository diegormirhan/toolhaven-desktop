# Product

<!-- impeccable:product-schema 1 -->

> Registro inicial inferido do pedido explícito. Itens marcados como hipótese ou
> decisão aberta ainda não foram confirmados pelo dono do produto.

## Platform

web

O valor acima descreve a superfície renderizada em WebView conforme o schema da
skill. O produto distribuído é um aplicativo desktop nativo para Windows via Tauri.

## Stack

Tauri 2 + Rust no host, React + TypeScript + Vite na UI e SQLite local.

## Users

Hipótese: pessoas que usam Windows e alternam frequentemente entre sites,
instaladores e CLIs para converter, inspecionar ou manipular arquivos. O autor do
projeto é o primeiro usuário e quer também apresentar o trabalho em portfólio.

## Product Purpose

Oferecer uma única instalação para operações recorrentes de mídia, imagem, PDF,
downloads, arquivos e utilidades técnicas, usando ferramentas abertas existentes
em vez de reimplementar codecs e formatos.

Sucesso inicial: uma pessoa instala o app, abre ferramentas leves imediatamente e
instala ferramentas pesadas sem sair do aplicativo. Depois acompanha o progresso,
cancela com segurança e encontra o arquivo de saída sem usar terminal.

## Positioning

Uma bancada local orientada a tarefas, não uma coleção de CLIs expostas. Cada
ferramenta é traduzida em uma operação coerente, com presets, previsão da saída,
progresso, histórico e erros compreensíveis.

## Operating Context

- Windows desktop.
- Arquivos locais e operações potencialmente longas ou em lote.
- Alguns fluxos usam rede por natureza, especialmente downloads e atualizações.
- O produto não usa IA.
- O instalador inclui o núcleo e ferramentas leves.
- Ferramentas pesadas são baixadas, verificadas e instaladas dentro do app sob demanda.

## Capabilities and Constraints

Confirmado: Tauri como builder; integração de ferramentas abertas; FFmpeg, yt-dlp,
PDFs, imagens, vídeos, conversão de formatos e as utilidades de desenvolvimento
cobradas no pedido inicial; sem IA. A primeira versão terá somente Windows x64.

O repositório será público e o código próprio usará MIT. Isso não altera as licenças
dos componentes de terceiros, que continuam registradas individualmente.

Decisões abertas: decomposição da lista ampla em fatias entregáveis; política de
atualização; suporte a formatos proprietários; telemetria; nome e idioma inicial da
interface. Não há limite rígido de tamanho, mas o instalador inicial deve permanecer
leve porque componentes pesados não vêm nele.

yt-dlp entra na primeira versão como instalação sob demanda. Ao escolhê-lo, o app
também instala automaticamente Deno e os componentes de mídia necessários.

“Aumentar resolução” sem IA significa upscale por reamostragem de alta qualidade.
Ele aumenta dimensões, mas não recupera detalhes inexistentes.

## Evidence on Hand

- Pedido original do produto.
- `Diego.md` foi lido somente como contexto de colaboração; não é requisito nem
  foi copiado para o projeto.
- Não há ainda marca, logo, métricas, pesquisa com usuários ou referência visual.
  Trabalho futuro não deve inventar esses elementos.

## Product Principles

1. Um único app gerencia instalações; nenhuma configuração externa obrigatória.
2. Local por padrão e transparente quando houver acesso à rede.
3. Tarefas, não flags: a interface fala o idioma do resultado desejado.
4. Controle e recuperação: prévia, cancelamento, histórico e saídas atômicas.
5. Integrações substituíveis e auditáveis, com versão, hash e licença registrados.
