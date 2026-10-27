/** Composicao da aplicacao: banda global, trilha de modulos, tema e rotas. */

import { el, icone, trocar } from "./nucleo/dom.js";
import { assinar, carregar, estado } from "./nucleo/estado.js";
import { inteiro } from "./nucleo/formato.js";
import { NAVEGACAO } from "./nucleo/navegacao.js";
import { aoMudar, iniciar, irPara, registrar, rotaAtual } from "./nucleo/roteador.js";
import { redesenharPorTema } from "./componentes/grafico.js";

import * as painel from "./modulos/painel.js";
import * as ponto from "./modulos/ponto.js";
import * as folha from "./modulos/folha.js";
import * as colaboradores from "./modulos/colaboradores.js";
import * as criticas from "./modulos/criticas.js";
import * as parametros from "./modulos/parametros.js";
import * as centros from "./modulos/centros.js";
import * as lancamentos from "./modulos/lancamentos.js";

const NS = "http://www.w3.org/2000/svg";

/** Marca: cartao de ponto com o canto cortado e tres furos. */
function selo() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("banda-selo");

  const cartao = document.createElementNS(NS, "path");
  cartao.setAttribute("d", "M4 5h10.5L20 10.5V19H4Z");
  cartao.setAttribute("fill", "currentColor");

  const furos = document.createElementNS(NS, "path");
  furos.setAttribute(
    "d",
    "M7 14.2h2.2v2.2H7zm3.9 0h2.2v2.2h-2.2zm3.9 0H17v2.2h-2.2z"
  );
  furos.setAttribute("fill", "var(--chrome)");

  svg.append(cartao, furos);
  return svg;
}

function aplicarTema(escuro) {
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
  const botao = document.getElementById("tema");
  if (botao) {
    botao.setAttribute("aria-pressed", String(escuro));
    trocar(botao, icone(escuro ? "sol" : "lua"));
    botao.setAttribute("aria-label", escuro ? "Usar tema claro" : "Usar tema escuro");
  }
  try {
    localStorage.setItem("rh-tema", escuro ? "escuro" : "claro");
  } catch (erro) {
    /* janela privada: a aplicacao funciona igual, sem lembrar a escolha */
  }

  // O grafico le as cores dos tokens no momento do desenho: sem redesenhar, ele
  // fica com a paleta do tema anterior.
  if (rotaAtual()) {
    redesenharPorTema();
    irPara(rotaAtual());
  }
}

function banda() {
  const empresa = el("span.valor", { texto: "—" });
  const competencia = el("span.valor", { texto: "—" });

  assinar("carregado", () => {
    const [ano, mes] = estado.competencia.split("-");
    competencia.textContent = `${mes}/${ano}`;
    empresa.textContent = estado.empresa.razao_social;
  });

  return el("header.banda", {}, [
    el("a.banda-marca", { href: "#painel", "aria-label": "Folha, pagina inicial" }, [
      selo(),
      el("span.banda-nome", { texto: "Folha" }),
      el("span.banda-produto", { texto: "Gestao de Pessoal" }),
    ]),
    el("div.banda-dir", {}, [
      el("span.banda-ctx.empresa", {}, [el("span.rotulo", { texto: "Empresa" }), empresa]),
      el("span.banda-ctx", {}, [el("span.rotulo", { texto: "Competencia" }), competencia]),
      el("span.banda-amb", { title: "Ambiente de demonstracao com dado sintetico" }, "Demonstracao"),
      el("button.banda-botao", {
        id: "tema",
        type: "button",
        onClick: () => aplicarTema(document.documentElement.dataset.tema !== "escuro"),
      }),
      el("span.banda-usuario", {}, [
        el("span.banda-iniciais", { "aria-hidden": "true", texto: "APN" }),
        el("span", { texto: "Anna P. Nadal" }),
      ]),
    ]),
  ]);
}

function trilha() {
  const itens = new Map();

  const lista = NAVEGACAO.flatMap((secao) => [
    el("p.trilha-grupo", { texto: secao.grupo }),
    ...secao.itens.map((item) => {
      const conta = el("span.conta", { hidden: true });
      if (item.conta === "pendentes") conta.classList.add("alerta");
      const botao = el(
        "button.trilha-item",
        { type: "button", dataset: { rota: item.rota }, onClick: () => irPara(item.rota) },
        [icone(item.icone), el("span", { texto: item.rotulo }), conta]
      );
      itens.set(item.rota, { botao, conta, chave: item.conta });
      return botao;
    }),
  ]);

  const raiz = el("nav.trilha", { "aria-label": "Modulos do sistema" }, [
    ...lista,
    el("div.trilha-pe", {}, [
      el("strong", { texto: "Dado inteiramente sintetico" }),
      "Portfolio de Anna Paula Nadal",
    ]),
  ]);

  aoMudar((rota) => {
    for (const [chave, { botao }] of itens) {
      if (chave === rota) botao.setAttribute("aria-current", "page");
      else botao.removeAttribute("aria-current");
    }
  });

  assinar("carregado", () => {
    const valores = {
      pessoas: estado.colaboradores.length,
      pendentes: estado.pendentes,
    };
    for (const { conta, chave } of itens.values()) {
      if (!chave) continue;
      const valor = valores[chave];
      if (!valor) continue;
      conta.textContent = inteiro(valor);
      conta.hidden = false;
    }
  });

  return raiz;
}

function falha(erro) {
  return el("div", {}, [
    el("div.vazio-estado", {}, [
      icone("alerta"),
      el("strong", { texto: "Nao foi possivel carregar os dados da competencia" }),
      el("span", { texto: String(erro.message ?? erro) }),
      el("span.secundario", {
        texto:
          "A aplicacao le os arquivos de dados/ por HTTP. Abra por um servidor: python -m http.server dentro da pasta web.",
      }),
    ]),
  ]);
}

async function iniciarAplicacao() {
  registrar("painel", painel);
  registrar("ponto", ponto);
  registrar("folha", folha);
  registrar("colaboradores", colaboradores);
  registrar("criticas", criticas);
  registrar("parametros", parametros);
  registrar("centros", centros);
  registrar("lancamentos", lancamentos);

  const area = el("main.area", { id: "area" });
  const app = el("div.app", {}, [banda(), el("div.corpo", {}, [trilha(), area])]);
  trocar(document.body, app);

  try {
    aplicarTema(localStorage.getItem("rh-tema") === "escuro");
  } catch (erro) {
    aplicarTema(false);
  }

  try {
    await carregar();
  } catch (erro) {
    trocar(area, falha(erro));
    return;
  }

  iniciar(area);
}

iniciarAplicacao();
