/**
 * Formulario de cadastro e coluna de acoes do grid.
 *
 * A validacao roda aqui, ao lado do campo, e de novo no store. So na tela,
 * dado sujo entra por qualquer outro caminho.
 */

import { el, icone, trocar } from "../nucleo/dom.js";
import { abrir, fechar } from "./gaveta.js";
import { botao, mensagem } from "./basicos.js";

/**
 * @param {Array} campos  {nome, rotulo, tipo, opcoes?, obrigatorio?, ajuda?, largura?}
 * @param {object} valores
 * @param {Function} aoSalvar  recebe o registro; lancar Error mostra o erro
 */
export function formulario({ campos, valores = {}, aoSalvar, rotuloSalvar = "Salvar" }) {
  const erroGeral = el("div");
  const controles = new Map();

  function campo(definicao) {
    const id = `f-${definicao.nome}`;
    const valor = valores[definicao.nome] ?? definicao.padrao ?? "";
    const erro = el("p.campo-erro", { hidden: true });

    const controle =
      definicao.tipo === "select"
        ? el(
            "select.entrada",
            { id, name: definicao.nome },
            definicao.opcoes.map((opcao) =>
              el("option", { value: opcao.valor, selected: String(opcao.valor) === String(valor) }, opcao.rotulo)
            )
          )
        : el("input.entrada", {
            id,
            name: definicao.nome,
            type: definicao.tipo ?? "text",
            value: valor,
            step: definicao.tipo === "number" ? definicao.passo ?? "0.01" : null,
            min: definicao.tipo === "number" ? definicao.minimo ?? "0" : null,
            maxlength: definicao.maximo ?? null,
            placeholder: definicao.exemplo ?? "",
            autocomplete: "off",
          });

    controles.set(definicao.nome, { controle, erro, definicao });

    return el("div.campo", { estilo: definicao.largura ? { gridColumn: definicao.largura } : {} }, [
      el("label", { for: id }, [
        definicao.rotulo,
        definicao.obrigatorio ? el("span.obrigatorio", { "aria-hidden": "true", texto: " *" }) : null,
      ]),
      controle,
      definicao.ajuda ? el("p.campo-ajuda", { texto: definicao.ajuda }) : null,
      erro,
    ]);
  }

  function coletar() {
    const registro = {};
    let valido = true;

    for (const [nome, { controle, erro, definicao }] of controles) {
      const bruto = controle.value.trim();
      erro.hidden = true;
      controle.classList.remove("invalido");

      if (definicao.obrigatorio && !bruto) {
        erro.textContent = "Campo obrigatorio";
        erro.hidden = false;
        controle.classList.add("invalido");
        valido = false;
        continue;
      }
      if (definicao.tipo === "number" && bruto && Number.isNaN(Number(bruto))) {
        erro.textContent = "Informe um numero";
        erro.hidden = false;
        controle.classList.add("invalido");
        valido = false;
        continue;
      }
      registro[nome] = definicao.tipo === "number" ? Number(bruto || 0) : bruto;
    }
    return valido ? registro : null;
  }

  const form = el(
    "form.formulario",
    {
      onSubmit: (evento) => {
        evento.preventDefault();
        trocar(erroGeral);
        const registro = coletar();
        if (!registro) return;
        try {
          aoSalvar(registro);
          fechar();
        } catch (falha) {
          trocar(erroGeral, mensagem(falha.message, "erro", "warning"));
        }
      },
    },
    [
      el("div.formulario-grade", {}, campos.map(campo)),
      erroGeral,
      el("div.formulario-acoes", {}, [
        botao({ texto: "Cancelar", variante: "plano", aoClicar: fechar }),
        el("button.btn.btn-primario", { type: "submit" }, [icone("verificado"), rotuloSalvar]),
      ]),
    ]
  );

  return form;
}

/** Abre o formulario na gaveta. */
export function abrirFormulario({ titulo, campos, valores, aoSalvar, rotuloSalvar }) {
  abrir({
    titulo,
    conteudo: formulario({ campos, valores, aoSalvar, rotuloSalvar }),
  });
}

/** Coluna de acoes com rotulo visivel: em grade densa, icone sozinho vira adivinhacao. */
export function colunaDeAcoes({ aoDetalhar, aoEditar, aoExcluir, largura = "150px" }) {
  return {
    chave: "acoes",
    titulo: "Acoes",
    ordenavel: false,
    largura,
    classe: "acoes",
    celula: (linha) =>
      el("div.acoes-linha", {}, [
        aoDetalhar
          ? el(
              "button.btn.btn-plano.btn-mini",
              {
                type: "button",
                title: "Detalhes",
                onClick: (evento) => {
                  evento.stopPropagation();
                  aoDetalhar(linha);
                },
              },
              [icone("documento"), "Detalhes"]
            )
          : null,
        aoEditar
          ? el(
              "button.btn.btn-plano.btn-mini",
              {
                type: "button",
                title: "Editar",
                onClick: (evento) => {
                  evento.stopPropagation();
                  aoEditar(linha);
                },
              },
              [icone("documento"), "Editar"]
            )
          : null,
        aoExcluir
          ? el(
              "button.btn.btn-plano.btn-mini.perigo",
              {
                type: "button",
                title: "Excluir",
                onClick: (evento) => {
                  evento.stopPropagation();
                  aoExcluir(linha);
                },
              },
              [icone("fechar"), "Excluir"]
            )
          : null,
      ]),
  };
}

/** Confirmacao de acao destrutiva, com o registro nomeado. */
export function confirmarExclusao({ titulo, descricao, aoConfirmar }) {
  const erro = el("div");
  abrir({
    titulo,
    conteudo: el("div", {}, [
      mensagem(descricao, "alerta", "warning"),
      erro,
      el("div.formulario-acoes", {}, [
        botao({ texto: "Cancelar", variante: "plano", aoClicar: fechar }),
        el(
          "button.btn.btn-perigo",
          {
            type: "button",
            onClick: () => {
              trocar(erro);
              try {
                aoConfirmar();
                fechar();
              } catch (falha) {
                trocar(erro, mensagem(falha.message, "erro", "warning"));
              }
            },
          },
          "Excluir"
        ),
      ]),
    ]),
  });
}
