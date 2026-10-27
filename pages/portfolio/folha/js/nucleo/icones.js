/**
 * Icones em SVG inline, grade de 24 e traco de 1,75. Desenhados aqui para nao
 * depender de rede nem sofrer o salto de layout da fonte de icone.
 */

const D = {
  // Navegacao e acao
  painel: "M4 19h16M4 19V5m4 10 3.5-4 3 2.5L19 8",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2",
  dinheiro: "M3 6.5h18v11H3zM12 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 9.5h.01M17.5 14.5h.01",
  pessoas: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c0-3 2.7-5 6-5s6 2 6 5M16 5.2a3.5 3.5 0 0 1 0 6.6M18 20c0-2-1-3.6-2.5-4.4",
  alerta: "M12 4 3.5 19h17L12 4Zm0 5.5v5m0 2.5h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5V16m0-7.5h.01",
  verificado: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-9 2.5 2.5 4.5-5",
  erro: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5l5 5m0-5-5 5",
  carregando: "M12 3a9 9 0 1 0 9 9",
  fechar: "M6 6l12 12M18 6 6 18",
  menos: "M5 12h14",

  // Dado e documento
  recibo: "M6 21V4.5l2 1.2 2-1.2 2 1.2 2-1.2 2 1.2 2-1.2V21l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21Zm3.5-12h5m-5 3.5h5m-5 3.5h3",
  documento: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6m-6 3.5h4",
  pdf: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M8.5 16.5v-4h1.2a1.2 1.2 0 0 1 0 2.4H8.5m4 1.6v-4h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1Z",
  planilha: "M4 5h16v14H4zM4 10h16M9 10v9",
  impressora: "M7 9V4h10v5M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z",
  pasta: "M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 17V7.5Z",
  upload: "M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16",
  baixar: "M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16",
  tabela: "M4 5h16v14H4zM4 9.5h16M9.5 9.5V19M15 9.5V19",
  lapis: "M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Zm11-14 3 3",
  banco: "M3.5 9.5 12 4l8.5 5.5M5 10v8m4-8v8m6-8v8m4-8v8M3.5 20h17",
  cofre: "M4 5h16v14H4zM13 12a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Zm3.5-3v6",
  calendario: "M5 6h14v14H5zM5 10h14M8.5 4v3m7-3v3",
  calendarioX: "M5 6h14v14H5zM5 10h14M8.5 4v3m7-3v3m-3.4 7.1 3 3m0-3-3 3",

  // Busca, filtro e ordenacao
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5",
  filtroLimpo: "M4 5h16l-6 7v6l-4 2v-8L4 5Zm12 10 4 4m0-4-4 4",
  ordenar: "M8 4v14m0 0-3-3m3 3 3-3M16 20V6m0 0-3 3m3-3 3 3",
  setaCima: "M12 19V5m0 0-5 5m5-5 5 5",
  setaBaixo: "M12 5v14m0 0 5-5m-5 5-5-5",
  setaEsquerda: "M19 12H5m0 0 5-5m-5 5 5 5",
  setaDireita: "M5 12h14m0 0-5-5m5 5-5 5",
  caretEsquerda: "m14 6-6 6 6 6",
  caretDireita: "m10 6 6 6-6 6",
  desfazer: "M4 10h7a5 5 0 0 1 0 10H8M4 10l3.5-3.5M4 10l3.5 3.5",
  trocas: "M4 9h13m0 0-3.5-3.5M17 9l-3.5 3.5M20 15H7m0 0 3.5 3.5M7 15l3.5-3.5",

  // Tendencia
  sobe: "M3 17 9.5 10.5l3.5 3L21 6m0 0h-5m5 0v5",
  desce: "M3 7 9.5 13.5l3.5-3L21 18m0 0h-5m5 0v-5",

  // Tema
  lua: "M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z",
  sol: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-13.5V5m0 14v1.5M4.2 4.2l1.1 1.1m13.4 13.4 1.1 1.1M3.5 12H5m14 0h1.5M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1",

  // Diversos
  tomada: "M9 4v5m6-5v5M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9Zm6 9v3",
  maoMoeda: "M7 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10.5 0h.01M3 20c1.5-1.2 3-1.8 5-1.8 1.6 0 2.8.4 4 1l4.5-2.6a1.6 1.6 0 1 1 1.6 2.8L13 22.5",
  cifrao: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v10m2.5-7.6c-.6-.6-1.5-1-2.5-1-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.2-1.1 2-2.5 2-1 0-1.9-.4-2.5-1",
  maisCirculo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-9h7M12 8.5v7",
  menosCirculo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-9h7",
};

/** Nome usado na interface -> desenho. Alias mantem o vocabulario do codigo. */
const ALIAS = {
  "chart-line-up": "painel",
  clock: "relogio",
  "clock-clockwise": "relogio",
  "clock-afternoon": "relogio",
  "clock-user": "relogio",
  money: "dinheiro",
  "users-three": "pessoas",
  "warning-diamond": "alerta",
  "warning-circle": "alerta",
  warning: "alerta",
  "check-circle": "verificado",
  "x-circle": "erro",
  "circle-notch": "carregando",
  x: "fechar",
  minus: "menos",
  receipt: "recibo",
  "file-text": "documento",
  "file-csv": "planilha",
  "file-pdf": "pdf",
  printer: "impressora",
  "folder-open": "pasta",
  "upload-simple": "upload",
  bank: "banco",
  vault: "cofre",
  "calendar-check": "calendario",
  "calendar-x": "calendarioX",
  "magnifying-glass": "busca",
  "funnel-x": "filtroLimpo",
  "arrows-down-up": "ordenar",
  "arrow-up": "setaCima",
  "arrow-down": "setaBaixo",
  "arrow-left": "setaEsquerda",
  "arrow-right": "setaDireita",
  "caret-left": "caretEsquerda",
  "caret-right": "caretDireita",
  "arrow-counter-clockwise": "desfazer",
  "arrows-left-right": "trocas",
  "trend-up": "sobe",
  "trend-down": "desce",
  moon: "lua",
  sun: "sol",
  plugs: "tomada",
  "hand-coins": "maoMoeda",
  "currency-circle-dollar": "cifrao",
  "plus-circle": "maisCirculo",
  "minus-circle": "menosCirculo",
  info: "info",
};

const NS = "http://www.w3.org/2000/svg";

export function svgDoIcone(nome) {
  const desenho = D[ALIAS[nome] ?? nome] ?? D.info;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("ico");

  const caminho = document.createElementNS(NS, "path");
  caminho.setAttribute("d", desenho);
  svg.append(caminho);
  return svg;
}

export const nomesDeIcone = () => [...new Set([...Object.keys(D), ...Object.keys(ALIAS)])];
