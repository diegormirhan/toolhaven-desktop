# Progress

## Partes 4 e 5 — sistema visual e catálogo executável

Status: concluídas em 2026-09-05.

### Parte 4: sistema visual e shell

- Direção “bancada modular de pós-produção” registrada em `DESIGN.md`.
- Shell responsivo com navegação para ferramentas, fila, histórico e ajustes.
- Busca global por nome, ação, capacidade e extensão.
- Área de entrada por arquivo e estados vazios úteis, sem dados inventados.
- Vocabulário visual nativo do Windows com feedback imediato e reduced motion.

### Parte 5: catálogo e fluxo de ferramenta

- Cards variáveis organizados em faixas determinísticas, com arquivos/imagens/documentos agrupados para preservar densidade.
- Estado incluído, disponível, baixando e pronto refletido no próprio card.
- Plano de dependências real do domínio antes da integração do instalador.
- Contrato de cancelamento e transição para o estado pronto, mantido no domínio.
- Painel lateral para abrir uma ferramenta sem trocar de contexto.
- Layout alterna de faixas horizontais para grade vertical em janela estreita.

### Evidência

- 18 testes de domínio e 8 testes de interface aprovados.
- TypeScript em modo estrito sem erros.
- Build de produção Vite aprovado.
- Manifesto de ferramentas aprovado.
- Aceitação visual executada em 1440 × 900 e 390 × 844.
- Fluxo yt-dlp validado no navegador com Deno, FFmpeg, ffprobe e yt-dlp.
- Naquele checkpoint, nenhum download real, execução de binário ou escrita externa havia sido ativado.

## Partes 2 e 3 — instalação sob demanda

Status: concluídas em 2026-09-05.

### Parte 2: resolvedor de instalação

- Resolve dependências transitivas antes da ferramenta solicitada.
- Remove duplicatas quando ferramentas compartilham dependências.
- Ignora componentes embutidos e versões já instaladas.
- Detecta ciclos mostrando o caminho completo.
- Rejeita ferramentas pedidas fora do catálogo.
- Plano real validado para yt-dlp: Deno, FFmpeg, ffprobe e yt-dlp.

### Parte 3: estados, cancelamento e rollback

- Estado imutável separado entre disponibilidade e operação transitória.
- Fluxo coberto: resolver, baixar, verificar, instalar e ativar.
- Cancelamento preserva a versão ativa.
- Falha de atualização faz rollback lógico para a versão anterior.
- Falha na primeira instalação retorna ao estado disponível com erro diagnosticável.
- Transições inválidas e progresso fora de `0..1` são rejeitados.

### Evidência

- 18 testes passando.
- Cobertura total: 83,17% de linhas; novos módulos acima de 90%.
- Manifesto real validado depois das mudanças.
- Nenhum download, instalação global ou filesystem real foi implementado.

Os módulos Node são contratos executáveis temporários. O runtime final será Rust após
autorização explícita para instalar o toolchain.

## Parte 1 — contrato do catálogo de ferramentas

Status: concluída em 2026-09-05.

### Entregue

- Manifesto real `tooling/tools.json` para Windows x64.
- Entradas planejadas para FFmpeg, ffprobe, yt-dlp, Deno, qpdf e libvips.
- JSON Schema versionado para suporte de editor e documentação do formato.
- Validador puro sem dependências externas.
- CLI para validar o manifesto usado pelo build.
- Regras para impedir IDs duplicados, downloads sem HTTPS, hashes inválidos,
  destinos inseguros e ferramentas marcadas como empacotadas sem artefatos fixados.
- Estratégia `embedded` ou `on-demand` obrigatória por ferramenta.
- Dependências transitivas validadas contra o catálogo.
- Contrato do catálogo visual em `CARD-CATALOG.md` e ADR-0004.

### Evidência

- Na conclusão da Parte 1, 8 testes do contrato do catálogo foram aprovados.
- `npm run validate:tools`: manifesto aprovado.
- `node --check`: scripts aprovados.
- JSON Schema lido com sucesso.

### Próxima parte proposta

Projetar e prototipar visualmente o catálogo de cards e seus estados, sem conectar a
downloads reais. Essa etapa exige checkpoint de direção visual antes do código de UI.

## Incremento atual — operações e paleta

Status: concluído em 2026-09-05.

- Cards agora expõem operações concretas por ferramenta (PDF, imagem, mídia e inspeção).
- O painel permite escolher a operação e, no yt-dlp, informar uma URL de mídia.
- Naquele checkpoint, a execução ainda era demonstrativa, com estado de tarefa explícito e sem chamar binários reais.
- A paleta abandonou o verde: estados positivos usam azul mineral `#7f9bb7`, mantendo laranja para ação,
  âmbar para atenção e argila para erro.
- Testes de catálogo, painel e fluxo de URL foram adicionados.

Evidência: 18 testes de domínio + 15 testes de UI passando; TypeScript, build Vite e manifesto validados.

## Incremento seguinte — fila e planos de execução

Status: concluído em 2026-09-05.

- A fila de operações possui estados `queued`, `running` e `succeeded`; o progresso era demonstrativo naquele checkpoint.
- O Histórico passa a listar operações concluídas durante a sessão.
- O resolvedor `scripts/execution/resolve-operation-plan.mjs` traduz FFmpeg, ffprobe e qpdf
  para planos de execução com `executable + args`, sem shell arbitrário.
- Casos de conversão, extração de áudio, compressão, corte, inspeção e operações PDF têm contrato inicial.
- O painel expõe opções contextuais: CRF, início/fim, páginas, rotação e senha de PDF.

Evidência: 21 testes de domínio + 16 testes de UI passando; TypeScript e build Vite aprovados.

## Bootstrap Windows x64 — Tauri nativo

Status: concluído em 2026-09-05.

- Rust/MSVC instalado com toolchain `stable-x86_64-pc-windows-msvc` (`rustc 1.98.1`).
- Visual Studio Build Tools 2022 e Windows SDK 10.0.26100.0 disponíveis.
- Host Tauri 2 gerado em `apps/desktop/src-tauri` com identificador próprio e licença MIT.
- `cargo check` aprovado para o host nativo.
- `npm run tauri:build` aprovado para o alvo Windows x64.
- Instaladores gerados: MSI e NSIS, além do executável release.
- Auditoria de catálogo cobre 27 capacidades, incluindo o conjunto inicial de dev tools.

O texto acima registra o estado anterior ao incremento de execução nativa abaixo. A
distribuição pública continua condicionada a artefatos versionados e hashes fixados.

## Incremento atual — execução nativa real

Status: concluído em 2026-09-05.

- O host Tauri expõe somente `execute_operation` e `detect_available_tools`; não há shell arbitrário vindo da UI.
- Adaptadores Rust executam FFmpeg/ffprobe, yt-dlp/Deno, qpdf, libvips, jq, yq, ripgrep, fd, 7-Zip e Pandoc por arrays de argumentos.
- O painel usa os diálogos nativos do Windows para selecionar entradas e destinos e mostra stdout, erros e saída gerada.
- A disponibilidade dos cards é detectada no host; a fila registra concluída apenas depois do processo real retornar sucesso.
- O preview web não executa operações e informa para abrir o aplicativo Windows.
- Componentes ausentes não são simulados: o diálogo exibe o plano de dependências até os artefatos versionados e hashes serem publicados.

Evidência: 22 testes de domínio, 14 testes de UI, 3 testes Rust, TypeScript estrito,
manifesto e auditoria de 27 capacidades aprovados; build Tauri Windows x64 gerado.
