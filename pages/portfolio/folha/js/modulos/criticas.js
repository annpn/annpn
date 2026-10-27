/** Criticas do fechamento e o catalogo de regras, com o estado de cada uma. */

import {
  botao,
  busca,
  cabecalhoPagina,
  cartao,
  chips,
  esqueletoTabela,
  etiqueta,
  mensagem,
} from "../componentes/basicos.js";
import { abrir, dados, secao } from "../componentes/gaveta.js";
import { tabela } from "../componentes/tabela.js";
import { el } from "../nucleo/dom.js";
import { estado, porId } from "../nucleo/estado.js";
import { inteiro, normalizar, reais } from "../nucleo/formato.js";
import { abrirContracheque } from "./contracheque.js";

export const titulo = "Criticas";

export function esqueleto() {
  return esqueletoTabela(8, 5);
}

const TOM = { bloqueia: "erro", avisa: "alerta", informa: "informacao" };
const TOM_ESTADO = {
  disparou: "erro",
  limpa: "sucesso",
  "trava na leitura": "informacao",
  "nao avaliada": "",
};

const filtros = { severidade: "", busca: "" };

function filtrar() {
  const termo = normalizar(filtros.busca);
  return estado.criticas.excecoes.filter((excecao) => {
    if (filtros.severidade && excecao.severidade !== filtros.severidade) return false;
    if (
      termo &&
      !normalizar(
        `${excecao.nome} ${excecao.matricula} ${excecao.evidencia} ${excecao.nome_regra}`
      ).includes(termo)
    )
      return false;
    return true;
  });
}

function abrirCritica(excecao) {
  const pessoa = porId(excecao.colaborador_id);
  abrir({
    titulo: `Regra ${String(excecao.regra).padStart(2, "0")}`,
    acoes: pessoa
      ? [botao({ texto: "Contracheque", icone: "receipt", aoClicar: () => abrirContracheque(pessoa) })]
      : [],
    conteudo: el("div", {}, [
      etiqueta(excecao.severidade, TOM[excecao.severidade] ?? ""),
      el("div", { estilo: { marginTop: "16px" } }, [
        dados([
          ["Regra", excecao.nome_regra],
          ["Fundamento", excecao.fundamento],
          ["Grupo", excecao.grupo],
          ["Colaborador", excecao.nome || "—"],
          ["Matricula", excecao.matricula || "—", true],
          ["Centro de custo", excecao.centro_custo || "—"],
          ["Valor", excecao.valor === null ? "—" : reais(excecao.valor), true],
        ]),
      ]),
      secao("Evidencia", el("p", { texto: excecao.evidencia })),
      secao(
        "Desfecho",
        excecao.desfecho
          ? el("div", {}, [
              etiqueta(excecao.desfecho, "sucesso"),
              el("p.secundario", { estilo: { marginTop: "8px" }, texto: excecao.desfecho_justificativa }),
              el("p.secundario", { texto: `por ${excecao.desfecho_autor}` }),
            ])
          : mensagem(
              "Sem desfecho. Excecao bloqueante sem desfecho reprova a competencia.",
              "alerta",
              "warning"
            )
      ),
    ]),
  });
}

export async function montar() {
  const regras = estado.criticas.regras;
  const naoAvaliadas = regras.filter((regra) => regra.estado === "nao avaliada").length;

  const grade = tabela({
    colunas: [
      {
        chave: "severidade",
        titulo: "Severidade",
        celula: (l) => etiqueta(l.severidade, TOM[l.severidade] ?? ""),
      },
      {
        chave: "regra",
        titulo: "Regra",
        celula: (l) =>
          el("div", {}, [
            el("span.mono", { texto: String(l.regra).padStart(2, "0") }),
            el("span.secundario", { texto: ` ${l.nome_regra}` }),
          ]),
      },
      {
        chave: "matricula",
        titulo: "Colaborador",
        celula: (l) =>
          el("div", {}, [
            el("span.mono", { texto: l.matricula || "—" }),
            el("span.secundario", { texto: ` ${l.nome || ""}` }),
          ]),
      },
      { chave: "evidencia", titulo: "Evidencia", celula: (l) => el("span.secundario", { texto: l.evidencia }) },
      {
        chave: "desfecho",
        titulo: "Desfecho",
        celula: (l) =>
          l.desfecho ? etiqueta(l.desfecho, "sucesso") : etiqueta("pendente", "erro"),
      },
    ],
    linhas: filtrar(),
    aoClicar: abrirCritica,
    porPagina: 15,
    vazio: { titulo: "Nenhuma critica com estes filtros" },
  });

  const contador = el("span.contador");

  function atualizar() {
    const lista = filtrar();
    grade.atualizar(lista);
    contador.textContent = `${inteiro(lista.length)} de ${inteiro(estado.criticas.excecoes.length)}`;
  }

  const catalogo = tabela({
    colunas: [
      { chave: "regra", titulo: "#", celula: (l) => el("span.mono", { texto: String(l.regra).padStart(2, "0") }) },
      {
        chave: "nome",
        titulo: "Regra",
        celula: (l) =>
          el("div", {}, [
            el("span", { texto: l.nome }),
            l.estado === "nao avaliada" || l.estado === "trava na leitura"
              ? el("p.secundario", { texto: l.observacao })
              : null,
          ]),
      },
      { chave: "severidade", titulo: "Severidade", celula: (l) => el("span.secundario", { texto: l.severidade }) },
      {
        chave: "estado",
        titulo: "Estado",
        celula: (l) =>
          etiqueta(
            l.estado === "disparou" ? `${l.ocorrencias} caso${l.ocorrencias === 1 ? "" : "s"}` : l.estado,
            TOM_ESTADO[l.estado] ?? ""
          ),
      },
    ],
    linhas: regras,
    paginar: false,
  });

  atualizar();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Criticas do fechamento",
      linha: `${regras.length} regras no catalogo · ${naoAvaliadas} nao avaliadas por falta de fonte`,
      acoes: [
        el(
          "a.btn",
          {
            href: `documentos/excecoes_${estado.competencia}.pdf`,
            target: "_blank",
            rel: "noopener",
          },
          "Relatorio em PDF"
        ),
      ],
    }),
    el("div.barra", {}, [
      chips({
        rotulo: "Severidade",
        valor: filtros.severidade,
        opcoes: [
          { valor: "", rotulo: "Todas" },
          { valor: "bloqueia", rotulo: "Bloqueia" },
          { valor: "avisa", rotulo: "Avisa" },
        ],
        aoEscolher: (valor) => {
          filtros.severidade = valor;
          for (const chip of document.querySelectorAll(".barra .chip")) {
            const alvo = chip.textContent.trim();
            const mapa = { Todas: "", Bloqueia: "bloqueia", Avisa: "avisa" };
            chip.setAttribute("aria-pressed", String(mapa[alvo] === valor));
          }
          atualizar();
        },
      }),
      busca({
        id: "b-critica",
        placeholder: "Nome, matricula ou evidencia",
        aoDigitar: (valor) => {
          filtros.busca = valor;
          atualizar();
        },
      }),
      contador,
    ]),
    cartao({ semPadding: true, corpo: grade.elemento }),
    el("div", { estilo: { marginTop: "16px" } }, [
      cartao({
        titulo: "Catalogo de regras",
        acoes: [el("span.secundario", { texto: "regra que nao pode rodar aparece como nao avaliada" })],
        semPadding: true,
        corpo: catalogo.elemento,
      }),
    ]),
  ]);
}
