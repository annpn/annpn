/**
 * Apuracao de ponto: duas entradas -- espelho do relogio ou planilha modelo
 * preenchida a mao -- e o mesmo caminho de apuracao para as duas.
 */

import {
  botao,
  cabecalhoPagina,
  cartao,
  chips,
  esqueletoTabela,
  etiqueta,
  kpi,
  mensagem,
} from "../componentes/basicos.js";
import { abrir, dados, secao } from "../componentes/gaveta.js";
import {
  desfechoDasLinhas,
  dicionarioDasColunas,
  gradeDoModelo,
} from "../componentes/planilha-modelo.js";
import { tabela } from "../componentes/tabela.js";
import { areaDeUpload, log } from "../componentes/upload.js";
import { el, icone, trocar } from "../nucleo/dom.js";
import { definirPonto, estado } from "../nucleo/estado.js";
import { horas, inteiro } from "../nucleo/formato.js";
import { baixar, blobCsv, blobXlsx, csvDoModelo, EXEMPLO } from "../nucleo/planilha.js";
import { irPara } from "../nucleo/roteador.js";
import { apurar, lerCsv } from "../dominio/ponto.js";

export const titulo = "Apuracao de ponto";

const NOME_MODELO = "modelo_apontamento_manual";

/** Importacao disparada da aba do modelo, consumida ao voltar para a aba de entrada. */
let pendente = null;

export function esqueleto() {
  return esqueletoTabela(6, 7);
}

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resumo(apuracao) {
  const { totais } = apuracao;
  return el("div.grade.grade-kpi.escalonar", {}, [
    kpi({ rotulo: "Colaboradores", valor: inteiro(totais.colaboradores), icone: "pessoas" }),
    kpi({ rotulo: "Dias apurados", valor: inteiro(totais.dias), icone: "calendario" }),
    kpi({ rotulo: "Extra 50%", valor: horas(totais.extras50), icone: "relogio" }),
    kpi({ rotulo: "Extra 100%", valor: horas(totais.extras100), icone: "relogio" }),
    kpi({ rotulo: "Atrasos", valor: horas(totais.atrasos), icone: "relogio" }),
    kpi({
      rotulo: "Faltas",
      valor: inteiro(totais.faltas),
      icone: "calendarioX",
      nota: totais.pendentes ? `${totais.pendentes} dias pendentes` : null,
    }),
  ]);
}

function abrirDetalhe(pessoa) {
  const grade = tabela({
    colunas: [
      {
        chave: "data",
        titulo: "Dia",
        valor: (linha) => linha.data.getTime(),
        celula: (linha) => el("span.mono", { texto: linha.data.toLocaleDateString("pt-BR") }),
      },
      {
        chave: "marcacoes",
        titulo: "Marcacoes",
        ordenavel: false,
        celula: (linha) =>
          el("span.mono", {
            texto: [linha.entrada, linha.saidaAlmoco, linha.retorno, linha.saida]
              .map((valor) => (valor === null ? "--:--" : horas(valor)))
              .join("  "),
          }),
      },
      {
        chave: "trabalhadas",
        titulo: "Trabalhadas",
        num: true,
        celula: (linha) => horas(linha.trabalhadas),
      },
      {
        chave: "extras",
        titulo: "Extra",
        num: true,
        valor: (linha) => linha.extras50 + linha.extras100,
        celula: (linha) => {
          const total = linha.extras50 + linha.extras100;
          return total ? horas(total) : "—";
        },
      },
      {
        chave: "tipo",
        titulo: "Situacao",
        celula: (linha) => {
          const tons = {
            normal: "",
            extra: "informacao",
            atraso: "alerta",
            falta: "erro",
            pendente: "alerta",
            convocacao: "informacao",
            folga: "",
          };
          return etiqueta(linha.tipo, tons[linha.tipo] ?? "");
        },
      },
    ],
    linhas: pessoa.detalhe,
    ordem: { chave: "data", desc: false },
    porPagina: 16,
  });

  abrir({
    titulo: pessoa.nome || `Matricula ${pessoa.matricula}`,
    conteudo: el("div", {}, [
      dados([
        ["Matricula", pessoa.matricula, true],
        ["Dias apurados", inteiro(pessoa.dias)],
        ["Horas trabalhadas", horas(pessoa.horasTrabalhadas), true],
        ["Hora extra 50%", horas(pessoa.extras50), true],
        ["Hora extra 100%", horas(pessoa.extras100), true],
        ["Atrasos", horas(pessoa.atrasos), true],
        ["Faltas", inteiro(pessoa.faltas)],
        ["DSR perdido", inteiro(pessoa.dsrPerdido)],
      ]),
      secao("Dia a dia", el("div.cartao", {}, grade.elemento)),
    ]),
  });
}

function tabelaDeApuracao(apuracao) {
  return tabela({
    colunas: [
      { chave: "matricula", titulo: "Matricula", celula: (l) => el("span.mono", { texto: l.matricula }) },
      { chave: "nome", titulo: "Colaborador" },
      { chave: "diasTrabalhados", titulo: "Dias", num: true, celula: (l) => inteiro(l.diasTrabalhados) },
      { chave: "horasTrabalhadas", titulo: "Horas", num: true, celula: (l) => horas(l.horasTrabalhadas) },
      { chave: "extras50", titulo: "Extra 50%", num: true, celula: (l) => (l.extras50 ? horas(l.extras50) : "—") },
      { chave: "extras100", titulo: "Extra 100%", num: true, celula: (l) => (l.extras100 ? horas(l.extras100) : "—") },
      { chave: "atrasos", titulo: "Atrasos", num: true, celula: (l) => (l.atrasos ? horas(l.atrasos) : "—") },
      {
        chave: "faltas",
        titulo: "Faltas",
        num: true,
        celula: (l) => (l.faltas ? etiqueta(String(l.faltas), "erro") : "—"),
      },
    ],
    linhas: apuracao.pessoas,
    ordem: { chave: "extras50", desc: true },
    aoClicar: abrirDetalhe,
    porPagina: 20,
  });
}

export async function montar({ argumentos }) {
  const aba = argumentos[0] === "modelo" ? "modelo" : "importar";
  const area = el("div");
  const registro = log();

  function desenharEntrada() {
    trocar(area, [
      el("div.caminhos", {}, [
        el("section.caminho-opcao", {}, [
          el("span.ordem", { texto: "Entrada 01" }),
          el("h3", { texto: "Arquivo do relogio de ponto" }),
          el("p", { texto: "Exportacao do espelho diario em CSV ou XLSX, no layout do proprio equipamento." }),
          areaDeUpload({
            aoReceber: processar,
            aoUsarExemplo: async () => {
              const resposta = await fetch(`dados/ponto_diario_${estado.competencia}.csv`);
              processar({
                nome: `ponto_diario_${estado.competencia}.csv`,
                texto: await resposta.text(),
              });
            },
          }),
        ]),
        el("section.caminho-opcao", {}, [
          el("span.ordem", { texto: "Entrada 02" }),
          el("h3", { texto: "Apontamento manual" }),
          el("p", {
            texto:
              "Empresa sem relogio de ponto: o sistema entrega a planilha modelo, ela volta preenchida e entra pela mesma apuracao.",
          }),
          el("div.caminho-previa", {}, gradeDoModelo(4)),
          el("div.acoes", {}, [
            botao({
              texto: "Ver planilha modelo",
              icone: "tabela",
              variante: "primario",
              aoClicar: () => irPara("ponto/modelo"),
            }),
            botao({
              texto: "Baixar .xlsx",
              icone: "baixar",
              aoClicar: () => baixar(blobXlsx(), `${NOME_MODELO}.xlsx`),
            }),
            botao({
              texto: "Baixar .csv",
              icone: "baixar",
              aoClicar: () => baixar(blobCsv(), `${NOME_MODELO}.csv`),
            }),
          ]),
        ]),
      ]),
    ]);
  }

  async function processar({ nome, texto, erro }) {
    registro.limpar();
    trocar(area, [
      cartao({
        titulo: "Processando",
        acoes: [el("span.mono.secundario", { texto: nome })],
        corpo: registro.elemento,
      }),
    ]);

    const voltar = () =>
      area.append(
        el(
          "div",
          { estilo: { marginTop: "16px" } },
          botao({ texto: "Tentar outro arquivo", icone: "desfazer", aoClicar: desenharEntrada })
        )
      );

    const leitura = registro.linha("Lendo o arquivo", "andamento");
    await espera(260);

    if (erro) {
      leitura.concluir("Nao foi possivel abrir o arquivo", "erro", erro);
      voltar();
      return;
    }

    const bruto = lerCsv(texto);

    if (bruto.erro) {
      leitura.concluir("Nao foi possivel ler o arquivo", "erro", bruto.erro);
      registro.linha(
        "Esperado: colunas de matricula, data e as marcacoes do dia",
        "alerta",
        bruto.colunasLidas ? `colunas lidas: ${bruto.colunasLidas.join(", ")}` : undefined
      );
      voltar();
      return;
    }

    leitura.concluir(
      `${inteiro(bruto.registros.length)} linhas lidas`,
      "ok",
      `separador "${bruto.separador}" · ${bruto.colunas.length} colunas`
    );

    if (bruto.rejeitadas.length) {
      registro.linha(
        `${bruto.rejeitadas.length} linhas rejeitadas`,
        "alerta",
        bruto.rejeitadas
          .slice(0, 3)
          .map((item) => `linha ${item.linha}: ${item.motivo}`)
          .join(" · ")
      );
    }

    const classificacao = registro.linha("Classificando os dias", "andamento");
    await espera(320);
    const apuracao = apurar(bruto.registros);
    classificacao.concluir(
      `${inteiro(apuracao.totais.dias)} dias classificados`,
      "ok",
      `${apuracao.totais.colaboradores} colaboradores`
    );

    const extras = registro.linha("Apurando hora extra e adicional", "andamento");
    await espera(260);
    extras.concluir(
      `${horas(apuracao.totais.extras50)} de extra 50% e ${horas(apuracao.totais.extras100)} de 100%`,
      "ok",
      "CLT art. 59 §1o · adicional de 100% em domingo por norma coletiva"
    );

    const faltas = registro.linha("Apurando faltas e atrasos", "andamento");
    await espera(220);
    faltas.concluir(
      `${apuracao.totais.faltas} faltas e ${horas(apuracao.totais.atrasos)} de atraso`,
      apuracao.totais.faltas ? "alerta" : "ok",
      "falta injustificada derruba o DSR da semana (Lei 605/1949 art. 6o)"
    );

    if (apuracao.totais.pendentes) {
      registro.linha(
        `${apuracao.totais.pendentes} dias com marcacao pendente`,
        "alerta",
        "dia com uma marcacao so nao e apurado: precisa de tratamento antes do fechamento"
      );
    }

    const conciliacao = registro.linha("Conciliando com o cadastro", "andamento");
    await espera(240);
    const conhecidos = apuracao.pessoas.filter((pessoa) =>
      estado.colaboradores.some((cadastro) => cadastro.matricula === pessoa.matricula)
    );
    conciliacao.concluir(
      `${conhecidos.length} de ${apuracao.pessoas.length} matriculas encontradas no cadastro`,
      conhecidos.length === apuracao.pessoas.length ? "ok" : "alerta",
      conhecidos.length === apuracao.pessoas.length
        ? undefined
        : "matricula fora do cadastro bloqueia o fechamento"
    );

    definirPonto(apuracao);
    await espera(200);
    desenharResultado(apuracao, nome);
  }

  function desenharResultado(apuracao, nome) {
    trocar(area, [
      resumo(apuracao),
      el("div", { estilo: { marginTop: "16px" } }, [
        cartao({
          titulo: "Apuracao por colaborador",
          acoes: [
            el("span.mono.secundario", { texto: nome }),
            botao({ texto: "Nova importacao", icone: "desfazer", aoClicar: desenharEntrada }),
            botao({
              texto: "Gerar folha",
              icone: "setaDireita",
              variante: "primario",
              aoClicar: () => irPara("folha"),
            }),
          ],
          semPadding: true,
          corpo: tabelaDeApuracao(apuracao).elemento,
        }),
      ]),
      el("div", { estilo: { marginTop: "16px" } }, [
        cartao({ titulo: "Log do processamento", corpo: registro.elemento }),
      ]),
    ]);
  }

  function desenharModelo() {
    trocar(area, [
      cartao({
        titulo: `${NOME_MODELO}.xlsx — aba Ponto`,
        acoes: [
          botao({
            texto: "Baixar .xlsx",
            icone: "baixar",
            variante: "primario",
            aoClicar: () => baixar(blobXlsx(), `${NOME_MODELO}.xlsx`),
          }),
          botao({
            texto: "Baixar .csv",
            icone: "baixar",
            aoClicar: () => baixar(blobCsv(), `${NOME_MODELO}.csv`),
          }),
          botao({
            texto: "Importar este exemplo",
            icone: "upload",
            aoClicar: () => {
              pendente = { nome: `${NOME_MODELO}.xlsx`, texto: csvDoModelo() };
              irPara("ponto");
            },
          }),
        ],
        semPadding: true,
        corpo: gradeDoModelo(),
      }),
      el("div", { estilo: { marginTop: "16px" } }, [
        mensagem(
          "O arquivo sai com o cabecalho congelado, as colunas formatadas como texto e uma segunda aba com o dicionario. As linhas de exemplo sao para apagar antes do uso.",
          "",
          "info"
        ),
      ]),
      el("div", { estilo: { marginTop: "16px" } }, [
        cartao({
          titulo: "Dicionario das colunas",
          semPadding: true,
          corpo: dicionarioDasColunas(),
        }),
      ]),
      el("div", { estilo: { marginTop: "16px" } }, [
        cartao({
          titulo: "O que a apuracao faz com cada linha de exemplo",
          semPadding: true,
          corpo: desfechoDasLinhas(),
        }),
      ]),
    ]);
  }

  const abas = chips({
    rotulo: "Entrada do ponto",
    valor: aba,
    opcoes: [
      { valor: "importar", rotulo: "Importar apuracao" },
      { valor: "modelo", rotulo: `Planilha modelo (${EXEMPLO.length} linhas)` },
    ],
    aoEscolher: (valor) => irPara(valor === "modelo" ? "ponto/modelo" : "ponto"),
  });
  abas.classList.add("abas-pagina");

  if (aba === "modelo") desenharModelo();
  else if (pendente) {
    const carga = pendente;
    pendente = null;
    processar(carga);
  } else if (estado.ponto) desenharResultado(estado.ponto, "apuracao da sessao");
  else desenharEntrada();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Apuracao de ponto",
      linha: "Espelho do relogio ou apontamento manual, apurados pela mesma regra",
      acoes: [
        botao({ texto: "Painel", icone: "setaEsquerda", aoClicar: () => irPara("painel") }),
      ],
    }),
    abas,
    area,
  ]);
}
