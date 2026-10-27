/**
 * Area de importacao com arrastar e soltar, mais o log de processamento.
 *
 * O log diz em que etapa e por que a importacao parou. Quem recebe so "erro ao
 * importar" vai conferir o arquivo inteiro a mao.
 */

import { el, icone, trocar } from "../nucleo/dom.js";
import { xlsxComoCsv } from "../nucleo/planilha.js";
import { botao } from "./basicos.js";

/**
 * @param {object} opcoes
 * @param {Function} opcoes.aoReceber  recebe {nome, texto, erro}
 * @param {Function} [opcoes.aoUsarExemplo]
 */
export function areaDeUpload({ aoReceber, aoUsarExemplo }) {
  const entrada = el("input", {
    type: "file",
    accept: ".csv,.xlsx,text/csv",
    id: "arquivo-ponto",
    class: "so-leitor",
    onChange: (evento) => {
      const arquivo = evento.target.files?.[0];
      if (arquivo) ler(arquivo);
    },
  });

  // O xlsx e convertido para o mesmo CSV que o leitor de espelho recebe: um
  // formato a mais na entrada nao pode virar um segundo caminho de parsing.
  async function ler(arquivo) {
    try {
      const texto = /\.xlsx$/i.test(arquivo.name)
        ? await xlsxComoCsv(await arquivo.arrayBuffer())
        : await arquivo.text();
      aoReceber({ nome: arquivo.name, texto });
    } catch (erro) {
      aoReceber({ nome: arquivo.name, texto: "", erro: String(erro.message ?? erro) });
    }
  }

  const zona = el(
    "div.zona-upload",
    {
      onDragover: (evento) => {
        evento.preventDefault();
        zona.classList.add("ativa");
      },
      onDragleave: () => zona.classList.remove("ativa"),
      onDrop: (evento) => {
        evento.preventDefault();
        zona.classList.remove("ativa");
        const arquivo = evento.dataTransfer?.files?.[0];
        if (arquivo) ler(arquivo);
      },
    },
    [
      el("p.zona-titulo", {}, [icone("upload"), "Arraste o arquivo aqui"]),
      el("p.zona-nota", { texto: "CSV do relogio de ponto ou XLSX da planilha modelo" }),
      el("div.zona-acoes", {}, [
        el("label.btn.btn-primario", { for: "arquivo-ponto" }, [icone("pasta"), "Selecionar arquivo"]),
        aoUsarExemplo
          ? botao({ texto: "Usar espelho de exemplo", icone: "planilha", aoClicar: aoUsarExemplo })
          : null,
      ]),
      entrada,
    ]
  );

  return zona;
}

/** Log visual do processamento: uma linha por etapa, com estado. */
export function log() {
  const lista = el("ol.log", { "aria-live": "polite", "aria-label": "Etapas do processamento" });
  const raiz = el("div.log-caixa", {}, lista);

  const marcas = {
    andamento: { nome: "carregando", classe: "andamento" },
    ok: { nome: "verificado", classe: "ok" },
    alerta: { nome: "alerta", classe: "alerta" },
    erro: { nome: "erro", classe: "erro" },
  };

  function linha(texto, estado = "andamento", detalhe) {
    const marca = marcas[estado] ?? marcas.andamento;
    const item = el("li.log-item." + marca.classe, {}, [
      icone(marca.nome, { class: "log-marca" }),
      el("div", {}, [
        el("span.log-texto", { texto }),
        detalhe ? el("span.log-detalhe", { texto: detalhe }) : null,
      ]),
    ]);
    lista.append(item);
    raiz.scrollTop = raiz.scrollHeight;

    return {
      concluir(novoTexto, novoEstado = "ok", novoDetalhe) {
        const atual = marcas[novoEstado] ?? marcas.ok;
        trocar(item, [
          icone(atual.nome, { class: "log-marca" }),
          el("div", {}, [
            el("span.log-texto", { texto: novoTexto ?? texto }),
            novoDetalhe ?? detalhe ? el("span.log-detalhe", { texto: novoDetalhe ?? detalhe }) : null,
          ]),
        ]);
        item.className = "log-item " + atual.classe;
      },
    };
  }

  return {
    elemento: raiz,
    linha,
    limpar: () => trocar(lista),
  };
}
