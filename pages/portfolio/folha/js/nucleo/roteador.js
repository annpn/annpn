/**
 * Roteamento por hash: a aplicacao abre de qualquer subpasta publicada, sem
 * configuracao de servidor. Cada rota recebe o container e devolve a tela.
 */

import { proximoQuadro, trocar } from "./dom.js";

const ROTAS = new Map();
let container = null;
let atual = null;
const OUVINTES = new Set();

export function registrar(caminho, modulo) {
  ROTAS.set(caminho, modulo);
}

export function aoMudar(ouvinte) {
  OUVINTES.add(ouvinte);
}

export function irPara(caminho) {
  if (location.hash.slice(1) === caminho) {
    desenhar(caminho);
    return;
  }
  location.hash = caminho;
}

function resolver() {
  const caminho = location.hash.slice(1) || "painel";
  const [raiz] = caminho.split("/");
  return { caminho, raiz, modulo: ROTAS.get(raiz) ?? ROTAS.get("painel") };
}

async function desenhar(caminhoPedido) {
  const { caminho, raiz, modulo } = resolver(caminhoPedido);
  if (!container || !modulo) return;

  atual = raiz;
  for (const ouvinte of OUVINTES) ouvinte(raiz, caminho);

  // Esqueleto primeiro: a tela nunca fica em branco entre duas rotas, e a
  // forma do que vai chegar ja aparece.
  if (modulo.esqueleto) {
    trocar(container, modulo.esqueleto());
    await proximoQuadro();
  }

  const tela = await modulo.montar({ caminho, argumentos: caminho.split("/").slice(1) });
  tela.classList.add("rota");
  trocar(container, tela);

  document.title = modulo.titulo ? `${modulo.titulo} · Folha` : "Folha";
}

export function iniciar(alvo) {
  container = alvo;
  addEventListener("hashchange", () => desenhar());
  desenhar();
}

export const rotaAtual = () => atual;
