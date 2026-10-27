/** Cadastro de colaboradores: data grid com acoes e formulario de admissao. */

import {
  botao,
  busca,
  cabecalhoPagina,
  campo,
  cartao,
  esqueletoTabela,
  etiqueta,
  mensagem,
  seletor,
} from "../componentes/basicos.js";
import { abrirFormulario, colunaDeAcoes, confirmarExclusao } from "../componentes/formulario.js";
import { abrir, dados, secao } from "../componentes/gaveta.js";
import { tabela } from "../componentes/tabela.js";
import { el, trocar } from "../nucleo/dom.js";
import { cpf, inteiro, normalizar, reais } from "../nucleo/formato.js";
import {
  centrosComHierarquia,
  db,
  excluirColaborador,
  folhaDe,
  lancamentosDe,
  salvarColaborador,
} from "../nucleo/store.js";
import { holerite } from "./contracheque.js";

export const titulo = "Colaboradores";

export function esqueleto() {
  return esqueletoTabela(12, 8);
}

const filtros = { busca: "", centro: "", situacao: "", faixa: "" };

const FAIXAS = {
  "": null,
  ate2k: (pessoa) => pessoa.liquido < 2000,
  "2a5k": (pessoa) => pessoa.liquido >= 2000 && pessoa.liquido < 5000,
  acima5k: (pessoa) => pessoa.liquido >= 5000,
};

const VINCULOS = ["CLT", "CLT - Prazo determinado", "Aprendiz", "Estagio"];

/** Linha da grade: cadastro mais o demonstrativo derivado pelo store. */
const linhas = () =>
  [...db.colaboradores.values()].map((pessoa) => ({ ...pessoa, ...folhaDe(pessoa.matricula) }));

function camposDeCadastro() {
  return [
    { nome: "matricula", rotulo: "Matricula", obrigatorio: true, maximo: 12, exemplo: "100001" },
    { nome: "cpf", rotulo: "CPF", obrigatorio: true, maximo: 14, exemplo: "000.000.000-00" },
    { nome: "nome", rotulo: "Nome completo", obrigatorio: true, largura: "span 2" },
    { nome: "funcao", rotulo: "Funcao", obrigatorio: true },
    {
      nome: "centro",
      rotulo: "Centro de custo",
      tipo: "select",
      obrigatorio: true,
      opcoes: centrosComHierarquia().map((centro) => ({
        valor: centro.codigo,
        rotulo: `${centro.codigo} · ${centro.caminho}`,
      })),
    },
    {
      nome: "salario",
      rotulo: "Salario base",
      tipo: "number",
      obrigatorio: true,
      ajuda: "Valor mensal contratual, sem adicionais",
    },
    {
      nome: "dependentes",
      rotulo: "Dependentes para IRRF",
      tipo: "number",
      passo: "1",
      ajuda: "Zero significa nao declarado",
    },
    {
      nome: "vinculo",
      rotulo: "Vinculo",
      tipo: "select",
      opcoes: VINCULOS.map((item) => ({ valor: item, rotulo: item })),
    },
    {
      nome: "situacao",
      rotulo: "Situacao",
      tipo: "select",
      opcoes: [
        { valor: "ativo", rotulo: "Ativo" },
        { valor: "desligado", rotulo: "Desligado" },
      ],
    },
    { nome: "admissao", rotulo: "Admissao", exemplo: "dd/mm/aaaa" },
    { nome: "desligamento", rotulo: "Desligamento", exemplo: "dd/mm/aaaa" },
  ];
}

export async function montar() {
  const contador = el("span.contador");
  const area = el("div");
  let atual = null;

  function abrirCadastro(pessoa = null) {
    abrirFormulario({
      titulo: pessoa ? `Editar ${pessoa.nome}` : "Admissao de colaborador",
      rotuloSalvar: pessoa ? "Salvar alteracoes" : "Admitir",
      campos: camposDeCadastro(),
      valores: pessoa ?? { situacao: "ativo", vinculo: "CLT", dependentes: 0 },
      aoSalvar: (registro) => {
        salvarColaborador(registro, pessoa?.matricula ?? null);
        desenhar();
      },
    });
  }

  function abrirFicha(pessoa) {
    const demonstrativo = folhaDe(pessoa.matricula);
    const manuais = lancamentosDe(pessoa.matricula);

    abrir({
      titulo: pessoa.nome,
      acoes: [botao({ texto: "Editar", icone: "documento", aoClicar: () => abrirCadastro(pessoa) })],
      conteudo: el("div", {}, [
        dados([
          ["Matricula", pessoa.matricula, true],
          ["CPF", cpf(pessoa.cpf), true],
          ["Funcao", pessoa.funcao],
          ["Centro de custo", pessoa.centro],
          ["Vinculo", pessoa.vinculo ?? "CLT"],
          ["Admissao", pessoa.admissao, true],
          ["Dependentes", String(pessoa.dependentes)],
          ["Salario base", reais(pessoa.salario), true],
        ]),
        demonstrativo.origem === "recalculado"
          ? el("div", { estilo: { marginTop: "12px" } }, [
              mensagem(
                "Demonstrativo recalculado a partir do cadastro corrente e da apuracao de ponto da sessao.",
                "alerta",
                "warning"
              ),
            ])
          : null,
        manuais.length
          ? secao(
              "Lancamentos manuais",
              el(
                "ul.lista-simples",
                {},
                manuais.map((lancamento) =>
                  el("li", {}, [
                    el("span.mono", { texto: `${lancamento.rubrica} · ${lancamento.quantidade}` }),
                    el("span.secundario", { texto: ` ${lancamento.motivo} — ${lancamento.autor}` }),
                  ])
                )
              )
            )
          : null,
        secao("Recibo de pagamento", el("div.hc-moldura", {}, holerite(demonstrativo))),
      ]),
    });
  }

  function grade() {
    return tabela({
      colunas: [
        { chave: "matricula", titulo: "Matricula", celula: (l) => el("span.mono", { texto: l.matricula }) },
        { chave: "nome", titulo: "Nome" },
        { chave: "funcao", titulo: "Funcao", celula: (l) => el("span.secundario", { texto: l.funcao || "—" }) },
        { chave: "centro", titulo: "Centro", celula: (l) => el("span.mono", { texto: l.centro || "—" }) },
        { chave: "vinculo", titulo: "Vinculo", celula: (l) => el("span.secundario", { texto: l.vinculo || "CLT" }) },
        { chave: "dependentes", titulo: "Dep.", num: true },
        { chave: "salario", titulo: "Salario base", num: true, celula: (l) => reais(l.salario) },
        { chave: "liquido", titulo: "Liquido", num: true, celula: (l) => reais(l.liquido) },
        {
          chave: "situacao",
          titulo: "Situacao",
          celula: (l) => etiqueta(l.situacao, l.situacao === "ativo" ? "sucesso" : "erro"),
        },
        colunaDeAcoes({
          aoDetalhar: abrirFicha,
          aoEditar: abrirCadastro,
          aoExcluir: (pessoa) =>
            confirmarExclusao({
              titulo: `Excluir ${pessoa.nome}`,
              descricao: `A matricula ${pessoa.matricula} sai do cadastro da competencia e deixa de entrar na folha. A exclusao nao e desfeita.`,
              aoConfirmar: () => {
                excluirColaborador(pessoa.matricula);
                desenhar();
              },
            }),
        }),
      ],
      linhas: linhas(),
      ordem: { chave: "matricula", desc: false },
      aoClicar: abrirFicha,
      porPagina: 25,
      vazio: {
        titulo: "Nenhum colaborador com estes filtros",
        descricao: "Limpe os filtros ou admita um colaborador.",
        acao: botao({ texto: "Limpar filtros", icone: "funnel-x", aoClicar: () => limpar() }),
      },
    });
  }

  function aplicarFiltros() {
    const termo = normalizar(filtros.busca);
    atual.filtrar(
      "busca",
      termo ? (p) => normalizar(`${p.nome} ${p.matricula} ${p.funcao}`).includes(termo) : null
    );
    atual.filtrar("centro", filtros.centro ? (p) => p.centro === filtros.centro : null);
    atual.filtrar("situacao", filtros.situacao ? (p) => p.situacao === filtros.situacao : null);
    atual.filtrar("faixa", FAIXAS[filtros.faixa] ?? null);
    contador.textContent = `${inteiro(atual.total)} de ${inteiro(db.colaboradores.size)}`;
  }

  function desenhar() {
    atual = grade();
    trocar(area, cartao({ semPadding: true, corpo: atual.elemento }));
    aplicarFiltros();
  }

  function limpar() {
    Object.assign(filtros, { busca: "", centro: "", situacao: "", faixa: "" });
    for (const id of ["b-colaborador", "f-centro", "f-situacao", "f-faixa"]) {
      const controle = document.getElementById(id);
      if (controle) controle.value = "";
    }
    aplicarFiltros();
  }

  const barra = el("div.barra", {}, [
    busca({
      id: "b-colaborador",
      placeholder: "Nome, matricula ou funcao",
      aoDigitar: (valor) => {
        filtros.busca = valor;
        aplicarFiltros();
      },
    }),
    campo({
      rotulo: "Centro de custo",
      id: "f-centro",
      controle: seletor({
        id: "f-centro",
        opcoes: [
          { valor: "", rotulo: "Todos" },
          ...centrosComHierarquia().map((c) => ({ valor: c.codigo, rotulo: `${c.codigo} · ${c.nome}` })),
        ],
        aoMudar: (valor) => {
          filtros.centro = valor;
          aplicarFiltros();
        },
      }),
    }),
    campo({
      rotulo: "Situacao",
      id: "f-situacao",
      controle: seletor({
        id: "f-situacao",
        opcoes: [
          { valor: "", rotulo: "Todas" },
          { valor: "ativo", rotulo: "Ativo" },
          { valor: "desligado", rotulo: "Desligado" },
        ],
        aoMudar: (valor) => {
          filtros.situacao = valor;
          aplicarFiltros();
        },
      }),
    }),
    campo({
      rotulo: "Liquido",
      id: "f-faixa",
      controle: seletor({
        id: "f-faixa",
        opcoes: [
          { valor: "", rotulo: "Todas as faixas" },
          { valor: "ate2k", rotulo: "Ate 2.000,00" },
          { valor: "2a5k", rotulo: "De 2.000,00 a 5.000,00" },
          { valor: "acima5k", rotulo: "Acima de 5.000,00" },
        ],
        aoMudar: (valor) => {
          filtros.faixa = valor;
          aplicarFiltros();
        },
      }),
    }),
    botao({ texto: "Limpar", icone: "funnel-x", variante: "plano", aoClicar: () => limpar() }),
    contador,
  ]);

  desenhar();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Colaboradores",
      linha: "Cadastro da competencia · a alteracao reflete na folha imediatamente",
      acoes: [
        botao({
          texto: "Novo colaborador",
          icone: "pessoas",
          variante: "primario",
          aoClicar: () => abrirCadastro(),
        }),
      ],
    }),
    barra,
    area,
  ]);
}
