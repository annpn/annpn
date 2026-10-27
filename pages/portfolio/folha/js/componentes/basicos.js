/** Componentes de uma peca: KPI, etiqueta, mensagem, esqueleto e cabecalho. */

import { el, icone } from "../nucleo/dom.js";
import { porcento } from "../nucleo/formato.js";
import { grupoDaRota } from "../nucleo/navegacao.js";
import { rotaAtual } from "../nucleo/roteador.js";

/**
 * Cartao de indicador.
 * @param {object} opcoes {rotulo, valor, icone, nota, variacao, inverter}
 */
export function kpi({ rotulo, valor, icone: nome, nota, variacao: delta, inverter = false }) {
  return el("div.kpi", {}, [
    el("div.kpi-topo", {}, [
      el("span.kpi-rotulo", { texto: rotulo }),
      nome ? icone(nome) : null,
    ]),
    el("p.kpi-valor", { texto: valor }),
    nota || delta !== null && delta !== undefined
      ? el("div.kpi-pe", {}, [
          delta === null || delta === undefined ? null : variacaoEtiqueta(delta, inverter),
          nota ? el("span", { texto: nota }) : null,
        ])
      : null,
  ]);
}

/** Variacao contra o periodo anterior. `inverter`: custo que sobe e vermelho. */
export function variacaoEtiqueta(fracao, inverter = false) {
  const subiu = fracao > 0.0005;
  const desceu = fracao < -0.0005;
  const classe = !subiu && !desceu ? "neutra" : (subiu !== inverter ? "sobe" : "desce");
  return el("span.variacao." + classe, {}, [
    icone(subiu ? "trend-up" : desceu ? "trend-down" : "minus"),
    porcento(Math.abs(fracao)),
  ]);
}

export function etiqueta(texto, tom = "", semPonto = false) {
  const classes = ["etiqueta", tom, semPonto ? "sem-ponto" : ""].filter(Boolean).join(".");
  return el("span." + classes, { texto });
}

export function mensagem(texto, tom = "", nomeIcone = "info") {
  return el("div.mensagem" + (tom ? "." + tom : ""), {}, [
    icone(nomeIcone),
    el("span", { texto }),
  ]);
}

export function esqueletoLinha(largura = "100%") {
  return el("div.esqueleto.esqueleto-linha", { estilo: { width: largura } });
}

export function esqueletoBloco(altura = "60px") {
  return el("div.esqueleto.esqueleto-bloco", { estilo: { height: altura } });
}

/** Esqueleto de KPI: mesma caixa, mesmo espaco, conteudo em brilho. */
export function esqueletoKpi() {
  return el("div.kpi", {}, [
    esqueletoLinha("45%"),
    el("div.esqueleto", { estilo: { height: "26px", width: "70%", margin: "4px 0" } }),
    esqueletoLinha("30%"),
  ]);
}

export function esqueletoTabela(linhas = 8, colunas = 5) {
  return el("div.cartao", {}, [
    el("div.cartao-topo", {}, esqueletoLinha("180px")),
    el(
      "div.cartao-corpo",
      {},
      Array.from({ length: linhas }, () =>
        el(
          "div",
          { estilo: { display: "grid", gridTemplateColumns: `repeat(${colunas},1fr)`, gap: "16px" } },
          Array.from({ length: colunas }, (_, indice) => esqueletoLinha(indice === 1 ? "85%" : "60%"))
        )
      )
    ),
  ]);
}

/** Cabecalho de pagina. O grupo sai da trilha para a tela nao discordar do menu. */
export function cabecalhoPagina({ titulo, linha, acoes = [] }) {
  const grupo = grupoDaRota(rotaAtual());
  return el("div.pagina-topo", {}, [
    el("div", {}, [
      grupo ? el("p.pagina-grupo", { texto: grupo }) : null,
      el("h1", { texto: titulo }),
      linha ? el("p.linha", { texto: linha }) : null,
    ]),
    acoes.length ? el("div.acoes", {}, acoes) : null,
  ]);
}

export function cartao({ titulo, acoes = [], corpo, semPadding = false }) {
  return el("section.cartao", {}, [
    titulo
      ? el("header.cartao-topo", {}, [
          el("h2", { texto: titulo }),
          acoes.length ? el("div.direita", {}, acoes) : null,
        ])
      : null,
    semPadding ? corpo : el("div.cartao-corpo", {}, corpo),
  ]);
}

export function campo({ rotulo, id, controle }) {
  return el("div.campo", {}, [el("label", { for: id, texto: rotulo }), controle]);
}

export function busca({ id, placeholder, aoDigitar }) {
  return el("div.busca", {}, [
    icone("magnifying-glass"),
    el("input.entrada", {
      id,
      type: "search",
      placeholder,
      autocomplete: "off",
      onInput: (evento) => aoDigitar(evento.target.value),
    }),
  ]);
}

export function seletor({ id, opcoes, aoMudar, valor = "" }) {
  const campo = el(
    "select.entrada",
    { id, onChange: (evento) => aoMudar(evento.target.value) },
    opcoes.map((opcao) =>
      el("option", { value: opcao.valor, selected: opcao.valor === valor }, opcao.rotulo)
    )
  );
  return campo;
}

export function botao({ texto, icone: nome, variante = "", aoClicar, tipo = "button", ...resto }) {
  const classes = ["btn", variante && `btn-${variante}`].filter(Boolean).join(".");
  return el("button." + classes, { type: tipo, onClick: aoClicar, ...resto }, [
    nome ? icone(nome) : null,
    texto,
  ]);
}

export function chips({ opcoes, valor, aoEscolher, rotulo }) {
  return el(
    "div.chips",
    { role: "group", "aria-label": rotulo },
    opcoes.map((opcao) =>
      el("button.chip", {
        type: "button",
        "aria-pressed": String(opcao.valor === valor),
        texto: opcao.rotulo,
        onClick: () => aoEscolher(opcao.valor),
      })
    )
  );
}
