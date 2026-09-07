# Product interview

Estas perguntas estão ordenadas pelo quanto mudam arquitetura, licença e escopo.
Uma pergunta só sai daqui quando a decisão está tomada, não quando o código a
contorna.

## Respondidas

1. **Escopo inicial:** as operações citadas no pedido original, incluindo dev tools,
   mídia, imagens, PDFs, downloads, vídeo e conversão ampla. A entrega é fatiada por
   fluxos verticais para não transformar “universal” em uma promessa não testada.
2. **Licença e repositório:** repositório público; código próprio sob MIT.
3. **Primeira plataforma:** somente Windows x64. ARM64 fica para uma fase posterior.
4. **Tamanho:** não há limite rígido, mas ferramentas pesadas não entram no instalador
   inicial — são baixadas dentro do app.
5. **yt-dlp na v1:** entra como download sob demanda. O app resolve também Deno,
   FFmpeg/ffprobe e outras dependências declaradas.
6. **Linguagem visual:** cards dinâmicos e faixas inspiradas no comportamento de
   descoberta da Netflix e do Fortnite, com interação orientada pelos princípios do
   Apple Design. Sem verde na paleta.
7. **Nome:** ToolHaven. `Unified Toolkit Desktop` continua sendo apenas o slug do
   diretório e do pacote npm.
8. **Tema:** claro e escuro, com opção “sistema” como padrão e escolha persistida
   localmente. Decidido e implementado em 2026-09-06.
9. **Entrega das ferramentas:** híbrida, confirmada em 2026-09-07. O usuário **nunca**
   instala nada por fora: ferramentas leves vêm no instalador, pesadas são baixadas pelo
   próprio app. Instalador de ~15 MB em vez de ~1 GB.
10. **OCR / Tesseract:** fica de fora. A regra “sem IA” continua valendo ao pé da letra,
    mesmo custando extração de texto em PDFs escaneados.

## Decididas de fato pelo código, ainda não ratificadas

Estas são o estado atual da implementação. Se a resposta for outra, o custo de mudar
ainda é baixo — por isso continuam listadas.

11. **Idioma da interface:** decidido em 2026-09-07 — a interface, as mensagens do host
    e o README são em inglês. Não há infraestrutura de i18n, então uma segunda língua
    seria reescrever cada string. Os documentos em `docs/` seguem em português.
12. **Ponto de partida do fluxo:** o catálogo é a rota principal e “escolher arquivo
    primeiro” é um atalho opcional na tela inicial. A recomendação anterior era o
    inverso; a implementação seguiu o catálogo por causa dos estados de instalação.

## Ainda bloqueiam decisões de release

13. **Usuário principal além de você:** público geral, creators, developers ou power
    users? Escolher um evita uma UI que tenta servir todos e não serve ninguém.
14. **Persistência de fila e histórico:** hoje ambos são de sessão e se perdem ao
    reiniciar. Recomendo persistir só metadados, com botão para limpar e retenção
    configurável. Isso define se o SQLite entra agora ou depois.
15. **Cancelamento:** a fila não cancela nada. Encerrar uma árvore de processos no
    Windows exige Job Objects e uma regra de limpeza por operação. Isso é escopo de
    engenharia, mas a expectativa de produto precisa ser confirmada: cancelar é
    requisito de v1?
16. **Atualização do app shell:** auto-update assinado ou apenas aviso levando ao novo
    instalador? Os componentes pesados já têm atualização interna confirmada.

## Marca e apresentação

17. Que produtos devem parecer parentes de qualidade, sem serem copiados?
18. O portfólio deve destacar engenharia de integração, experiência do usuário ou os
    dois com o mesmo peso?
19. Prefere **comp-first** (imagem de referência antes do código; mais ousado e lento)
    ou **code-first** (v0 executável cedo; mais enxuto)? Na prática o projeto vem
    seguindo code-first.

## Limites legais e éticos

20. Downloads autenticados/cookies entram? Recomendo não no MVP.
21. O produto será apenas portfólio, release gratuito público ou há intenção comercial?
22. Você aceita excluir codecs/formatos quando a distribuição é juridicamente ambígua?
