# Security model

## Ameaça principal

O app recebe paths, URLs e opções controlados pelo usuário e os entrega a programas
complexos que leem formatos não confiáveis. O limite crítico é a tradução de uma
intenção de UI para um processo local.

## Regras obrigatórias

1. Frontend não executa shell nem escolhe executável.
2. Argumentos são construídos por adaptadores a partir de enums e valores validados.
3. Nunca concatenar uma command line; sempre passar programa e argumentos separados.
4. Canonicalizar entrada e destino, sem seguir saída para diretórios inesperados.
5. Nunca sobrescrever o original; publicar saída somente depois da validação.
6. Cada job usa diretório temporário exclusivo com permissões mínimas.
7. URLs, cookies, cabeçalhos e paths pessoais são redigidos antes de logs exportáveis.
8. Binários só entram no build ou component store por origem allowlisted, hash fixado
   e smoke test.
9. Capacidades Tauri são mínimas e específicas por janela/comando.
10. Atualizações exigem assinatura; a chave privada não vive no repositório.

## Execução de binários

- Resolver pelo resource directory da instalação, nunca por PATH.
- Ambiente allowlist: não herdar variáveis desnecessárias.
- Timeout e limite de output para impedir crescimento ilimitado de logs.
- Windows Job Object agrupa o processo e filhos para cancelamento confiável.
- Parser trata stdout/stderr como texto não confiável.
- Arquivos temporários recebem nomes gerados, não fragmentos brutos da URL.

## Rede

Por padrão, módulos de arquivo não acessam a rede. O instalador de componentes, yt-dlp
e updater declaram rede explicitamente. A UI mostra tamanho e origem antes de baixar.
Telemetria é uma decisão de produto ainda aberta e deve ser opt-in se existir.

## Atualizações

Tauri exige assinatura para pacotes do updater. Tool packs sob demanda usam um catálogo
assinado separado, hashes fixados, staging isolado e ativação atômica. O app nunca deve
executar um pacote apenas porque o download terminou; verificação e health check vêm
antes da ativação.

## Relato de vulnerabilidade

Antes do lançamento público, adicionar `SECURITY.md` de divulgação responsável,
canal de contato, versões suportadas e SLA realista. Este documento é o modelo
técnico interno, não a política pública final.
