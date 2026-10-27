/**
 * A planilha modelo desenhada na tela, do jeito que ela abre no Excel.
 *
 * O visitante precisa ver o layout sem baixar nada: regua de coluna, cabecalho
 * congelado, linhas de exemplo preenchidas e as duas abas do arquivo.
 */

import { COLUNAS, DESFECHO_DO_EXEMPLO, EXEMPLO } from "../nucleo/planilha.js";
import { el, icone } from "../nucleo/dom.js";
import { tabela } from "./tabela.js";
import { etiqueta } from "./basicos.js";

const TOM = {
  normal: "",
  extra: "informacao",
  atraso: "alerta",
  falta: "erro",
  pendente: "alerta",
  convocacao: "informacao",
};

/** Colunas B e seguintes com texto corrido ficam proporcionais; o resto, mono. */
const PROPORCIONAL = new Set(["Nome"]);

/**
 * @param {number} [limite] mostra so as primeiras linhas, para a previa que
 *   aparece ao lado da escolha de entrada.
 */
export function gradeDoModelo(limite) {
  const visiveis = limite ? EXEMPLO.slice(0, limite) : EXEMPLO;
  const regua = el("tr.regua", {}, [
    el("th.canto", { scope: "col", "aria-label": "Numero da linha" }),
    ...COLUNAS.map((coluna) => el("th", { scope: "col", texto: coluna.letra })),
  ]);

  const rotulos = el("tr.rotulos", {}, [
    el("th.canto", { scope: "row", texto: "1" }),
    ...COLUNAS.map((coluna) => el("th", { scope: "col", texto: coluna.titulo })),
  ]);

  const corpo = visiveis.map((linha, indice) =>
    el("tr", {}, [
      el("td.linha-num", { texto: String(indice + 2) }),
      ...linha.map((valor, coluna) =>
        el(
          valor === "" ? "td.vazia" : PROPORCIONAL.has(COLUNAS[coluna].titulo) ? "td" : "td.dado",
          { texto: valor }
        )
      ),
    ])
  );

  return el("div", {}, [
    el("div.planilha-caixa", {}, [
      el("table.planilha", {}, [el("thead", {}, [regua, rotulos]), el("tbody", {}, corpo)]),
    ]),
    el("div.planilha-pe", {}, [
      el("span.planilha-aba", {}, [icone("tabela"), "Ponto"]),
      el("span.planilha-aba.inativa", {}, [icone("documento"), "Instrucoes"]),
      el("span", {
        texto: limite
          ? `previa: ${limite} de ${EXEMPLO.length} linhas de exemplo`
          : `${EXEMPLO.length} linhas de exemplo em ${COLUNAS.length} colunas`,
      }),
    ]),
  ]);
}

export function dicionarioDasColunas() {
  const grade = tabela({
    colunas: [
      {
        chave: "letra",
        titulo: "Col.",
        largura: "56px",
        ordenavel: false,
        celula: (linha) => el("span.mono", { texto: linha.letra }),
      },
      { chave: "titulo", titulo: "Campo", ordenavel: false },
      {
        chave: "formato",
        titulo: "Formato",
        ordenavel: false,
        celula: (linha) => el("span.mono", { texto: linha.formato }),
      },
      {
        chave: "exigido",
        titulo: "Preenchimento",
        ordenavel: false,
        celula: (linha) =>
          linha.exigido ? etiqueta("obrigatorio", "erro") : etiqueta("opcional", "", true),
      },
      { chave: "regra", titulo: "O que a coluna determina", ordenavel: false },
    ],
    linhas: COLUNAS,
    paginar: false,
  });
  grade.elemento.classList.add("dicionario");
  return grade.elemento;
}

export function desfechoDasLinhas() {
  const linhas = DESFECHO_DO_EXEMPLO.map(([tipo, efeito], indice) => ({
    linha: indice + 2,
    matricula: EXEMPLO[indice][0],
    data: EXEMPLO[indice][2],
    tipo,
    efeito,
  }));

  return tabela({
    colunas: [
      {
        chave: "linha",
        titulo: "Linha",
        largura: "60px",
        ordenavel: false,
        celula: (l) => el("span.mono", { texto: String(l.linha) }),
      },
      {
        chave: "matricula",
        titulo: "Matricula",
        largura: "90px",
        ordenavel: false,
        celula: (l) => el("span.mono", { texto: l.matricula }),
      },
      {
        chave: "data",
        titulo: "Data",
        largura: "100px",
        ordenavel: false,
        celula: (l) => el("span.mono", { texto: l.data }),
      },
      {
        chave: "tipo",
        titulo: "Situacao",
        largura: "130px",
        ordenavel: false,
        celula: (l) => etiqueta(l.tipo, TOM[l.tipo] ?? ""),
      },
      { chave: "efeito", titulo: "Efeito na folha", ordenavel: false },
    ],
    linhas,
    paginar: false,
  }).elemento;
}
