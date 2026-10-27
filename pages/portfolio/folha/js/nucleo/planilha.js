/**
 * Planilha modelo do apontamento manual: escreve xlsx e csv, e le o xlsx de
 * volta. Para a empresa sem relogio de ponto, no mesmo layout que o leitor de
 * espelho ja entende.
 *
 * O xlsx e montado aqui: e um zip com sete XML, e nao paga carregar 600 KB de
 * dependencia para escrever sete arquivos.
 */

const AREA = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

/** Colunas na ordem em que a planilha as apresenta. */
export const COLUNAS = [
  {
    letra: "A",
    titulo: "Matricula",
    formato: "Texto",
    largura: 12,
    exigido: true,
    regra: "A mesma do cadastro. Matricula fora do cadastro bloqueia o fechamento.",
  },
  {
    letra: "B",
    titulo: "Nome",
    formato: "Texto",
    largura: 30,
    exigido: false,
    regra: "Confere o apontamento contra o cadastro. Nao entra no calculo.",
  },
  {
    letra: "C",
    titulo: "Data",
    formato: "DD/MM/AAAA",
    largura: 12,
    exigido: true,
    regra: "Uma linha por colaborador e por dia. Dia sem linha nao e apurado.",
  },
  {
    letra: "D",
    titulo: "Entrada",
    formato: "HH:MM",
    largura: 10,
    exigido: false,
    regra: "Vazia em D e em G no dia util: falta. Vazia em uma so: marcacao pendente.",
  },
  {
    letra: "E",
    titulo: "Saida Almoco",
    formato: "HH:MM",
    largura: 13,
    exigido: false,
    regra: "O intervalo so e descontado quando E e F estao preenchidas.",
  },
  {
    letra: "F",
    titulo: "Retorno",
    formato: "HH:MM",
    largura: 10,
    exigido: false,
    regra: "Retorno do intervalo.",
  },
  {
    letra: "G",
    titulo: "Saida",
    formato: "HH:MM",
    largura: 10,
    exigido: false,
    regra: "Saida do dia. Jornada de 8h, com tolerancia de 10 min no total.",
  },
];

/**
 * Linhas de exemplo que vem preenchidas no modelo.
 *
 * Cada bloco exercita uma classificacao diferente -- normal, extra, atraso,
 * falta, convocacao de sabado e de domingo, marcacao pendente e a tolerancia
 * de dez minutos. Quem preenche aprende a regra pelo exemplo, nao pelo manual.
 */
export const EXEMPLO = [
  ["100001", "Fernanda Cardoso Gomes", "03/08/2026", "07:00", "12:00", "13:00", "16:00"],
  ["100001", "Fernanda Cardoso Gomes", "04/08/2026", "07:00", "12:00", "13:00", "18:30"],
  ["100001", "Fernanda Cardoso Gomes", "05/08/2026", "07:22", "12:00", "13:00", "16:00"],
  ["100001", "Fernanda Cardoso Gomes", "06/08/2026", "", "", "", ""],
  ["100001", "Fernanda Cardoso Gomes", "09/08/2026", "07:00", "", "", "11:00"],
  ["100002", "Rodrigo Ferreira Xavier", "03/08/2026", "08:00", "12:00", "13:00", "17:00"],
  ["100002", "Rodrigo Ferreira Xavier", "04/08/2026", "08:00", "12:00", "13:00", "17:00"],
  ["100002", "Rodrigo Ferreira Xavier", "05/08/2026", "08:00", "", "", ""],
  ["100002", "Rodrigo Ferreira Xavier", "08/08/2026", "08:00", "", "", "12:00"],
  ["100003", "Jaqueline Wenzel Gomes", "03/08/2026", "06:00", "10:00", "11:00", "15:00"],
  ["100003", "Jaqueline Wenzel Gomes", "04/08/2026", "06:00", "10:00", "11:00", "15:10"],
  ["100003", "Jaqueline Wenzel Gomes", "05/08/2026", "06:00", "10:00", "11:00", "15:00"],
];

/**
 * O que o motor faz com cada linha de exemplo, na mesma ordem.
 *
 * O primeiro campo usa o mesmo vocabulario da coluna Situacao da apuracao --
 * se a tela chama de convocacao, o modelo nao pode chamar de extra.
 */
export const DESFECHO_DO_EXEMPLO = [
  ["normal", "8h00 trabalhadas, dentro da jornada"],
  ["extra", "10h30 no dia: 2h30 com adicional de 50% (CLT art. 59 §1o)"],
  ["atraso", "22 min acima da tolerancia de 10 min (CLT art. 58 §1o)"],
  ["falta", "sem entrada e sem saida em dia util: falta e DSR da semana"],
  ["convocacao", "domingo trabalhado: 4h com adicional de 100% por norma coletiva"],
  ["normal", "8h00 trabalhadas"],
  ["normal", "8h00 trabalhadas"],
  ["pendente", "entrada sem saida: o dia nao e apurado ate ser tratado"],
  ["convocacao", "sabado convocado: 4h com adicional de 50%"],
  ["normal", "8h00 trabalhadas"],
  ["normal", "10 min acima da jornada: dentro da tolerancia, nao vira extra"],
  ["normal", "8h00 trabalhadas"],
];

const TITULOS = COLUNAS.map((coluna) => coluna.titulo);

/* ------------------------------- CSV ------------------------------------- */

/** Ponto e virgula e BOM: e o que o Excel em pt-BR abre em colunas. */
export function csvDoModelo() {
  const linhas = [TITULOS, ...EXEMPLO].map((celulas) => celulas.join(";"));
  return "﻿" + linhas.join("\r\n") + "\r\n";
}

export const blobCsv = () =>
  new Blob([csvDoModelo()], { type: "text/csv;charset=utf-8" });

/* ------------------------------- XLSX ------------------------------------ */

const escapar = (texto) =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const celula = (ref, texto, estilo) =>
  texto === ""
    ? `<c r="${ref}" s="${estilo}"/>`
    : `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`;

function folha(nome, colunas, linhas, congelarCabecalho) {
  const cols = colunas
    .map((coluna, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${coluna.largura}" style="2" customWidth="1"/>`)
    .join("");

  const corpo = linhas
    .map((celulas, linha) => {
      const numero = linha + 2;
      const conteudo = celulas
        .map((valor, coluna) => celula(COLUNAS[coluna].letra + numero, valor, 2))
        .join("");
      return `<row r="${numero}">${conteudo}</row>`;
    })
    .join("");

  const cabecalho = colunas
    .map((coluna, indice) => celula(COLUNAS[indice].letra + "1", coluna.titulo, 1))
    .join("");

  const vista = congelarCabecalho
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : "";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<worksheet xmlns="${AREA}">${vista}<cols>${cols}</cols>` +
    `<sheetData><row r="1">${cabecalho}</row>${corpo}</sheetData></worksheet>`
  );
}

/** Segunda aba: dicionario das colunas e o desfecho de cada exemplo. */
function folhaDeInstrucoes() {
  const colunas = [
    { titulo: "Coluna", largura: 10 },
    { titulo: "Campo", largura: 16 },
    { titulo: "Formato", largura: 14 },
    { titulo: "Obrigatorio", largura: 13 },
    { titulo: "Regra", largura: 72 },
  ];

  const linhas = [
    ...COLUNAS.map((coluna) => [
      coluna.letra,
      coluna.titulo,
      coluna.formato,
      coluna.exigido ? "Sim" : "Nao",
      coluna.regra,
    ]),
    ["", "", "", "", ""],
    ["", "Linha 2 a 13", "", "", "Exemplos preenchidos. Apague antes de usar."],
    ...DESFECHO_DO_EXEMPLO.map(([tipo, nota], indice) => [
      "",
      `Linha ${indice + 2}`,
      tipo,
      "",
      nota,
    ]),
  ];

  const letras = ["A", "B", "C", "D", "E"];
  const cols = colunas
    .map((coluna, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${coluna.largura}" style="2" customWidth="1"/>`)
    .join("");
  const cabecalho = colunas.map((coluna, indice) => celula(letras[indice] + "1", coluna.titulo, 1)).join("");
  const corpo = linhas
    .map((celulas, linha) => {
      const numero = linha + 2;
      const conteudo = celulas.map((valor, coluna) => celula(letras[coluna] + numero, valor, 2)).join("");
      return `<row r="${numero}">${conteudo}</row>`;
    })
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<worksheet xmlns="${AREA}"><cols>${cols}</cols>` +
    `<sheetData><row r="1">${cabecalho}</row>${corpo}</sheetData></worksheet>`
  );
}

const ESTILOS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  `<styleSheet xmlns="${AREA}">` +
  '<fonts count="2">' +
  '<font><sz val="10"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  "</fonts>" +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF312D28"/><bgColor indexed="64"/></patternFill></fill>' +
  "</fills>" +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

const TIPOS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  "</Types>";

const RAIZ_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const LIVRO =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  `<workbook xmlns="${AREA}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
  '<sheets><sheet name="Ponto" sheetId="1" r:id="rId1"/><sheet name="Instrucoes" sheetId="2" r:id="rId2"/></sheets>' +
  "</workbook>";

const LIVRO_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  "</Relationships>";

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(bytes) {
  let valor = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    valor = TABELA_CRC[(valor ^ bytes[i]) & 0xff] ^ (valor >>> 8);
  }
  return (valor ^ 0xffffffff) >>> 0;
}

/** Zip sem compressao. O Excel aceita entrada armazenada, e evita o deflate. */
function zip(entradas) {
  const codificador = new TextEncoder();
  const corpo = [];
  const diretorio = [];
  let deslocamento = 0;

  for (const [nome, texto] of entradas) {
    const bytes = codificador.encode(texto);
    const nomeBytes = codificador.encode(nome);
    const crc = crc32(bytes);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint16(12, 0x5021, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nomeBytes.length, true);
    corpo.push(new Uint8Array(local.buffer), nomeBytes, bytes);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(10, 0, true);
    central.setUint16(14, 0x5021, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, bytes.length, true);
    central.setUint32(24, bytes.length, true);
    central.setUint16(28, nomeBytes.length, true);
    central.setUint32(42, deslocamento, true);
    diretorio.push(new Uint8Array(central.buffer), nomeBytes);

    deslocamento += 30 + nomeBytes.length + bytes.length;
  }

  const tamanhoDiretorio = diretorio.reduce((soma, parte) => soma + parte.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, entradas.length, true);
  fim.setUint16(10, entradas.length, true);
  fim.setUint32(12, tamanhoDiretorio, true);
  fim.setUint32(16, deslocamento, true);

  return new Blob([...corpo, ...diretorio, new Uint8Array(fim.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export const blobXlsx = () =>
  zip([
    ["[Content_Types].xml", TIPOS],
    ["_rels/.rels", RAIZ_RELS],
    ["xl/workbook.xml", LIVRO],
    ["xl/_rels/workbook.xml.rels", LIVRO_RELS],
    ["xl/styles.xml", ESTILOS],
    ["xl/worksheets/sheet1.xml", folha("Ponto", COLUNAS, EXEMPLO, true)],
    ["xl/worksheets/sheet2.xml", folhaDeInstrucoes()],
  ]);

export function baixar(blob, nome) {
  const endereco = URL.createObjectURL(blob);
  const ligacao = document.createElement("a");
  ligacao.href = endereco;
  ligacao.download = nome;
  document.body.append(ligacao);
  ligacao.click();
  ligacao.remove();
  URL.revokeObjectURL(endereco);
}

/* --------------------------- Leitura de xlsx ----------------------------- */

/** Entradas do zip, por nome. Trata o armazenado e o deflate. */
async function abrirZip(buffer) {
  const visao = new DataView(buffer);
  let fim = buffer.byteLength - 22;
  while (fim >= 0 && visao.getUint32(fim, true) !== 0x06054b50) fim -= 1;
  if (fim < 0) throw new Error("o arquivo nao parece ser um .xlsx");

  const total = visao.getUint16(fim + 10, true);
  let posicao = visao.getUint32(fim + 16, true);
  const decodificador = new TextDecoder();
  const entradas = new Map();

  for (let indice = 0; indice < total; indice += 1) {
    const metodo = visao.getUint16(posicao + 10, true);
    const comprimido = visao.getUint32(posicao + 20, true);
    const tamanhoNome = visao.getUint16(posicao + 28, true);
    const tamanhoExtra = visao.getUint16(posicao + 30, true);
    const tamanhoComentario = visao.getUint16(posicao + 32, true);
    const inicioLocal = visao.getUint32(posicao + 42, true);
    const nome = decodificador.decode(new Uint8Array(buffer, posicao + 46, tamanhoNome));

    // Os tamanhos de nome e extra do cabecalho local podem diferir do central.
    const nomeLocal = visao.getUint16(inicioLocal + 26, true);
    const extraLocal = visao.getUint16(inicioLocal + 28, true);
    const dados = new Uint8Array(buffer, inicioLocal + 30 + nomeLocal + extraLocal, comprimido);

    entradas.set(nome, { metodo, dados });
    posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }

  async function ler(nome) {
    const entrada = entradas.get(nome);
    if (!entrada) return null;
    if (entrada.metodo === 0) return decodificador.decode(entrada.dados);
    if (typeof DecompressionStream === "undefined") {
      throw new Error("este navegador nao descompacta .xlsx; exporte a planilha como CSV");
    }
    const fluxo = new Blob([entrada.dados])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(fluxo).text();
  }

  return { nomes: [...entradas.keys()], ler };
}

const EPOCA = Date.UTC(1899, 11, 30);

const doSerialDeData = (serial) => {
  const data = new Date(EPOCA + Math.round(serial) * 86400000);
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getUTCFullYear()}`;
};

const doSerialDeHora = (serial) => {
  const minutos = Math.round((serial % 1) * 1440);
  const hora = String(Math.floor(minutos / 60) % 24).padStart(2, "0");
  return `${hora}:${String(minutos % 60).padStart(2, "0")}`;
};

const chave = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const COLUNAS_DE_HORA = new Set([
  "entrada",
  "saidaalmoco",
  "retorno",
  "saida",
  "saida1",
  "saida2",
  "entrada1",
  "entrada2",
  "inicioalmoco",
  "retornoalmoco",
  "saidaintervalo",
  "retornointervalo",
  "saidafinal",
  "fimalmoco",
  "e1",
]);

const COLUNAS_DE_DATA = new Set(["data", "dia"]);

const indiceDaColuna = (letras) => {
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
};

const desescapar = (texto) =>
  texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codigo) => String.fromCharCode(Number(codigo)))
    .replace(/&amp;/g, "&");

/** Texto de um bloco com um ou mais <t>, que e como o Excel guarda a string. */
const textoDeNos = (bloco) =>
  desescapar(
    [...bloco.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map(([, conteudo]) => conteudo)
      .join("")
  );

/**
 * Converte a primeira aba de um xlsx no mesmo CSV que o leitor de espelho
 * recebe. Reaproveitar `lerCsv` evita um segundo caminho de parsing, que e
 * onde os dois formatos comecariam a discordar.
 *
 * Data e hora digitadas no Excel chegam como numero de serie, nao como texto:
 * a conversao usa o cabecalho da propria planilha para saber qual coluna e
 * data, qual e hora e qual e texto.
 */
export async function xlsxComoCsv(buffer) {
  const pacote = await abrirZip(buffer);
  const primeira =
    pacote.nomes.find((nome) => nome === "xl/worksheets/sheet1.xml") ??
    pacote.nomes.find((nome) => nome.startsWith("xl/worksheets/sheet"));
  if (!primeira) throw new Error("o .xlsx nao tem planilha legivel");

  const [folhaXml, compartilhadasXml] = await Promise.all([
    pacote.ler(primeira),
    pacote.ler("xl/sharedStrings.xml"),
  ]);

  const compartilhadas = compartilhadasXml
    ? [...compartilhadasXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(([, bloco]) => textoDeNos(bloco))
    : [];

  const matriz = [];
  for (const [, linha] of folhaXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const celulas = [];
    for (const [, atributos, conteudo] of linha.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const indice = indiceDaColuna(/r="([A-Z]+)/.exec(atributos)?.[1] ?? "A");
      const tipo = /t="([a-zA-Z]+)"/.exec(atributos)?.[1];
      const bruto = conteudo ?? "";
      if (tipo === "s") {
        const numero = /<v>([\s\S]*?)<\/v>/.exec(bruto)?.[1] ?? "";
        celulas[indice] = compartilhadas[Number(numero)] ?? "";
      } else if (tipo === "inlineStr" || tipo === "str") {
        celulas[indice] = textoDeNos(bruto);
      } else {
        celulas[indice] = desescapar(/<v>([\s\S]*?)<\/v>/.exec(bruto)?.[1] ?? "");
      }
    }
    matriz.push(celulas);
  }

  const primeiraComConteudo = matriz.findIndex((linha) => linha.some((valor) => String(valor ?? "").trim()));
  if (primeiraComConteudo < 0) throw new Error("a planilha esta vazia");

  const cabecalho = matriz[primeiraComConteudo].map((valor) => String(valor ?? "").trim());
  const tipoDaColuna = cabecalho.map((titulo) => {
    const nome = chave(titulo);
    if (COLUNAS_DE_DATA.has(nome)) return "data";
    if (COLUNAS_DE_HORA.has(nome)) return "hora";
    return "texto";
  });

  const limpar = (valor) => String(valor ?? "").replace(/[;\r\n]+/g, " ").trim();

  const linhas = matriz.slice(primeiraComConteudo).map((celulas, posicao) =>
    cabecalho
      .map((titulo, coluna) => {
        const bruto = celulas[coluna];
        if (posicao === 0) return limpar(titulo);
        const texto = limpar(bruto);
        if (!texto) return "";
        const numero = Number(texto.replace(",", "."));
        if (Number.isNaN(numero)) return texto;
        if (tipoDaColuna[coluna] === "data") return doSerialDeData(numero);
        if (tipoDaColuna[coluna] === "hora") return doSerialDeHora(numero);
        return texto;
      })
      .join(";")
  );

  return linhas.join("\r\n");
}
