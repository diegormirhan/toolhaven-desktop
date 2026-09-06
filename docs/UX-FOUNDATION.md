# UX foundation

## Status

Fundação provisória; não é `DESIGN.md`. O sistema visual final depende de aprovação
do usuário e só será documentado depois de existir na implementação.

## Design Read provisório

```yaml
artifact: Windows desktop utility
audience: power users, creators and developers who want common file jobs without CLI setup
visual-language: precise native-feeling workbench, calm rather than decorative
mode: greenfield / operate
visual-variance: 4/10
motion-intensity: 3/10
information-density: 7/10
asset-dependence: 2/10
brand-fidelity: 1/10 (brand not defined)
```

## Modelo de navegação proposto

- **Discover:** catálogo visual de ferramentas em cards e faixas dinâmicas.
- **Workbench:** ferramenta aberta, drop zone, operação e opções.
- **Queue:** jobs ativos, progresso, cancelamento e ordem.
- **History:** resultados, reabrir pasta, repetir e inspecionar logs.
- **Settings:** destinos, conflito, concorrência, updates e privacidade.

Categorias não devem virar uma sidebar enorme. O catálogo usa a descoberta por faixas
da Netflix e a presença forte dos tiles do Fortnite como referências de comportamento,
não como cópia visual. Busca por ação e extensão resolve “tenho este arquivo, o que
posso fazer?”; fixados e recentes são ordenados de forma determinística, sem IA.

## Fluxo principal

1. Escolher um card ou soltar um arquivo na área global.
2. Se a ferramenta não estiver instalada, o próprio card mostra tamanho, dependências
   e ação de download.
3. Após instalação, o card mantém a posição e sua ação vira “Abrir”.
4. App identifica tipo e mostra ações válidas.
5. Usuário escolhe tarefa e preset; opções avançadas ficam recolhidas.
6. Executar adiciona à fila sem bloquear a janela.
7. Conclusão oferece abrir arquivo, abrir pasta, repetir ou desfazer quando possível.

## Estados obrigatórios

- vazio útil, com exemplos reais de ações;
- arquivo incompatível;
- combinação experimental;
- conflito de nome;
- espaço insuficiente;
- executando, pausável quando suportado e cancelável;
- finalizando, sem prometer cancelamento instantâneo;
- concluído, warning, falha recuperável e falha técnica;
- binário ausente/corrompido detectado no health check.
- card disponível, resolvendo dependências, baixando, verificando, instalando, pronto,
  atualização disponível e falha recuperável.

## Comportamento e movimento

- Feedback no pointer-down e ações principais com latência visual imediata.
- Cards focados elevam em overlay sem empurrar a grade; teclado e ponteiro preservam
  a mesma posição mental.
- Springs criticamente amortecidas (`damping 1.0`, `response 0.3–0.4`) para foco e
  abertura; bounce somente após arrasto com momentum.
- Faixas arrastáveis acompanham o ponteiro 1:1, herdam velocidade e usam resistência
  suave nos limites.
- Progresso contínuo; não inventar percentual quando a ferramenta não oferece um.
- Transições curtas e interrompíveis; sem bounce em menus ou progresso.
- Entrada e saída pelo mesmo caminho espacial.
- Reduced motion preserva feedback com cross-fade.
- Controles próximos do resultado que afetam; labels específicos.

## Desktop Windows

- Priorizar teclado, drag-and-drop, menus de contexto e atalhos descobríveis.
- Alvos confortáveis sem parecer UI móvel inflada.
- Respeitar tema, escala de texto, high contrast e navegação por foco.
- Não imitar macOS; aplicar princípios de clareza, resposta e agência ao vocabulário
  esperado no Windows.

## Checkpoint pendente

Antes do v0 visual, confirmar direção, marca, densidade, idioma e preferência entre
comp-first e code-first. Só então declarar paleta, tipografia, spacing, radius, sombras
e gramática de movimento.

O contrato funcional dos cards está em `CARD-CATALOG.md`; paleta e linguagem visual
continuam deliberadamente abertas até o checkpoint.
