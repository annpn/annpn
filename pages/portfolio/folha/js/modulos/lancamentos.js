/**
 * Lancamento manual: atestado entregue depois do coletor, extra autorizada por
 * fora, falta abonada. Nada disso chega por arquivo.
 *
 * Motivo e autor sao obrigatorios -- sem os dois, tres meses depois o
 * lancamento e indistinguivel de erro de digitacao.
 */

import {
  botao,
  cabecalhoPagina,
  cartao,
  esqueletoTabela,
  etiqueta,
  kpi,
  mensagem,
} from "../componentes/basicos.js";
import { abrirFormulario, colunaDeAcoes, confirmarExclusao } from "../componentes/formulario.js";
import { abrir, dados, secao } from "../componentes/gaveta.js";
import { tabela } from "../componentes/tabela.js";
import { el, trocar } from "../nucleo/dom.js";
import { horas, inteiro, reais } from "../nucleo/formato.js";
import {
  apuracaoDe,
  db,
  excluirLancamento,
  folhaDe,
  lancar,
  todosOsLancamentos,
} from "../nucleo/store.js";
import { holerite } from "./contracheque.js";

export const titulo = "Lancamentos";

export function esqueleto() {
  return esqueletoTabela(8, 7);
}

/** Rubricas que a entrada manual aceita, com a unidade de cada uma. */
const RUBRICAS = [
  { codigo: "010", nome: "HORA EXTRA 50%", unidade: "horas" },
  { codigo: "011", nome: "HORA EXTRA 100%", unidade: "horas" },
  { codigo: "020", nome: "DSR SOBRE HORA EXTRA", unidade: "horas" },
  { codigo: "030", nome: "FALTA INJUSTIFICADA", unidade: "dias" },
  { codigo: "031", nome: "DSR PERDIDO POR FALTA", unidade: "dias" },
  { codigo: "035", nome: "ATRASOS E SAIDAS ANTECIPADAS", unidade: "horas" },
];

const nomeDaRubrica = (codigo) => RUBRICAS.find((r) => r.codigo === codigo)?.nome ?? codigo;
const unidadeDaRubrica = (codigo) => RUBRICAS.find((r) => r.codigo === codigo)?.unidade ?? "";

function campos() {
  return [
    {
      nome: "matricula",
      rotulo: "Matricula",
      tipo: "select",
      obrigatorio: true,
      largura: "span 2",
      opcoes: [...db.colaboradores.values()]
        .sort((a, b) => a.matricula.localeCompare(b.matricula))
        .map((pessoa) => ({ valor: pessoa.matricula, rotulo: `${pessoa.matricula} · ${pessoa.nome}` })),
    },
    {
      nome: "rubrica",
      rotulo: "Rubrica",
      tipo: "select",
      obrigatorio: true,
      opcoes: RUBRICAS.map((r) => ({ valor: r.codigo, rotulo: `${r.codigo} · ${r.nome}` })),
    },
    {
      nome: "quantidade",
      rotulo: "Quantidade",
      tipo: "number",
      obrigatorio: true,
      passo: "0.5",
      ajuda: "Horas em decimal (1,5 = 01:30) ou dias inteiros",
    },
    {
      nome: "motivo",
      rotulo: "Motivo",
      obrigatorio: true,
      largura: "span 2",
      ajuda: "Entra no historico da competencia e fica no relatorio de auditoria",
    },
    { nome: "autor", rotulo: "Autor", obrigatorio: true, padrao: "anna.nadal" },
  ];
}

export async function montar() {
  const area = el("div");
  const resumo = el("div");
  let atual = null;

  function abrirNovo() {
    abrirFormulario({
      titulo: "Novo lancamento manual",
      rotuloSalvar: "Lancar",
      campos: campos(),
      valores: { autor: "anna.nadal", quantidade: "" },
      aoSalvar: (registro) => {
        lancar(registro);
        desenhar();
      },
    });
  }

  function abrirEfeito(lancamento) {
    const pessoa = db.colaboradores.get(lancamento.matricula);
    const demonstrativo = folhaDe(lancamento.matricula);
    const apuracao = apuracaoDe(lancamento.matricula);

    abrir({
      titulo: `${lancamento.matricula} · ${pessoa?.nome ?? ""}`,
      conteudo: el("div", {}, [
        dados([
          ["Rubrica", `${lancamento.rubrica} · ${nomeDaRubrica(lancamento.rubrica)}`],
          [
            "Quantidade",
            unidadeDaRubrica(lancamento.rubrica) === "horas"
              ? horas(lancamento.quantidade)
              : `${lancamento.quantidade} dias`,
            true,
          ],
          ["Autor", lancamento.autor],
          ["Registrado em", lancamento.em.toLocaleString("pt-BR"), true],
        ]),
        secao("Motivo", el("p", { texto: lancamento.motivo })),
        secao(
          "Apuracao efetiva da competencia",
          dados([
            ["Hora extra 50%", horas(apuracao.extras50), true],
            ["Hora extra 100%", horas(apuracao.extras100), true],
            ["Reflexo em DSR", horas(apuracao.reflexoDsr), true],
            ["Faltas", String(apuracao.faltas)],
            ["Atrasos", horas(apuracao.atrasos), true],
          ])
        ),
        secao(
          "Recibo recalculado",
          el("div", {}, [
            mensagem(
              `Liquido do fechamento ${reais(pessoa?.fechado?.liquido)} · com o lancamento ${reais(demonstrativo.liquido)}.`,
              "alerta",
              "warning"
            ),
            el("div.hc-moldura", { estilo: { marginTop: "12px" } }, holerite(demonstrativo)),
          ])
        ),
      ]),
    });
  }

  function grade() {
    const linhas = todosOsLancamentos().map((lancamento) => ({
      ...lancamento,
      nome: db.colaboradores.get(lancamento.matricula)?.nome ?? "",
      liquido: folhaDe(lancamento.matricula)?.liquido ?? 0,
    }));

    return tabela({
      colunas: [
        { chave: "matricula", titulo: "Matricula", celula: (l) => el("span.mono", { texto: l.matricula }) },
        { chave: "nome", titulo: "Colaborador" },
        {
          chave: "rubrica",
          titulo: "Rubrica",
          celula: (l) =>
            el("div", {}, [
              el("span.mono", { texto: l.rubrica }),
              el("span.secundario", { texto: ` ${nomeDaRubrica(l.rubrica)}` }),
            ]),
        },
        {
          chave: "quantidade",
          titulo: "Quantidade",
          num: true,
          celula: (l) =>
            unidadeDaRubrica(l.rubrica) === "horas" ? horas(l.quantidade) : `${l.quantidade} dias`,
        },
        { chave: "liquido", titulo: "Liquido apos", num: true, celula: (l) => reais(l.liquido) },
        { chave: "motivo", titulo: "Motivo", celula: (l) => el("span.secundario", { texto: l.motivo }) },
        { chave: "autor", titulo: "Autor", celula: (l) => el("span.mono", { texto: l.autor }) },
        colunaDeAcoes({
          aoDetalhar: abrirEfeito,
          aoExcluir: (lancamento) =>
            confirmarExclusao({
              titulo: "Excluir lancamento",
              descricao: `O lancamento de ${nomeDaRubrica(lancamento.rubrica)} na matricula ${lancamento.matricula} sai da apuracao e a folha volta ao valor anterior.`,
              aoConfirmar: () => {
                excluirLancamento(lancamento.id);
                desenhar();
              },
            }),
          largura: "140px",
        }),
      ],
      linhas,
      ordem: { chave: "matricula", desc: false },
      aoClicar: abrirEfeito,
      porPagina: 20,
      vazio: {
        titulo: "Nenhum lancamento manual nesta competencia",
        descricao: "A folha esta usando apenas o apurado das fontes importadas.",
        acao: botao({ texto: "Novo lancamento", icone: "documento", aoClicar: abrirNovo }),
      },
    });
  }

  function desenhar() {
    const lista = todosOsLancamentos();
    const afetadas = new Set(lista.map((item) => item.matricula));
    const diferenca = [...afetadas].reduce((total, matricula) => {
      const pessoa = db.colaboradores.get(matricula);
      return total + ((folhaDe(matricula)?.liquido ?? 0) - (pessoa?.fechado?.liquido ?? 0));
    }, 0);

    trocar(
      resumo,
      el("div.grade.grade-kpi", {}, [
        kpi({ rotulo: "Lancamentos", valor: inteiro(lista.length), icone: "documento" }),
        kpi({ rotulo: "Matriculas afetadas", valor: inteiro(afetadas.size), icone: "pessoas" }),
        kpi({
          rotulo: "Efeito no liquido",
          valor: reais(Math.round(diferenca * 100) / 100),
          icone: "dinheiro",
          nota: "contra o fechamento oficial",
        }),
        kpi({
          rotulo: "Ponto importado",
          valor: db.ponto.size ? `${inteiro(db.ponto.size)} matriculas` : "nenhum",
          icone: "relogio",
        }),
      ])
    );

    atual = grade();
    trocar(area, cartao({ semPadding: true, corpo: atual.elemento }));
  }

  desenhar();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Lancamento manual de ponto e eventos",
      linha: "Entrada auditavel para o que nao chega por arquivo",
      acoes: [
        botao({
          texto: "Novo lancamento",
          icone: "documento",
          variante: "primario",
          aoClicar: abrirNovo,
        }),
      ],
    }),
    resumo,
    el("div", { estilo: { marginTop: "12px" } }, [area]),
    el("div", { estilo: { marginTop: "12px" } }, [
      mensagem(
        "Lancamento manual substitui o valor apurado daquela rubrica para a matricula, e recalcula a folha na hora. Motivo e autor sao obrigatorios.",
        "",
        "info"
      ),
    ]),
  ]);
}
