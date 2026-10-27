/** Painel: indicadores da competencia e evolucao dos ultimos meses. */

import {
  cabecalhoPagina,
  cartao,
  esqueletoKpi,
  kpi,
  mensagem,
} from "../componentes/basicos.js";
import { grafico } from "../componentes/grafico.js";
import { tabela } from "../componentes/tabela.js";
import { el, icone } from "../nucleo/dom.js";
import { estado } from "../nucleo/estado.js";
import {
  competenciaCurta,
  competenciaLonga,
  compacto,
  inteiro,
  moeda,
  porcento,
  reais,
  variacao,
} from "../nucleo/formato.js";
import { irPara } from "../nucleo/roteador.js";

export const titulo = "Painel";

export function esqueleto() {
  return el("div", {}, [
    el("div.grade.grade-kpi", {}, Array.from({ length: 4 }, esqueletoKpi)),
    el("div.grade.grade-2", { estilo: { marginTop: "16px" } }, [
      el("div.cartao", {}, el("div.cartao-corpo", {}, el("div.esqueleto.esqueleto-bloco", { estilo: { height: "268px" } }))),
      el("div.cartao", {}, el("div.cartao-corpo", {}, el("div.esqueleto.esqueleto-bloco", { estilo: { height: "268px" } }))),
    ]),
  ]);
}

function indicadores() {
  const pontos = estado.historico.pontos;
  const atual = pontos[pontos.length - 1];
  const anterior = pontos[pontos.length - 2];
  const total = estado.total;

  return el("div.grade.grade-kpi.escalonar", {}, [
    kpi({
      rotulo: "Custo da folha",
      valor: moeda(total.proventos),
      icone: "currency-circle-dollar",
      variacao: variacao(atual.proventos, anterior?.proventos),
      nota: "contra o mes anterior",
    }),
    kpi({
      rotulo: "Liquido a pagar",
      valor: moeda(total.liquido),
      icone: "hand-coins",
      nota: `${inteiro(total.colaboradores)} colaboradores`,
    }),
    kpi({
      rotulo: "Hora extra sobre a folha",
      valor: porcento(atual.proporcao_hora_extra),
      icone: "clock-clockwise",
      variacao: variacao(atual.proporcao_hora_extra, anterior?.proporcao_hora_extra),
      nota: moeda(atual.hora_extra),
    }),
    kpi({
      rotulo: "Turnover do mes",
      valor: porcento(atual.turnover),
      icone: "arrows-left-right",
      variacao: variacao(atual.turnover, anterior?.turnover),
      nota: `${atual.admissoes} admissoes, ${atual.rescisoes} rescisoes`,
    }),
    kpi({
      rotulo: "Encargos",
      valor: moeda(total.fgts + total.inss),
      icone: "bank",
      nota: `FGTS ${compacto(total.fgts)} · INSS ${compacto(total.inss)}`,
    }),
    kpi({
      rotulo: "Criticas sem desfecho",
      valor: inteiro(estado.pendentes),
      icone: "warning-diamond",
      nota: "bloqueiam o envio",
    }),
  ]);
}

function evolucaoDoCusto() {
  const pontos = estado.historico.pontos;
  return cartao({
    titulo: "Evolucao do custo da folha",
    acoes: [el("span.secundario", { texto: `${pontos.length} competencias` })],
    semPadding: true,
    corpo: el("div", {}, [
      grafico({
        tipo: "area",
        categorias: pontos.map((ponto) => competenciaCurta(ponto.competencia)),
        series: [
          {
            nome: "Proventos",
            dados: pontos.map((ponto) => ponto.proventos),
            cor: "--serie-1",
            formatar: reais,
          },
          {
            nome: "Encargos",
            dados: pontos.map((ponto) => ponto.encargos),
            cor: "--serie-3",
            formatar: reais,
          },
        ],
        formatarEixo: (valor) => compacto(valor),
      }),
      el("div.legenda", {}, [
        el("span", {}, [el("i", { estilo: { background: "var(--serie-1)" } }), "Proventos"]),
        el("span", {}, [el("i", { estilo: { background: "var(--serie-3)" } }), "Encargos"]),
      ]),
    ]),
  });
}

function horaExtra() {
  const pontos = estado.historico.pontos;
  return cartao({
    titulo: "Hora extra sobre a folha",
    semPadding: true,
    corpo: el("div", {}, [
      grafico({
        tipo: "barra",
        categorias: pontos.map((ponto) => competenciaCurta(ponto.competencia)),
        series: [
          {
            nome: "Proporcao",
            dados: pontos.map((ponto) => Number((ponto.proporcao_hora_extra * 100).toFixed(2))),
            cor: "--serie-5",
            formatar: (valor) => `${valor}%`,
          },
        ],
        formatarEixo: (valor) => `${valor}%`,
      }),
      el("div.legenda", {}, [
        el("span.secundario", {
          texto: "Hora extra, DSR e adicional noturno sobre o total de proventos.",
        }),
      ]),
    ]),
  });
}

function turnover() {
  const pontos = estado.historico.pontos;
  return cartao({
    titulo: "Movimentacao do quadro",
    semPadding: true,
    corpo: el("div", {}, [
      grafico({
        tipo: "barra",
        categorias: pontos.map((ponto) => competenciaCurta(ponto.competencia)),
        series: [
          { nome: "Admissoes", dados: pontos.map((p) => p.admissoes), cor: "--serie-1", formatar: inteiro },
          { nome: "Rescisoes", dados: pontos.map((p) => p.rescisoes), cor: "--serie-2", formatar: inteiro },
        ],
      }),
      el("div.legenda", {}, [
        el("span", {}, [el("i", { estilo: { background: "var(--serie-1)" } }), "Admissoes"]),
        el("span", {}, [el("i", { estilo: { background: "var(--serie-2)" } }), "Rescisoes"]),
      ]),
    ]),
  });
}

function porObra() {
  const maior = Math.max(...estado.centros.map((centro) => centro.liquido));
  const grade = tabela({
    colunas: [
      { chave: "centro_custo", titulo: "Centro", celula: (linha) => el("span.mono", { texto: linha.centro_custo }) },
      { chave: "obra", titulo: "Obra", celula: (linha) => linha.obra || "—" },
      { chave: "pessoas", titulo: "Pessoas", num: true, celula: (linha) => inteiro(linha.pessoas) },
      { chave: "liquido", titulo: "Liquido", num: true, celula: (linha) => reais(linha.liquido) },
      {
        chave: "fatia",
        titulo: "Fatia",
        ordenavel: false,
        largura: "120px",
        celula: (linha) =>
          el("div.medidor", {}, el("span", { estilo: { "--fatia": linha.liquido / maior } })),
      },
    ],
    linhas: estado.centros,
    ordem: { chave: "liquido", desc: true },
    paginar: false,
  });

  return cartao({ titulo: "Custo por obra", semPadding: true, corpo: grade.elemento });
}

export async function montar() {
  const pontos = estado.historico.pontos;

  return el("div", {}, [
    cabecalhoPagina({
      titulo: `Competencia ${competenciaLonga(estado.competencia)}`,
      linha: `${estado.empresa.razao_social} · ${inteiro(estado.total.colaboradores)} colaboradores`,
      acoes: [
        el("button.btn", { type: "button", onClick: () => irPara("ponto") }, [
          icone("upload-simple"),
          "Importar ponto",
        ]),
        el("button.btn.btn-primario", { type: "button", onClick: () => irPara("folha") }, [
          icone("file-text"),
          "Abrir folha",
        ]),
      ],
    }),
    indicadores(),
    el("div.grade.grade-2", { estilo: { marginTop: "16px" } }, [evolucaoDoCusto(), horaExtra()]),
    el("div.grade.grade-2", { estilo: { marginTop: "16px" } }, [turnover(), porObra()]),
    el("div", { estilo: { marginTop: "16px" } }, [
      mensagem(
        `${estado.historico.aviso} Competencia apurada: ${competenciaLonga(pontos[pontos.length - 1].competencia)}.`,
        "",
        "info"
      ),
    ]),
  ]);
}
