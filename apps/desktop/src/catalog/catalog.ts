import toolManifest from "../../../../tooling/tools.json";
import type { InstallationState } from "../../../../scripts/component-installation/installation-state.mjs";

export type ToolAccent = "action" | "cool" | "amber" | "neutral";

export type ToolOperation = { id: string; label: string; description: string };

export type CatalogTool = {
  id: string;
  integrationName: string;
  title: string;
  description: string;
  category: string;
  availability: InstallationState["availability"];
  delivery: "embedded" | "on-demand";
  status: "planned" | "bundled" | "downloadable";
  accent: ToolAccent;
  size: "standard" | "wide" | "compact";
  keywords: string[];
  capabilities: string[];
  operations: ToolOperation[];
  downloadLabel?: string;
};

export type CatalogRow = {
  id: string;
  title: string;
  description: string;
  tools: CatalogTool[];
};

const presentationById: Record<
  string,
  Omit<CatalogTool, "integrationName" | "delivery" | "status" | "availability" | "capabilities">
> = {
  qpdf: {
    id: "qpdf",
    title: "Organizar PDFs",
    description: "Mescle, divida, gire, proteja e otimize documentos.",
    category: "documents",
    accent: "amber",
    size: "wide",
    operations: [
      { id: "merge", label: "Mesclar PDFs", description: "Una vários documentos em um arquivo." },
      { id: "split", label: "Dividir páginas", description: "Extraia páginas para novos arquivos." },
      { id: "rotate", label: "Girar páginas", description: "Corrija a orientação do documento." },
      { id: "protect", label: "Proteger documento", description: "Adicione uma senha ao PDF." },
      { id: "linearize", label: "Otimizar para web", description: "Prepare o PDF para leitura progressiva." },
    ],
    keywords: ["pdf", ".pdf", "mesclar", "dividir", "girar", "documento"],
  },
  "yt-dlp": {
    id: "yt-dlp",
    title: "Baixar mídia",
    description: "Salve vídeo ou áudio a partir de uma URL suportada.",
    category: "downloads",
    accent: "action",
    size: "wide",
    operations: [
      { id: "download-video", label: "Baixar vídeo", description: "Escolha a melhor qualidade disponível." },
      { id: "download-audio", label: "Extrair áudio", description: "Salve somente a faixa de áudio." },
      { id: "inspect-url", label: "Inspecionar URL", description: "Veja formatos antes de baixar." },
    ],
    keywords: ["youtube", "url", "download", "baixar", "vídeo", "audio"],
    downloadLabel: "Com dependências",
  },
  ffmpeg: {
    id: "ffmpeg",
    title: "Converter mídia",
    description: "Converta, comprima, corte ou extraia áudio de arquivos.",
    category: "downloads",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "convert", label: "Converter formato", description: "Troque o contêiner mantendo o original." },
      { id: "extract-audio", label: "Extrair áudio", description: "Crie um arquivo de áudio a partir do vídeo." },
      { id: "compress", label: "Comprimir mídia", description: "Reduza o tamanho com um preset explícito." },
      { id: "trim", label: "Cortar trecho", description: "Defina início e fim sem reencodar quando possível." },
    ],
    keywords: ["video", "vídeo", "audio", "áudio", "converter", "comprimir", "cortar"],
    downloadLabel: "Download interno",
  },
  ffprobe: {
    id: "ffprobe",
    title: "Inspecionar mídia",
    description: "Veja codecs, faixas, dimensões e metadados técnicos.",
    category: "downloads",
    accent: "neutral",
    size: "compact",
    operations: [{ id: "inspect", label: "Inspecionar arquivo", description: "Leia codecs, faixas e metadados técnicos." }],
    keywords: ["codec", "metadados", "inspecionar", "vídeo", "audio"],
    downloadLabel: "Download interno",
  },
  libvips: {
    id: "libvips",
    title: "Ajustar imagens",
    description: "Redimensione, recorte, comprima e converta imagens.",
    category: "images",
    accent: "cool",
    size: "wide",
    operations: [
      { id: "resize", label: "Redimensionar", description: "Ajuste largura e altura preservando proporção." },
      { id: "crop", label: "Recortar", description: "Escolha uma área precisa da imagem." },
      { id: "compress", label: "Comprimir imagem", description: "Reduza peso com controle de qualidade." },
      { id: "convert", label: "Converter formato", description: "Exporte para formatos comuns de imagem." },
      { id: "upscale", label: "Aumentar resolução", description: "Amplie com reamostragem Lanczos, sem IA." },
    ],
    keywords: ["imagem", "foto", "resize", "redimensionar", "recortar", "crop", "comprimir"],
    downloadLabel: "Download interno",
  },
  jq: {
    id: "jq", title: "Formatar JSON", description: "Consulte, filtre e formate JSON sem abrir um editor.", category: "developer", accent: "cool", size: "standard",
    operations: [{ id: "format", label: "Formatar JSON", description: "Indente e valide um arquivo JSON." }, { id: "query", label: "Consultar JSON", description: "Extraia campos com uma expressão jq." }],
    keywords: ["json", "formatar", "query", "desenvolvimento"],
  },
  yq: {
    id: "yq", title: "Trabalhar com YAML", description: "Formate, consulte e converta YAML e JSON.", category: "developer", accent: "amber", size: "standard",
    operations: [{ id: "format", label: "Formatar YAML", description: "Indente e normalize um arquivo YAML." }, { id: "query", label: "Consultar YAML", description: "Extraia campos com uma expressão yq." }],
    keywords: ["yaml", "yml", "json", "formatar", "desenvolvimento"],
  },
  ripgrep: {
    id: "ripgrep", title: "Buscar no projeto", description: "Encontre texto e padrões em pastas com alta velocidade.", category: "developer", accent: "action", size: "wide",
    operations: [{ id: "search", label: "Buscar texto", description: "Procure padrões ignorando pastas desnecessárias." }], keywords: ["grep", "buscar", "texto", "regex", "código"],
  },
  fd: {
    id: "fd", title: "Encontrar arquivos", description: "Localize arquivos por nome, extensão ou caminho.", category: "developer", accent: "neutral", size: "compact",
    operations: [{ id: "find", label: "Encontrar arquivos", description: "Filtre caminhos sem escrever comandos." }], keywords: ["find", "arquivo", "pasta", "buscar"],
  },
  "7zip": {
    id: "7zip", title: "Compactar arquivos", description: "Crie e extraia arquivos 7z, zip e formatos comuns.", category: "files", accent: "amber", size: "standard",
    operations: [{ id: "compress", label: "Compactar", description: "Crie um arquivo compactado." }, { id: "extract", label: "Extrair", description: "Extraia o conteúdo para uma pasta." }], keywords: ["zip", "7z", "rar", "compactar", "extrair"],
  },
  pandoc: {
    id: "pandoc", title: "Converter documentos", description: "Converta Markdown e documentos entre formatos abertos.", category: "documents", accent: "cool", size: "wide",
    operations: [{ id: "convert", label: "Converter documento", description: "Escolha formato de entrada e saída." }], keywords: ["markdown", "docx", "html", "epub", "documento"], downloadLabel: "Download interno",
  },
  poppler: {
    id: "poppler",
    title: "Extrair de PDFs",
    description: "Puxe o texto de um documento ou transforme uma página em imagem.",
    category: "documents",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "extract-text", label: "Extrair texto", description: "Salve o texto do PDF preservando o layout." },
      { id: "rasterize", label: "Página como imagem", description: "Converta uma página escolhida em PNG." },
    ],
    keywords: ["pdf", ".pdf", "texto", "rasterizar", "pagina", "imagem", "documento"],
    downloadLabel: "Download interno",
  },
  imagemagick: {
    id: "imagemagick",
    title: "Formatos de imagem",
    description: "Converta entre formatos que as outras ferramentas não cobrem e inspecione detalhes.",
    category: "images",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "convert", label: "Converter formato", description: "A extensão do destino define o formato de saída." },
      { id: "grayscale", label: "Converter para cinza", description: "Remova a cor preservando a luminância." },
      { id: "inspect", label: "Inspecionar imagem", description: "Veja formato, dimensões, perfil e canais." },
    ],
    keywords: ["imagem", "converter", "formato", "tiff", "heic", "psd", "cinza", "inspecionar"],
    downloadLabel: "Download interno",
  },
  oxipng: {
    id: "oxipng",
    title: "Otimizar PNG",
    description: "Reduza o peso de PNGs sem perder um pixel.",
    category: "images",
    accent: "neutral",
    size: "compact",
    operations: [
      { id: "optimize", label: "Otimizar sem perdas", description: "Recomprime o PNG mantendo a imagem idêntica." },
    ],
    keywords: ["png", "otimizar", "comprimir", "imagem", "lossless", "sem perdas"],
  },
  exiftool: {
    id: "exiftool",
    title: "Metadados",
    description: "Leia, limpe ou edite metadados de fotos, vídeos e documentos.",
    category: "files",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "inspect", label: "Ler metadados", description: "Liste todas as tags encontradas no arquivo." },
      { id: "strip", label: "Remover metadados", description: "Gere uma cópia sem EXIF, GPS e outras tags." },
      { id: "set-title", label: "Definir título", description: "Grave um título no arquivo, em uma cópia nova." },
    ],
    keywords: ["metadados", "exif", "gps", "titulo", "foto", "limpar", "privacidade"],
    downloadLabel: "Download interno",
  },
  mkvtoolnix: {
    id: "mkvtoolnix",
    title: "Empacotar Matroska",
    description: "Converta para MKV e inspecione faixas sem reencodar.",
    category: "downloads",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "remux", label: "Converter para MKV", description: "Troca o contêiner mantendo as faixas originais." },
      { id: "inspect", label: "Inspecionar faixas", description: "Liste faixas, idiomas e codecs em JSON." },
    ],
    keywords: ["mkv", "matroska", "remux", "faixa", "legenda", "container"],
    downloadLabel: "Download interno",
  },
  miller: {
    id: "miller",
    title: "Planilhas e CSV",
    description: "Converta entre CSV, TSV e JSON e veja um resumo das colunas.",
    category: "developer",
    accent: "amber",
    size: "wide",
    operations: [
      { id: "to-json", label: "CSV para JSON", description: "Leia um CSV e veja os registros como JSON." },
      { id: "to-csv", label: "JSON para CSV", description: "Achate um JSON de registros em colunas." },
      { id: "summary", label: "Resumir colunas", description: "Tipo, contagem, nulos, mínimo e máximo por coluna." },
    ],
    keywords: ["csv", "tsv", "json", "planilha", "tabela", "coluna", "dados"],
  },
  hexyl: {
    id: "hexyl",
    title: "Ver bytes",
    description: "Inspecione o começo de um arquivo em hexadecimal.",
    category: "developer",
    accent: "neutral",
    size: "compact",
    operations: [
      { id: "preview", label: "Prévia em hex", description: "Mostre os primeiros bytes lado a lado com o ASCII." },
    ],
    keywords: ["hex", "hexadecimal", "bytes", "binario", "assinatura", "magic"],
  },
  tokei: {
    id: "tokei",
    title: "Contar código",
    description: "Veja linhas, comentários e arquivos por linguagem em um projeto.",
    category: "developer",
    accent: "cool",
    size: "standard",
    operations: [
      { id: "count", label: "Contar por linguagem", description: "Some arquivos, código, comentários e linhas em branco." },
    ],
    keywords: ["linhas", "codigo", "estatistica", "linguagem", "projeto", "loc"],
  },
  difftastic: {
    id: "difftastic",
    title: "Comparar arquivos",
    description: "Diferença estrutural: compara a sintaxe, não só as linhas.",
    category: "developer",
    accent: "action",
    size: "standard",
    operations: [
      { id: "compare", label: "Comparar dois arquivos", description: "Escolha dois arquivos e veja o que mudou de fato." },
    ],
    keywords: ["diff", "comparar", "diferenca", "sintaxe", "codigo", "merge"],
  },
  dust: {
    id: "dust",
    title: "Uso de disco",
    description: "Descubra quais pastas estão ocupando o espaço.",
    category: "files",
    accent: "amber",
    size: "standard",
    operations: [
      { id: "usage", label: "Maiores pastas", description: "Liste o que mais pesa dentro de uma pasta." },
    ],
    keywords: ["disco", "espaco", "tamanho", "pasta", "limpeza", "du"],
  },
  deno: {
    id: "deno",
    title: "Runtime de downloads",
    description: "Componente isolado usado por integrações de download.",
    category: "developer",
    accent: "neutral",
    size: "compact",
    operations: [{ id: "runtime", label: "Ver versão instalada", description: "Consulte a versão do Deno disponível no Windows." }],
    keywords: ["deno", "runtime", "javascript", "desenvolvimento"],
    downloadLabel: "Componente",
  },
};

const rowDefinitions = [
  {
    id: "included",
    title: "Arquivos, imagens e documentos",
    description: "Operações locais organizadas pelo resultado que você precisa.",
    toolIds: ["qpdf", "poppler", "libvips", "imagemagick", "oxipng", "exiftool"],
  },
  {
    id: "downloads",
    title: "Mídia e downloads",
    description: "Conversão local e downloads instalados quando você precisar.",
    toolIds: ["yt-dlp", "ffmpeg", "mkvtoolnix", "ffprobe"],
  },
  {
    id: "developer",
    title: "Dev tools e arquivos",
    description: "Pequenas ferramentas para texto, projetos e formatos compactados.",
    toolIds: ["jq", "yq", "miller", "difftastic", "ripgrep", "fd", "tokei", "hexyl", "dust", "7zip", "pandoc", "deno"],
  },
] as const;

export function createCatalogRows(): CatalogRow[] {
  const manifestTools = new Map(toolManifest.tools.map((tool) => [tool.id, tool]));

  return rowDefinitions.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    tools: row.toolIds.map((toolId) => {
      const manifestTool = manifestTools.get(toolId);
      const presentation = presentationById[toolId];

      if (!manifestTool || !presentation) {
        throw new Error(`Missing catalog presentation for ${toolId}`);
      }

      return {
        ...presentation,
        integrationName: manifestTool.displayName,
        delivery: requireDelivery(manifestTool.delivery),
        status: requireStatus(manifestTool.status),
        availability: manifestTool.status === "bundled" ? "ready" : "available",
        capabilities: manifestTool.capabilities,
        operations: presentation.operations,
      };
    }),
  }));
}

function requireStatus(value: string): CatalogTool["status"] {
  if (value === "planned" || value === "bundled" || value === "downloadable") return value;
  throw new Error(`Unsupported tool status: ${value}`);
}

function requireDelivery(value: string): CatalogTool["delivery"] {
  if (value === "embedded" || value === "on-demand") return value;
  throw new Error(`Unsupported delivery strategy: ${value}`);
}

export function filterCatalogRows(rows: CatalogRow[], rawQuery: string): CatalogRow[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return rows;

  return rows
    .map((row) => ({
      ...row,
      tools: row.tools.filter((tool) => searchableText(tool).includes(query)),
    }))
    .filter((row) => row.tools.length > 0);
}

function searchableText(tool: CatalogTool): string {
  return normalizeSearch(
    [tool.integrationName, tool.title, tool.description, ...tool.keywords, ...tool.capabilities].join(" "),
  );
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
