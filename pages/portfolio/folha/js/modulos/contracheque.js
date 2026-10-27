/**
 * Contracheque na forma do recibo de pagamento em papel (CLT art. 464), dentro
 * da gaveta. E a forma que quem recebe sabe conferir.
 */

import { botao, etiqueta, mensagem } from "../componentes/basicos.js";
import { abrir } from "../componentes/gaveta.js";
import { el, icone } from "../nucleo/dom.js";
import { estado } from "../nucleo/estado.js";
import { competenciaLonga, cpf, reais } from "../nucleo/formato.js";

/** Altura util do quadro de verbas, em linhas. */
const LINHAS_DO_QUADRO = 12;

function campo(rotulo, valor) {
  return el("div.hc-campo", {}, [
    el("span.hc-rotulo", { texto: rotulo }),
    el("span.hc-valor", { texto: valor ?? "—" }),
  ]);
}

export function holerite(pessoa) {
  const empresa = estado.empresa;

  return el("article.holerite", {}, [
    el("header.hc-faixa", {}, [
      el("div", {}, [
        el("strong", { texto: empresa.razao_social }),
        el("span.hc-sub", { texto: `CNPJ ${empresa.cnpj} · ${empresa.municipio}` }),
      ]),
      el("div.hc-faixa-dir", {}, [
        el("strong", { texto: "RECIBO DE PAGAMENTO DE SALARIO" }),
        el("span.hc-sub", { texto: `Competencia ${competenciaLonga(estado.competencia)}` }),
      ]),
    ]),

    el("section.hc-ident", {}, [
      campo("Matricula", pessoa.matricula),
      campo("Nome", pessoa.nome),
      campo("CPF", cpf(pessoa.cpf)),
      campo("Funcao", pessoa.funcao),
      campo("Centro de custo", pessoa.centro),
      campo("Obra", pessoa.obra),
      campo("Admissao", pessoa.admissao),
      campo("Dependentes", String(pessoa.dependentes ?? 0)),
    ]),

    el("table.hc-tabela", {}, [
      el(
        "thead",
        {},
        el("tr", {}, [
          el("th", { scope: "col" }, "Cod."),
          el("th", { scope: "col" }, "Descricao"),
          el("th", { scope: "col" }, "Referencia"),
          el("th", { scope: "col", class: "num" }, "Proventos"),
          el("th", { scope: "col", class: "num" }, "Descontos"),
        ])
      ),
      el("tbody", {}, [
        ...pessoa.linhas.map((linha) =>
          el("tr", {}, [
            el("td.hc-cod", {}, linha.codigo),
            el("td", {}, linha.descricao),
            el("td.hc-cod", {}, linha.referencia || ""),
            el("td.num", {}, linha.provento ? reais(linha.provento) : ""),
            el("td.num", {}, linha.desconto ? reais(linha.desconto) : ""),
          ])
        ),
        // O quadro tem altura fixa no papel: linha em branco completa o corpo
        // para o rodape cair sempre na mesma altura.
        ...Array.from({ length: Math.max(0, LINHAS_DO_QUADRO - pessoa.linhas.length) }, () =>
          el("tr.hc-vazia", {}, Array.from({ length: 5 }, () => el("td", {}, "")))
        ),
      ]),
      el(
        "tfoot",
        {},
        el("tr", {}, [
          el("td", {}, ""),
          el("td", {}, "TOTAIS"),
          el("td", {}, ""),
          el("td.num", {}, reais(pessoa.proventos)),
          el("td.num", {}, reais(pessoa.descontos)),
        ])
      ),
    ]),

    el("section.hc-liquido", {}, [
      el("span.hc-liquido-rotulo", { texto: "Liquido a receber" }),
      el("span.hc-liquido-valor", { texto: reais(pessoa.liquido) }),
    ]),

    el("section.hc-pe", {}, [
      campo("Salario base", reais(pessoa.salario)),
      campo("Base INSS", reais(pessoa.base_inss)),
      campo("Base FGTS", reais(pessoa.base_fgts)),
      campo("FGTS do mes", reais(pessoa.fgts)),
      campo("Base IRRF", reais(pessoa.base_irrf)),
    ]),

    el("p.hc-nota", {
      texto: [
        ...(pessoa.informativos ?? []).map((linha) => `${linha.descricao} ${linha.referencia}`),
        "FGTS: deposito do empregador, nao descontado do empregado",
      ].join("   |   "),
    }),

    el("footer.hc-quitacao", {}, [
      el("p", { texto: "Declaro ter recebido a importancia liquida discriminada neste recibo (CLT art. 464)." }),
      el("div.hc-assina", {}, [
        el("span", { texto: "Assinatura do empregado" }),
        el("span", { texto: "Data" }),
      ]),
    ]),
  ]);
}

/**
 * Abre o contracheque na gaveta. O download aponta para o PDF que o fechamento
 * emitiu: um segundo gerador de layout e onde a divergencia aparece primeiro.
 */
export function abrirContracheque(pessoa) {
  const arquivo = `contracheques_${estado.competencia}.pdf`;

  abrir({
    titulo: pessoa.nome,
    acoes: [
      el("a.btn", { href: `documentos/${arquivo}`, target: "_blank", rel: "noopener" }, [
        icone("file-pdf"),
        "Baixar PDF",
      ]),
      botao({ texto: "Imprimir", icone: "printer", variante: "primario", aoClicar: () => window.print() }),
    ],
    conteudo: el("div", {}, [
      pessoa.origem
        ? mensagem(
            "Demonstrativo recalculado com o ponto importado nesta sessao. O documento oficial e o do fechamento.",
            "alerta",
            "warning"
          )
        : null,
      !pessoa.comparavel && pessoa.motivo ? mensagem(pessoa.motivo, "alerta", "warning") : null,
      el("div.hc-moldura", {}, holerite(pessoa)),
    ]),
  });
}
