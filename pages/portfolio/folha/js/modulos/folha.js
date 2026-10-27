/**
 * Folha da competencia, com fechado e recalculado lado a lado quando ha ponto
 * importado. Recalcular sem mostrar contra o que esconde o que se quer conferir.
 */

import {
  botao,
  cabecalhoPagina,
  cartao,
  chips,
  esqueletoKpi,
  etiqueta,
  kpi,
  mensagem,
} from "../componentes/basicos.js";
import { tabela } from "../componentes/tabela.js";
import { el, trocar } from "../nucleo/dom.js";
import { estado } from "../nucleo/estado.js";
import { competenciaLonga, inteiro, moeda, reais } from "../nucleo/formato.js";
import { irPara } from "../nucleo/roteador.js";
import { calcularDemonstrativo } from "../dominio/tributos.js";
import { abrirContracheque } from "./contracheque.js";

export const titulo = "Folha de pagamento";

export function esqueleto() {
  return el("div.grade.grade-kpi", {}, Array.from({ length: 5 }, esqueletoKpi));
}

/** Recalcula a folha das pessoas que vieram no ponto importado. */
function recalcular() {
  if (!estado.ponto) return null;

  const recalculados = [];
  for (const apurado of estado.ponto.pessoas) {
    const cadastro = estado.colaboradores.find((pessoa) => pessoa.matricula === apurado.matricula);
    if (!cadastro) continue;
    recalculados.push({
      demonstrativo: calcularDemonstrativo({ cadastro, ponto: apurado }),
      fechado: cadastro,
    });
  }
  return recalculados;
}

function totais(lista, campo) {
  return lista.reduce((soma, item) => soma + item[campo], 0);
}

function indicadores() {
  const total = estado.total;
  return el("div.grade.grade-kpi.escalonar", {}, [
    kpi({ rotulo: "Proventos", valor: moeda(total.proventos), icone: "plus-circle" }),
    kpi({ rotulo: "Descontos", valor: moeda(total.descontos), icone: "minus-circle" }),
    kpi({ rotulo: "Liquido a pagar", valor: moeda(total.liquido), icone: "hand-coins" }),
    kpi({ rotulo: "INSS", valor: moeda(total.inss), icone: "bank" }),
    kpi({ rotulo: "IRRF", valor: moeda(total.irrf), icone: "receipt" }),
    kpi({ rotulo: "FGTS", valor: moeda(total.fgts), icone: "vault" }),
  ]);
}

function tabelaDaFolha(linhas) {
  return tabela({
    colunas: [
      {
        chave: "matricula",
        titulo: "Matricula",
        celula: (l) => el("span.mono", { texto: l.matricula }),
      },
      { chave: "nome", titulo: "Colaborador" },
      { chave: "funcao", titulo: "Funcao", celula: (l) => el("span.secundario", { texto: l.funcao || "—" }) },
      { chave: "centro", titulo: "Centro", celula: (l) => el("span.mono", { texto: l.centro || "—" }) },
      { chave: "proventos", titulo: "Proventos", num: true, celula: (l) => reais(l.proventos) },
      { chave: "descontos", titulo: "Descontos", num: true, celula: (l) => reais(l.descontos) },
      { chave: "liquido", titulo: "Liquido", num: true, celula: (l) => reais(l.liquido) },
    ],
    linhas,
    ordem: { chave: "matricula", desc: false },
    aoClicar: (linha) => abrirContracheque(linha),
    rodape: {
      celulas: [
        "Total",
        `${inteiro(linhas.length)} colaboradores`,
        "",
        "",
        reais(totais(linhas, "proventos")),
        reais(totais(linhas, "descontos")),
        reais(totais(linhas, "liquido")),
      ],
    },
    porPagina: 20,
  });
}

function comparativo(recalculados) {
  const linhas = recalculados.map(({ demonstrativo, fechado }) => ({
    matricula: demonstrativo.matricula,
    nome: demonstrativo.nome,
    liquidoFechado: fechado.liquido,
    liquidoRecalculado: demonstrativo.liquido,
    diferenca: Number((demonstrativo.liquido - fechado.liquido).toFixed(2)),
    demonstrativo,
  }));

  const divergentes = linhas.filter((linha) => Math.abs(linha.diferenca) > 0.01);

  const grade = tabela({
    colunas: [
      { chave: "matricula", titulo: "Matricula", celula: (l) => el("span.mono", { texto: l.matricula }) },
      { chave: "nome", titulo: "Colaborador" },
      { chave: "liquidoFechado", titulo: "Fechado", num: true, celula: (l) => reais(l.liquidoFechado) },
      {
        chave: "liquidoRecalculado",
        titulo: "Com o ponto importado",
        num: true,
        celula: (l) => reais(l.liquidoRecalculado),
      },
      {
        chave: "diferenca",
        titulo: "Diferenca",
        num: true,
        celula: (l) =>
          Math.abs(l.diferenca) <= 0.01
            ? el("span.secundario", { texto: "—" })
            : etiqueta(
                (l.diferenca > 0 ? "+" : "") + reais(l.diferenca),
                l.diferenca > 0 ? "informacao" : "alerta"
              ),
      },
    ],
    linhas,
    ordem: { chave: "diferenca", desc: true },
    aoClicar: (linha) => abrirContracheque(linha.demonstrativo),
    porPagina: 15,
  });

  return cartao({
    titulo: "Fechado contra ponto importado",
    acoes: [
      etiqueta(
        `${divergentes.length} de ${linhas.length} divergem`,
        divergentes.length ? "alerta" : "sucesso"
      ),
    ],
    semPadding: true,
    corpo: el("div", {}, [
      el("div.cartao-corpo", {}, [
        mensagem(
          "O recalculo usa o espelho de ponto importado nesta sessao e o cadastro da competencia. " +
            "A divergencia e esperada: o fechamento oficial apurou outro periodo.",
          "",
          "info"
        ),
      ]),
      grade.elemento,
    ]),
  });
}

export async function montar() {
  const recalculados = recalcular();
  const corpo = el("div");

  const abas = recalculados
    ? chips({
        rotulo: "Origem da folha",
        valor: "fechada",
        opcoes: [
          { valor: "fechada", rotulo: "Folha fechada" },
          { valor: "comparativo", rotulo: "Com o ponto importado" },
        ],
        aoEscolher: (valor) => {
          for (const chip of corpo.parentElement.querySelectorAll(".chip")) {
            chip.setAttribute("aria-pressed", String(chip.textContent.trim() === (valor === "fechada" ? "Folha fechada" : "Com o ponto importado")));
          }
          trocar(corpo, valor === "fechada" ? painelDaFolha() : comparativo(recalculados));
        },
      })
    : null;

  function painelDaFolha() {
    return el("div", {}, [
      indicadores(),
      el("div", { estilo: { marginTop: "16px" } }, [
        cartao({
          titulo: "Folha da competencia",
          acoes: [el("span.secundario", { texto: "clique numa linha para abrir o contracheque" })],
          semPadding: true,
          corpo: tabelaDaFolha(estado.colaboradores).elemento,
        }),
      ]),
    ]);
  }

  trocar(corpo, painelDaFolha());

  return el("div", {}, [
    cabecalhoPagina({
      titulo: `Folha de ${competenciaLonga(estado.competencia)}`,
      linha: estado.ponto
        ? "Ha ponto importado nesta sessao: a folha pode ser conferida contra ele"
        : "Fechamento consolidado das quatro fontes da competencia",
      acoes: [
        abas,
        botao({
          texto: estado.ponto ? "Nova importacao" : "Importar ponto",
          icone: "upload-simple",
          aoClicar: () => irPara("ponto"),
        }),
      ].filter(Boolean),
    }),
    corpo,
  ]);
}
