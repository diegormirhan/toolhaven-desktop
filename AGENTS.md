# Working Agreement

## Communication

- Conversa e explicações em português.
- Comentários de código em inglês, apenas para decisões não óbvias.
- Explicar causa e trade-off; não bajular decisões frágeis.
- Tratar `PRODUCT.md` e os ADRs como fontes de verdade, sem preencher lacunas com
  suposições silenciosas.

## Engineering

- Começar pelo menor fluxo vertical que prova a arquitetura.
- Aplicar TDD a comportamento novo e regressões.
- Separar domínio, orquestração, filesystem/processos e glue do Tauri.
- Usar nomes específicos; evitar módulos `manager`, `helper`, `utils` e serviços
  genéricos.
- Manter configuração e versões de ferramentas em uma fonte única.
- Nenhuma execução arbitrária de shell pelo frontend.
- Não commitar, criar branch ou publicar sem pedido explícito.

## Product boundaries

- Não adicionar IA.
- Não afirmar suporte a um formato sem fixture e teste de contrato.
- Não incluir binário de terceiro sem licença, origem, versão e hash.
- Não implementar a interface final antes da confirmação do fluxo e do sistema
  visual.

