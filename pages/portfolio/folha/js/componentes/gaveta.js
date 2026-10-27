/**
 * Gaveta lateral. Fecha no Esc e no veu, prende o foco e devolve para quem
 * abriu: sem isso o teclado cai na tabela que esta atras do veu.
 */

import { acharTodos, el, icone, trocar } from "../nucleo/dom.js";
import { botao } from "./basicos.js";

const FOCAVEIS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let fundo = null;
let corpo = null;
let titulo = null;
let acoes = null;
let focoAnterior = null;

function garantir() {
  if (fundo) return;

  titulo = el("h2", { id: "gaveta-titulo" });
  acoes = el("div", { estilo: { display: "flex", gap: "8px" } });
  corpo = el("div.gaveta-corpo");

  const painel = el("div.gaveta", { role: "dialog", "aria-modal": "true", "aria-labelledby": "gaveta-titulo" }, [
    el("header.gaveta-topo", {}, [
      titulo,
      acoes,
      botao({ icone: "x", variante: "plano", aoClicar: fechar, "aria-label": "Fechar" }),
    ]),
    corpo,
  ]);

  fundo = el("div.gaveta-fundo", { hidden: true }, [
    el("button.gaveta-veu", { type: "button", "aria-label": "Fechar", onClick: fechar }),
    painel,
  ]);
  document.body.append(fundo);

  document.addEventListener("keydown", (evento) => {
    if (fundo.hidden) return;
    if (evento.key === "Escape") {
      fechar();
      return;
    }
    if (evento.key !== "Tab") return;
    const alvos = acharTodos(FOCAVEIS, painel).filter((no) => !no.disabled);
    if (!alvos.length) return;
    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  });
}

export function abrir({ titulo: texto, conteudo, acoes: botoes = [] }) {
  garantir();
  focoAnterior = document.activeElement;
  titulo.textContent = texto;
  trocar(acoes, botoes);
  trocar(corpo, conteudo);
  fundo.hidden = false;
  document.body.style.overflow = "hidden";
  acharTodos(FOCAVEIS, fundo)[1]?.focus();
}

export function fechar() {
  if (!fundo || fundo.hidden) return;
  fundo.hidden = true;
  document.body.style.overflow = "";
  focoAnterior?.focus?.();
}

/** Bloco de pares rotulo/valor, o formato de leitura de uma ficha. */
export function dados(pares) {
  return el(
    "div.dados",
    {},
    pares
      .filter(Boolean)
      .map(([rotulo, valor, mono]) =>
        el("div.dado", {}, [
          el("p.rotulo", { texto: rotulo }),
          el(mono ? "p.valor.mono" : "p.valor", { texto: valor ?? "—" }),
        ])
      )
  );
}

export function secao(titulo, conteudo) {
  return el("section.secao", {}, [el("h3", { texto: titulo }), conteudo]);
}
