# Product interview

Estas perguntas estão ordenadas pelo quanto mudam arquitetura, licença e escopo.

## Respondidas

1. Escopo inicial: as operações citadas no pedido original, incluindo dev tools,
   mídia, imagens, PDFs, downloads, vídeo e conversão ampla. A entrega será fatiada
   por fluxos verticais para não transformar “universal” em uma promessa não testada.
2. Repositório público; código próprio sob MIT.
3. Primeira plataforma: somente Windows x64. ARM64 fica para uma fase posterior.

## Ainda bloqueiam decisões de release

4. Não há limite rígido de tamanho, mas ferramentas pesadas não entram no instalador
   inicial: são baixadas dentro do app.
5. yt-dlp aparece na primeira versão como download sob demanda. O app resolve também
   Deno, FFmpeg/ffprobe e outras dependências declaradas.
6. A interface usa cards dinâmicos e faixas inspiradas no comportamento de descoberta
   da Netflix e do Fortnite, com interação orientada pelos princípios do Apple Design.

## Produto e experiência

6. Quem é o usuário principal além de você: público geral, creators, developers ou
   power users? Escolher um evita uma UI que tenta servir todos e não serve ninguém.
7. Português primeiro, inglês primeiro ou interface bilíngue desde v1?
8. O app deve privilegiar “soltar arquivo e sugerir ações” ou “escolher ferramenta e
   depois entradas”? Recomendo o primeiro com catálogo como rota secundária.
9. O histórico deve persistir após reiniciar? Recomendo sim, só metadados, com botão
   para limpar e retenção configurável.
10. O app shell deve se atualizar automaticamente ou apenas avisar e levar ao novo
    instalador? Os componentes pesados já têm atualização interna confirmada.

## Marca e apresentação

11. Já existe nome? `Unified Toolkit Desktop` é apenas slug de trabalho.
12. Que produtos devem parecer parentes de qualidade, sem serem copiados?
13. O portfólio deve destacar engenharia de integração, experiência do usuário ou os
    dois com o mesmo peso?
14. Prefere **comp-first** (imagem de referência antes do código; mais ousado e lento)
    ou **code-first** (v0 executável cedo; mais enxuto)?

## Limites legais e éticos

15. Downloads autenticados/cookies entram? Recomendo não no MVP.
16. O produto será apenas portfólio, release gratuito público ou há intenção comercial?
17. Você aceita excluir codecs/formatos quando a distribuição é juridicamente ambígua?
