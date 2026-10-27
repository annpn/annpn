/**
 * Parametrizacao: centros, rubricas, tabelas de aliquota e catalogo de regras.
 *
 * Parametro de folha e dado de sistema, com vigencia e fonte ao lado do numero.
 * O formulario abre com o valor corrente e mostra o arquivo versionado de
 * destino; a demonstracao nao grava.
 */

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
import { abrirFormulario, colunaDeAcoes, confirmarExclusao } from "../componentes/formulario.js";
import { abrir, dados, secao } from "../componentes/gaveta.js";
import { tabela } from "../componentes/tabela.js";
import { el, trocar } from "../nucleo/dom.js";
import { estado } from "../nucleo/estado.js";
import { competenciaLonga, normalizar, porcento, reais } from "../nucleo/formato.js";
import { db, definirTributos, excluirRubrica, salvarFaixa, salvarRubrica } from "../nucleo/store.js";

export const titulo = "Parametrizacao";

export function esqueleto() {
  return esqueletoTabela(10, 6);
}

const ABAS = [
  { valor: "rubricas", rotulo: "Rubricas" },
  { valor: "tributos", rotulo: "Tabelas de aliquota" },
  { valor: "centros", rotulo: "Centros de custo" },
  { valor: "operacao", rotulo: "Operacao" },
  { valor: "regras", rotulo: "Catalogo de regras" },
];

const filtros = { aba: "rubricas", busca: "" };

const sim = (valor, rotulo) =>
  valor ? etiqueta(rotulo, "sucesso") : el("span.secundario", { texto: "—" });

function origem(arquivo) {
  return mensagem(
    `Parametro mantido em ${arquivo}, versionado no repositorio. A alteracao passa por revisao antes de valer na competencia.`,
    "",
    "info"
  );
}

/* -------------------------------- Rubricas -------------------------------- */

const SIM_NAO = [
  { valor: "0", rotulo: "Nao" },
  { valor: "1", rotulo: "Sim" },
];

function camposDeRubrica() {
  return [
    { nome: "codigo", rotulo: "Codigo", obrigatorio: true, maximo: 3, exemplo: "230" },
    { nome: "nome", rotulo: "Descricao", obrigatorio: true, largura: "span 2" },
    {
      nome: "tipo",
      rotulo: "Tipo",
      tipo: "select",
      obrigatorio: true,
      opcoes: ["provento", "desconto", "informativa", "base"].map((v) => ({ valor: v, rotulo: v })),
    },
    {
      nome: "unidade",
      rotulo: "Unidade",
      tipo: "select",
      opcoes: ["nenhuma", "horas", "dias"].map((v) => ({ valor: v, rotulo: v })),
    },
    { nome: "incide_inss", rotulo: "Incide INSS", tipo: "select", opcoes: SIM_NAO },
    { nome: "incide_irrf", rotulo: "Incide IRRF", tipo: "select", opcoes: SIM_NAO },
    { nome: "incide_fgts", rotulo: "Incide FGTS", tipo: "select", opcoes: SIM_NAO },
    { nome: "entra_liquido", rotulo: "Entra no liquido", tipo: "select", opcoes: SIM_NAO },
    {
      nome: "valoracao_base",
      rotulo: "Valoracao",
      tipo: "select",
      opcoes: ["nenhuma", "hora", "dia"].map((v) => ({ valor: v, rotulo: v })),
      ajuda: "Como a quantidade apurada vira dinheiro",
    },
    { nome: "valoracao_fator", rotulo: "Fator", tipo: "number", passo: "0.01", exemplo: "1.5" },
    {
      nome: "fundamento",
      rotulo: "Fundamento",
      largura: "span 2",
      ajuda: "Base legal ou norma coletiva que sustenta a incidencia",
    },
  ];
}

function abrirCadastroDeRubrica(rubrica, redesenhar) {
  abrirFormulario({
    titulo: rubrica ? `Editar rubrica ${rubrica.codigo}` : "Nova rubrica",
    rotuloSalvar: rubrica ? "Salvar alteracoes" : "Criar rubrica",
    campos: camposDeRubrica(),
    valores: rubrica
      ? {
          ...rubrica,
          incide_inss: rubrica.incide_inss ? "1" : "0",
          incide_irrf: rubrica.incide_irrf ? "1" : "0",
          incide_fgts: rubrica.incide_fgts ? "1" : "0",
          entra_liquido: rubrica.entra_liquido ? "1" : "0",
        }
      : { tipo: "provento", unidade: "nenhuma", valoracao_base: "nenhuma", entra_liquido: "1" },
    aoSalvar: (registro) => {
      salvarRubrica(registro, rubrica?.codigo ?? null);
      redesenhar();
    },
  });
}


function abrirRubrica(rubrica, parametros) {
  abrir({
    titulo: `${rubrica.codigo} · ${rubrica.nome}`,
    conteudo: el("div", {}, [
      dados([
        ["Codigo", rubrica.codigo, true],
        ["Tipo", rubrica.tipo],
        ["Fonte", rubrica.fonte],
        ["Unidade", rubrica.unidade],
        ["Valoracao", rubrica.valoracao_base === "nenhuma" ? "valor da origem" : `${rubrica.valoracao_base} × ${rubrica.valoracao_fator}`],
      ]),
      secao(
        "Incidencia",
        el("div.dados", {}, [
          el("div.dado", {}, [el("p.rotulo", { texto: "INSS" }), sim(rubrica.incide_inss, "incide")]),
          el("div.dado", {}, [el("p.rotulo", { texto: "IRRF" }), sim(rubrica.incide_irrf, "incide")]),
          el("div.dado", {}, [el("p.rotulo", { texto: "FGTS" }), sim(rubrica.incide_fgts, "incide")]),
          el("div.dado", {}, [el("p.rotulo", { texto: "Liquido" }), sim(rubrica.entra_liquido, "entra")]),
        ])
      ),
      secao("Fundamento", el("p", { texto: rubrica.fundamento })),
      secao("Origem do parametro", origem(parametros.origem.rubricas)),
    ]),
  });
}

function painelRubricas(parametros, termo, redesenhar) {
  const todas = db.rubricas.size ? [...db.rubricas.values()] : parametros.rubricas;
  const linhas = todas
    .filter(
      (rubrica) =>
        !termo ||
        normalizar(`${rubrica.codigo} ${rubrica.nome} ${rubrica.fundamento}`).includes(termo)
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  const grade = tabela({
    colunas: [
      { chave: "codigo", titulo: "Codigo", celula: (l) => el("span.mono", { texto: l.codigo }) },
      { chave: "nome", titulo: "Rubrica" },
      { chave: "tipo", titulo: "Tipo", celula: (l) => el("span.secundario", { texto: l.tipo }) },
      { chave: "fonte", titulo: "Fonte", celula: (l) => el("span.secundario", { texto: l.fonte }) },
      { chave: "unidade", titulo: "Unidade", celula: (l) => el("span.secundario", { texto: l.unidade }) },
      { chave: "incide_inss", titulo: "INSS", celula: (l) => sim(l.incide_inss, "sim") },
      { chave: "incide_irrf", titulo: "IRRF", celula: (l) => sim(l.incide_irrf, "sim") },
      { chave: "incide_fgts", titulo: "FGTS", celula: (l) => sim(l.incide_fgts, "sim") },
      { chave: "entra_liquido", titulo: "Liquido", celula: (l) => sim(l.entra_liquido, "sim") },
      {
        chave: "valoracao_base",
        titulo: "Valoracao",
        celula: (l) =>
          el("span.secundario", {
            texto: l.valoracao_base === "nenhuma" ? "valor da origem" : `${l.valoracao_base} × ${l.valoracao_fator}`,
          }),
      },
      { chave: "fundamento", titulo: "Fundamento", celula: (l) => el("span.secundario", { texto: l.fundamento }) },
      colunaDeAcoes({
        aoDetalhar: (linha) => abrirRubrica(linha, parametros),
        aoEditar: (linha) => abrirCadastroDeRubrica(linha, redesenhar),
        aoExcluir: (linha) =>
          confirmarExclusao({
            titulo: `Excluir rubrica ${linha.codigo}`,
            descricao: `A rubrica ${linha.nome} sai do catalogo e deixa de ser aceita nos lancamentos.`,
            aoConfirmar: () => {
              excluirRubrica(linha.codigo);
              redesenhar();
            },
          }),
        largura: "150px",
      }),
    ],
    linhas,
    ordem: { chave: "codigo", desc: false },
    aoClicar: (linha) => abrirRubrica(linha, parametros),
    porPagina: 25,
  });

  return cartao({
    titulo: `Catalogo de rubricas · ${linhas.length} de ${todas.length}`,
    acoes: [
      el("span.secundario", { texto: parametros.origem.rubricas }),
      botao({
        texto: "Nova rubrica",
        icone: "documento",
        variante: "primario",
        aoClicar: () => abrirCadastroDeRubrica(null, redesenhar),
      }),
    ],
    semPadding: true,
    corpo: grade.elemento,
  });
}

/* -------------------------------- Tributos -------------------------------- */

function abrirFaixa(tributo, indice, faixa, redesenhar) {
  abrirFormulario({
    titulo: `Faixa ${indice + 1} de ${tributo.toUpperCase()}`,
    rotuloSalvar: "Salvar faixa",
    campos: [
      { nome: "de", rotulo: "De (R$)", tipo: "number", obrigatorio: true },
      {
        nome: "ate",
        rotulo: "Ate (R$)",
        tipo: "number",
        ajuda: "Vazio significa a ultima faixa, sem limite superior",
      },
      {
        nome: "aliquota",
        rotulo: "Aliquota",
        tipo: "number",
        obrigatorio: true,
        passo: "0.001",
        ajuda: "Decimal: 0,075 para 7,5%",
      },
      ...(tributo === "irrf"
        ? [{ nome: "parcela_deduzir", rotulo: "Parcela a deduzir (R$)", tipo: "number", passo: "0.01" }]
        : []),
    ],
    valores: { ...faixa, ate: faixa.ate ?? "" },
    aoSalvar: (registro) => {
      salvarFaixa(tributo, indice, registro);
      redesenhar();
    },
  });
}

function painelTributos(parametros, redesenhar) {
  if (!db.tributos) definirTributos(parametros.tributos);
  const { inss, irrf, vigencia } = db.tributos;

  const faixasInss = tabela({
    colunas: [
      { chave: "de", titulo: "De", num: true, celula: (l) => reais(l.de) },
      { chave: "ate", titulo: "Ate", num: true, celula: (l) => reais(l.ate) },
      { chave: "aliquota", titulo: "Aliquota", num: true, celula: (l) => porcento(l.aliquota, 1) },
      colunaDeAcoes({
        aoEditar: (linha) => abrirFaixa("inss", inss.faixas.indexOf(linha), linha, redesenhar),
        largura: "90px",
      }),
    ],
    linhas: inss.faixas,
    paginar: false,
  });

  const faixasIrrf = tabela({
    colunas: [
      { chave: "de", titulo: "De", num: true, celula: (l) => reais(l.de) },
      { chave: "ate", titulo: "Ate", num: true, celula: (l) => (l.ate === null ? "acima" : reais(l.ate)) },
      { chave: "aliquota", titulo: "Aliquota", num: true, celula: (l) => porcento(l.aliquota, 1) },
      { chave: "parcela_deduzir", titulo: "Parcela a deduzir", num: true, celula: (l) => reais(l.parcela_deduzir) },
      colunaDeAcoes({
        aoEditar: (linha) => abrirFaixa("irrf", irrf.faixas.indexOf(linha), linha, redesenhar),
        largura: "90px",
      }),
    ],
    linhas: irrf.faixas,
    paginar: false,
  });

  return el("div", {}, [
    el("div.grade.grade-2", {}, [
      cartao({
        titulo: "INSS · contribuicao do segurado",
        acoes: [etiqueta(`teto ${reais(inss.teto)}`, "", true)],
        semPadding: true,
        corpo: el("div", {}, [
          faixasInss.elemento,
          el("div.cartao-corpo", {}, [
            el("p.secundario", { texto: inss.base_legal }),
            el("p.secundario", {
              texto: "Progressiva: cada aliquota incide so sobre a parcela da base que cai na faixa.",
            }),
          ]),
        ]),
      }),
      cartao({
        titulo: "IRRF · tabela progressiva mensal",
        semPadding: true,
        corpo: el("div", {}, [
          faixasIrrf.elemento,
          el("div.cartao-corpo", {}, [
            el("p.secundario", { texto: irrf.base_legal }),
          ]),
        ]),
      }),
    ]),
    el("div.grade.grade-2", { estilo: { marginTop: "12px" } }, [
      cartao({
        titulo: "Deducoes do IRRF",
        corpo: dados([
          ["Dependente", reais(irrf.dependente), true],
          ["Desconto simplificado", reais(irrf.desconto_simplificado), true],
          ["Criterio", "a que resultar em menos imposto, por pessoa e por mes"],
        ]),
      }),
      cartao({
        titulo: "Redutor do IRRF",
        corpo: el("div", {}, [
          dados([
            ["Isencao integral ate", reais(irrf.redutor.isencao_integral), true],
            ["Limite superior", reais(irrf.redutor.limite), true],
            ["Coeficiente", reais(irrf.redutor.coeficiente), true],
            ["Fator", String(irrf.redutor.fator), true],
          ]),
          el("p.secundario", { estilo: { marginTop: "12px" }, texto: irrf.redutor.base_legal }),
        ]),
      }),
    ]),
    el("div", { estilo: { marginTop: "12px" } }, [
      cartao({
        titulo: "Vigencia",
        corpo: el("div", {}, [
          dados([
            ["Inicio", vigencia.inicio, true],
            ["Fim", vigencia.fim, true],
            ["Competencia corrente", competenciaLonga(parametros.competencia)],
          ]),
          el("div", { estilo: { marginTop: "12px" } }, [
            mensagem(
              "Competencia fora da vigencia derruba o fechamento. Tabela desatualizada nao avisa: devolve numero plausivel e errado.",
              "alerta",
              "warning"
            ),
          ]),
          el("div", { estilo: { marginTop: "12px" } }, [origem(parametros.origem.tributos)]),
        ]),
      }),
    ]),
  ]);
}

/* --------------------------- Centros e operacao --------------------------- */

function painelCentros(parametros) {
  const porCentro = new Map(estado.centros.map((centro) => [centro.centro_custo, centro]));
  const linhas = parametros.operacao.centros_custo.map((centro) => ({
    ...centro,
    pessoas: porCentro.get(centro.codigo)?.pessoas ?? 0,
    liquido: porCentro.get(centro.codigo)?.liquido ?? 0,
  }));

  const grade = tabela({
    colunas: [
      { chave: "codigo", titulo: "Codigo", celula: (l) => el("span.mono", { texto: l.codigo }) },
      { chave: "nome", titulo: "Centro de custo" },
      { chave: "pessoas", titulo: "Quadro", num: true },
      { chave: "liquido", titulo: "Liquido da competencia", num: true, celula: (l) => reais(l.liquido) },
      {
        chave: "situacao",
        titulo: "Situacao",
        celula: (l) => (l.pessoas ? etiqueta("ativo", "sucesso") : etiqueta("sem quadro", "", true)),
      },
    ],
    linhas,
    ordem: { chave: "codigo", desc: false },
    paginar: false,
  });

  return cartao({
    titulo: "Centros de custo",
    acoes: [el("span.secundario", { texto: parametros.origem.operacao })],
    semPadding: true,
    corpo: grade.elemento,
  });
}

function painelOperacao(parametros) {
  const { operacao } = parametros;
  const blocos = [
    ["Beneficio", operacao.beneficio, { vr_valor_dia: "VR por dia", va_valor_dia: "VA por dia", coparticipacao_percentual: "Coparticipacao", coparticipacao_limite_pat: "Teto do PAT" }],
    ["Jornada", operacao.jornada, { divisor_mensal: "Divisor mensal", dias_mes: "Dias do mes" }],
    ["Piso", operacao.piso, { salario_minimo: "Salario minimo" }],
    ["FGTS", operacao.fgts, { aliquota: "Aliquota" }],
    ["Tolerancia", operacao.tolerancia, {
      beneficio_centavos: "Beneficio (centavos)",
      coparticipacao_centavos: "Coparticipacao (centavos)",
      hora_extra_multiplo_mediana: "Hora extra: multiplo da mediana",
      hora_extra_minimo_horas: "Hora extra: minimo de horas",
    }],
  ];

  return el("div.grade.grade-2", {},
    blocos
      .filter(([, valores]) => valores)
      .map(([titulo, valores, rotulos]) =>
        cartao({
          titulo,
          corpo: el("div", {}, [
            dados(
              Object.entries(rotulos).map(([chave, rotulo]) => {
                const valor = valores[chave];
                if (valor === undefined) return null;
                const texto =
                  typeof valor === "number" && valor > 0 && valor < 1
                    ? porcento(valor, 1)
                    : typeof valor === "number"
                      ? reais(valor)
                      : String(valor);
                return [rotulo, texto, true];
              })
            ),
            valores.fonte
              ? el("p.secundario", { estilo: { marginTop: "12px" }, texto: valores.fonte })
              : null,
          ]),
        })
      )
  );
}

/* --------------------------------- Regras --------------------------------- */

function painelRegras(parametros, termo) {
  const linhas = parametros.regras.filter(
    (regra) => !termo || normalizar(`${regra.numero} ${regra.nome} ${regra.grupo}`).includes(termo)
  );

  const tom = { motor: "sucesso", leitura: "informacao", ausente: "" };
  const grade = tabela({
    colunas: [
      { chave: "numero", titulo: "#", celula: (l) => el("span.mono", { texto: String(l.numero).padStart(2, "0") }) },
      { chave: "grupo", titulo: "Grupo", celula: (l) => el("span.secundario", { texto: l.grupo }) },
      { chave: "nome", titulo: "Regra" },
      {
        chave: "severidade",
        titulo: "Severidade",
        celula: (l) => etiqueta(l.severidade, l.severidade === "bloqueia" ? "erro" : "alerta"),
      },
      {
        chave: "implementacao",
        titulo: "Execucao",
        celula: (l) => etiqueta(l.implementacao, tom[l.implementacao] ?? ""),
      },
      { chave: "fundamento", titulo: "Fundamento", celula: (l) => el("span.secundario", { texto: l.fundamento }) },
      { chave: "observacao", titulo: "Observacao", celula: (l) => el("span.secundario", { texto: l.observacao }) },
    ],
    linhas,
    ordem: { chave: "numero", desc: false },
    porPagina: 30,
  });

  return cartao({
    titulo: `Catalogo de regras · ${linhas.length} de ${parametros.regras.length}`,
    acoes: [el("span.secundario", { texto: parametros.origem.regras })],
    semPadding: true,
    corpo: grade.elemento,
  });
}

/* --------------------------------- Montagem ------------------------------- */

export async function montar() {
  const resposta = await fetch("dados/parametros.json", { cache: "no-store" });
  const parametros = await resposta.json();

  const corpo = el("div");

  function desenhar() {
    const termo = normalizar(filtros.busca);
    const paineis = {
      rubricas: () => painelRubricas(parametros, termo, desenhar),
      tributos: () => painelTributos(parametros, desenhar),
      centros: () => painelCentros(parametros),
      operacao: () => painelOperacao(parametros),
      regras: () => painelRegras(parametros, termo),
    };
    trocar(corpo, paineis[filtros.aba]());
  }

  const abas = chips({
    rotulo: "Grupo de parametro",
    valor: filtros.aba,
    opcoes: ABAS,
    aoEscolher: (valor) => {
      filtros.aba = valor;
      for (const chip of document.querySelectorAll("#abas-parametros .chip")) {
        const alvo = ABAS.find((aba) => aba.rotulo === chip.textContent.trim());
        chip.setAttribute("aria-pressed", String(alvo?.valor === valor));
      }
      desenhar();
    },
  });
  abas.id = "abas-parametros";

  desenhar();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Parametrizacao",
      linha: "Rubricas, tabelas de aliquota, centros de custo e catalogo de regras",
    }),
    el("div.barra", {}, [
      abas,
      busca({
        id: "b-parametro",
        placeholder: "Codigo, nome ou fundamento",
        aoDigitar: (valor) => {
          filtros.busca = valor;
          desenhar();
        },
      }),
    ]),
    corpo,
  ]);
}
