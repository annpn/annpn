/** Cadastro de centros de custo, com hierarquia. */

import {
  botao,
  busca,
  cabecalhoPagina,
  cartao,
  esqueletoTabela,
  etiqueta,
  mensagem,
} from "../componentes/basicos.js";
import { abrirFormulario, colunaDeAcoes, confirmarExclusao } from "../componentes/formulario.js";
import { tabela } from "../componentes/tabela.js";
import { el, trocar } from "../nucleo/dom.js";
import { inteiro, normalizar, reais } from "../nucleo/formato.js";
import {
  centrosComHierarquia,
  db,
  excluirCentro,
  porCentroDeCusto,
  salvarCentro,
} from "../nucleo/store.js";

export const titulo = "Centros de custo";

export function esqueleto() {
  return esqueletoTabela(8, 6);
}

const filtros = { busca: "" };

/** Linha da grade: cadastro, quadro e o custo que o centro carrega no mes. */
function linhas() {
  const custo = new Map(porCentroDeCusto().map((linha) => [linha.centro_custo, linha]));
  return centrosComHierarquia().map((centro) => ({
    ...centro,
    liquido: custo.get(centro.codigo)?.liquido ?? 0,
    proventos: custo.get(centro.codigo)?.proventos ?? 0,
  }));
}

function campos(centro) {
  // O proprio centro e os seus descendentes ficam fora da lista de pai: pai
  // ciclico derruba o calculo do caminho hierarquico.
  const descendentes = new Set();
  const marcar = (codigo) => {
    descendentes.add(codigo);
    for (const filho of db.centros.values()) {
      if (filho.pai === codigo && !descendentes.has(filho.codigo)) marcar(filho.codigo);
    }
  };
  if (centro) marcar(centro.codigo);

  return [
    {
      nome: "codigo",
      rotulo: "Codigo",
      obrigatorio: true,
      maximo: 10,
      exemplo: "CC06",
      ajuda: "Usado no rateio e no arquivo de eventos",
    },
    { nome: "nome", rotulo: "Nome do setor ou obra", obrigatorio: true, largura: "span 2" },
    {
      nome: "pai",
      rotulo: "Subordinado a",
      tipo: "select",
      opcoes: [
        { valor: "", rotulo: "Nenhum (primeiro nivel)" },
        ...centrosComHierarquia()
          .filter((item) => !descendentes.has(item.codigo))
          .map((item) => ({ valor: item.codigo, rotulo: `${item.codigo} · ${item.caminho}` })),
      ],
    },
  ];
}

export async function montar() {
  const area = el("div");
  const contador = el("span.contador");
  let atual = null;

  function abrirCadastro(centro = null) {
    abrirFormulario({
      titulo: centro ? `Editar ${centro.nome}` : "Novo setor",
      rotuloSalvar: centro ? "Salvar alteracoes" : "Criar",
      campos: campos(centro),
      valores: centro ?? { pai: "" },
      aoSalvar: (registro) => {
        salvarCentro(registro, centro?.codigo ?? null);
        desenhar();
      },
    });
  }

  function grade() {
    return tabela({
      colunas: [
        { chave: "codigo", titulo: "Codigo", celula: (l) => el("span.mono", { texto: l.codigo }) },
        {
          chave: "caminho",
          titulo: "Hierarquia",
          celula: (l) =>
            el("div", {}, [
              // Recuo por nivel: a arvore se le na grade sem componente extra.
              l.nivel ? el("span.secundario", { texto: "— ".repeat(l.nivel) }) : null,
              el("span", { texto: l.nome }),
              l.nivel ? el("p.secundario", { texto: l.caminho }) : null,
            ]),
        },
        { chave: "pessoas", titulo: "Quadro", num: true, celula: (l) => inteiro(l.pessoas) },
        { chave: "proventos", titulo: "Proventos", num: true, celula: (l) => reais(l.proventos) },
        { chave: "liquido", titulo: "Liquido", num: true, celula: (l) => reais(l.liquido) },
        {
          chave: "situacao",
          titulo: "Situacao",
          celula: (l) => etiqueta(l.pessoas ? "ativo" : "sem quadro", l.pessoas ? "sucesso" : ""),
        },
        colunaDeAcoes({
          aoEditar: abrirCadastro,
          aoExcluir: (centro) =>
            confirmarExclusao({
              titulo: `Excluir ${centro.nome}`,
              descricao: centro.pessoas
                ? `Existem ${centro.pessoas} colaboradores neste centro. Transfira-os antes de excluir.`
                : `O centro ${centro.codigo} sai da parametrizacao e deixa de aparecer no rateio.`,
              aoConfirmar: () => {
                excluirCentro(centro.codigo);
                desenhar();
              },
            }),
          largura: "120px",
        }),
      ],
      linhas: linhas(),
      ordem: { chave: "codigo", desc: false },
      aoClicar: abrirCadastro,
      paginar: false,
      vazio: {
        titulo: "Nenhum centro de custo cadastrado",
        descricao: "Sem centro de custo o custo nao chega na obra que o gerou.",
        acao: botao({ texto: "Novo setor", icone: "cofre", aoClicar: () => abrirCadastro() }),
      },
    });
  }

  function aplicar() {
    const termo = normalizar(filtros.busca);
    atual.filtrar(
      "busca",
      termo ? (c) => normalizar(`${c.codigo} ${c.caminho}`).includes(termo) : null
    );
    contador.textContent = `${inteiro(atual.total)} de ${inteiro(db.centros.size)}`;
  }

  function desenhar() {
    atual = grade();
    trocar(area, cartao({ semPadding: true, corpo: atual.elemento }));
    aplicar();
  }

  desenhar();

  return el("div", {}, [
    cabecalhoPagina({
      titulo: "Centros de custo",
      linha: "Setores e obras · define o rateio do custo de pessoal",
      acoes: [
        botao({
          texto: "Novo setor",
          icone: "cofre",
          variante: "primario",
          aoClicar: () => abrirCadastro(),
        }),
      ],
    }),
    el("div.barra", {}, [
      busca({
        id: "b-centro",
        placeholder: "Codigo ou nome",
        aoDigitar: (valor) => {
          filtros.busca = valor;
          aplicar();
        },
      }),
      contador,
    ]),
    area,
    el("div", { estilo: { marginTop: "12px" } }, [
      mensagem(
        "Centro com colaborador ou com setor subordinado nao pode ser excluido: a chave estrangeira ficaria orfa e o rateio pararia de fechar.",
        "",
        "info"
      ),
    ]),
  ]);
}
