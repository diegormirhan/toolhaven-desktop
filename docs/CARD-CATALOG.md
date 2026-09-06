# Dynamic tool catalog

## Intenção

O catálogo deve ter a facilidade de descoberta por faixas associada à Netflix e o
peso visual dos tiles associados ao Fortnite, adaptados a uma ferramenta desktop.
O card não é decoração: ele é a porta de entrada, o status de instalação e a ação
primária de cada ferramenta.

## Estrutura da primeira tela

1. **Continue de onde parou:** jobs recentes ou ferramentas usadas recentemente.
2. **Instaladas:** ferramentas prontas, fixadas primeiro.
3. **Mídia e downloads:** vídeo, áudio e yt-dlp.
4. **Arquivos, imagens e documentos:** resize, crop, compressão, conversão e PDFs.
5. **Dev tools:** utilidades leves, prioritariamente nativas e imediatamente abertas.
6. **Todas:** catálogo pesquisável e filtrável.

A ordem é determinística: fixados, atividade recente e ordem editorial do manifesto.
Não existe recomendação por IA, perfil oculto ou feed remoto personalizado.

## Tipos de card

- **Featured:** uma capacidade ou fluxo em destaque; no máximo um por viewport.
- **Tool:** card padrão que representa uma ferramenta específica.
- **Compact:** utilidade leve e frequente, adequada a uma faixa mais densa.
- **Active job:** variante transitória com progresso e ação de abrir a fila.

Variação de tamanho cria ritmo, mas a navegação usa uma grade previsível. Evitar
masonry irregular, porque torna teclado, redimensionamento e memória espacial frágeis.

## Conteúdo mínimo

- Nome direto da ferramenta.
- Resultado que ela produz, em uma linha.
- Estado de disponibilidade.
- Tamanho de download quando aplicável.
- Ação primária contextual.
- Selo discreto para “Incluída”, “Download” ou “Atualização”.

Licença e dependências aparecem no detalhe/instalação, não poluem todos os cards.

## Máquina de estados do card

```text
embedded ───────────────────────────────────────────────► open

available ► resolving ► downloading ► verifying ► installing ► ready ► open
                 │            │             │          │
                 └────────────┴─────────────┴──────────┴──► failed ► retry

ready ► update_available ► updating ► ready
```

- `embedded`: ação “Abrir”.
- `available`: ação “Baixar”, com tamanho visível.
- `resolving`: calcula dependências e espaço; skeleton curto, sem spinner solto.
- `downloading`: progresso real, velocidade opcional, pausar/cancelar se suportado.
- `verifying`: progresso indeterminado honesto; não inventar percentual.
- `installing`: desabilita apenas ações conflitantes, nunca toda a interface.
- `ready`: ação vira “Abrir” no mesmo lugar.
- `failed`: motivo curto, “Tentar novamente” e detalhes técnicos expansíveis.

## Interação e movimento

- Resposta visual começa no pointer-down.
- Hover/focus eleva e amplia discretamente em uma camada sobreposta, sem reflow.
- A expansão nasce do próprio card e retorna pelo mesmo caminho.
- Movimento padrão: spring sem overshoot, resposta de 300–400 ms.
- Carrossel por arrasto: tracking 1:1, captura do ponteiro, projeção de momentum e
  rubber-banding no começo/fim.
- Setas do teclado movem por cards; Enter abre/instala; Escape fecha o detalhe.
- O card pode ser interrompido e revertido durante a animação.
- `prefers-reduced-motion`: substitui escala/deslocamento por cross-fade curto.
- High contrast: borda de foco definida; estado nunca depende apenas de cor.

## Layout responsivo para desktop

- Janela larga: featured + faixas horizontais com cards parcialmente visíveis na borda.
- Janela média: faixas com menos cards e featured reduzido.
- Janela estreita: grade vertical; nenhuma rolagem horizontal obrigatória.
- Densidade configurável no futuro, sem mudar hierarquia ou terminologia.

## Performance

- Imagens e previews locais com lazy loading.
- Virtualizar apenas catálogos grandes; não pagar complexidade antes da necessidade.
- Animar `transform` e `opacity`; não animar layout de dezenas de cards.
- Desmontar previews pesados fora da área visível.
- Estado de download vem de uma fonte única no backend, refletido em todos os cards.

## Limites de referência

- Não reproduzir identidade, artes, tipografia ou paleta de Netflix/Fortnite.
- Não autoplay de vídeo no catálogo.
- Não transformar ferramentas em “conteúdo infinito”.
- Não esconder busca, instalação ou fila para favorecer impacto visual.
- Não mover cards automaticamente enquanto o usuário navega.
