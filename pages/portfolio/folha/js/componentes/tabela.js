/**
 * Data-grid: ordenacao, paginacao e estado vazio. Nao conhece o dominio.
 *
 * Ordena pelo dado cru, nao pelo texto da celula: como texto, 999,00 vem
 * depois de 1.207,16.
 */

import { el, icone, trocar } from "../nucleo/dom.js";
import { inteiro } from "../nucleo/formato.js";

const POR_PAGINA = 25;

/**
 * @param {object} opcoes
 * @param {Array} opcoes.colunas  {chave, titulo, num?, largura?, valor?, celula?, ordenavel?}
 * @param {Array} opcoes.linhas
 * @param {Function} [opcoes.aoClicar]  recebe a linha
 * @param {object} [opcoes.ordem]  {chave, desc}
 * @param {object} [opcoes.rodape]  {texto, celulas}
 * @param {object} [opcoes.vazio]  {titulo, descricao, acao}
 */
export function tabela(opcoes) {
  const {
    colunas,
    linhas,
    aoClicar,
    rodape,
    vazio,
    porPagina = POR_PAGINA,
    paginar = true,
  } = opcoes;

  const ordem = { ...(opcoes.ordem ?? { chave: null, desc: false }) };
  /** Filtro composto: um predicado por coluna, combinados por E. */
  const condicoes = new Map();
  let pagina = 1;

  const caixa = el("div.tabela-caixa");
  const pe = el("div");
  const raiz = el("div", {}, [caixa, pe]);

  const extrair = (coluna, linha) => (coluna.valor ? coluna.valor(linha) : linha[coluna.chave]);

  function filtradas() {
    if (!condicoes.size) return linhas;
    return linhas.filter((linha) =>
      [...condicoes.values()].every((condicao) => condicao(linha))
    );
  }

  function ordenadas() {
    const base = filtradas();
    if (!ordem.chave) return base;
    const coluna = colunas.find((c) => c.chave === ordem.chave);
    if (!coluna) return base;
    const sinal = ordem.desc ? -1 : 1;
    return [...base].sort((a, b) => {
      const x = extrair(coluna, a);
      const y = extrair(coluna, b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * sinal;
      return String(x ?? "").localeCompare(String(y ?? ""), "pt-BR") * sinal;
    });
  }

  function cabecalho() {
    return el(
      "thead",
      {},
      el(
        "tr",
        {},
        colunas.map((coluna) => {
          const ativa = ordem.chave === coluna.chave;
          const props = {
            scope: "col",
            class: coluna.num ? "num" : null,
            style: coluna.largura ? `width:${coluna.largura}` : null,
          };
          if (coluna.ordenavel === false) return el("th", props, coluna.titulo);
          return el(
            "th",
            { ...props, "aria-sort": ativa ? (ordem.desc ? "descending" : "ascending") : "none" },
            el(
              "button.ordenar",
              {
                type: "button",
                onClick: () => {
                  if (ordem.chave === coluna.chave) ordem.desc = !ordem.desc;
                  else {
                    ordem.chave = coluna.chave;
                    ordem.desc = Boolean(coluna.num);
                  }
                  pagina = 1;
                  desenhar();
                },
              },
              [
                coluna.titulo,
                ativa ? icone(ordem.desc ? "arrow-down" : "arrow-up") : icone("arrows-down-up"),
              ]
            )
          );
        })
      )
    );
  }

  function corpo(visiveis) {
    if (!visiveis.length) {
      return el(
        "tbody",
        {},
        el(
          "tr.vazio",
          {},
          el(
            "td",
            { colspan: colunas.length },
            el("div.vazio-estado", {}, [
              icone(vazio?.icone ?? "magnifying-glass"),
              el("strong", { texto: vazio?.titulo ?? "Nenhum registro" }),
              vazio?.descricao ? el("span", { texto: vazio.descricao }) : null,
              vazio?.acao ?? null,
            ])
          )
        )
      );
    }

    return el(
      "tbody",
      {},
      visiveis.map((linha) =>
        el(
          aoClicar ? "tr.clicavel" : "tr",
          aoClicar
            ? {
                tabindex: "0",
                onClick: () => aoClicar(linha),
                onKeydown: (evento) => {
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    aoClicar(linha);
                  }
                },
              }
            : {},
          colunas.map((coluna) =>
            el(
              "td",
              { class: coluna.num ? "num" : coluna.classe ?? null },
              coluna.celula ? coluna.celula(linha) : String(extrair(coluna, linha) ?? "—")
            )
          )
        )
      )
    );
  }

  function paginacao(total, paginas) {
    if (!paginar || paginas <= 1) return null;
    const ir = (destino) => {
      pagina = Math.min(Math.max(1, destino), paginas);
      desenhar();
    };
    return el("div.paginacao", {}, [
      el("span", { texto: `${inteiro(total)} registros` }),
      el("div.meio", {}, [
        el(
          "button.btn.btn-plano.btn-icone",
          { type: "button", disabled: pagina === 1, "aria-label": "Pagina anterior", onClick: () => ir(pagina - 1) },
          icone("caret-left")
        ),
        el("span.mono", { texto: `${pagina} / ${paginas}` }),
        el(
          "button.btn.btn-plano.btn-icone",
          { type: "button", disabled: pagina === paginas, "aria-label": "Proxima pagina", onClick: () => ir(pagina + 1) },
          icone("caret-right")
        ),
      ]),
    ]);
  }

  function desenhar() {
    const lista = ordenadas();
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    pagina = Math.min(pagina, paginas);
    const visiveis = paginar ? lista.slice((pagina - 1) * porPagina, pagina * porPagina) : lista;

    trocar(
      caixa,
      el("table", {}, [
        cabecalho(),
        corpo(visiveis),
        rodape && lista.length
          ? el("tfoot", {}, el("tr", {}, rodape.celulas.map((celula, indice) =>
              el("td", { class: colunas[indice]?.num ? "num" : null }, celula)
            )))
          : null,
      ])
    );
    trocar(pe, paginacao(lista.length, paginas));
  }

  desenhar();

  return {
    elemento: raiz,

    atualizar(novasLinhas) {
      linhas.length = 0;
      linhas.push(...novasLinhas);
      pagina = 1;
      desenhar();
    },

    /** Acrescenta ou remove uma condicao nomeada. Todas sao combinadas por E. */
    filtrar(nome, condicao) {
      if (condicao) condicoes.set(nome, condicao);
      else condicoes.delete(nome);
      pagina = 1;
      desenhar();
    },

    limparFiltros() {
      condicoes.clear();
      pagina = 1;
      desenhar();
    },

    get total() {
      return filtradas().length;
    },
  };
}
