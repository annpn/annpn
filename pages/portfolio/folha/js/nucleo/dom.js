import { svgDoIcone } from "./icones.js";

/**
 * Elemento sem framework e sem `innerHTML`: texto entra como texto, sempre.
 *
 * @param {string} seletor  tag mais classes: "div.cartao.destaque"
 * @param {object} [props]  atributos, `dataset`, `aria`, `onClick`, `texto`, `html`
 * @param {Array|Node|string} [filhos]
 */
export function el(seletor, props = {}, filhos = []) {
  const [tag, ...classes] = seletor.split(".");
  const no = document.createElement(tag || "div");
  if (classes.length) no.className = classes.join(" ");

  for (const [chave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;

    if (chave === "texto") {
      no.textContent = String(valor);
    } else if (chave === "html") {
      // Reservado para marcacao que este codigo produz, nunca para dado lido.
      no.innerHTML = valor;
    } else if (chave === "dataset") {
      Object.assign(no.dataset, valor);
    } else if (chave === "estilo") {
      // Propriedade customizada nao entra por atribuicao: `style["--x"] = v` e
      // ignorado em silencio, e a barra do medidor nunca cresce.
      for (const [propriedade, conteudo] of Object.entries(valor)) {
        if (propriedade.startsWith("--")) no.style.setProperty(propriedade, String(conteudo));
        else no.style[propriedade] = conteudo;
      }
    } else if (chave.startsWith("on") && typeof valor === "function") {
      no.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else if (valor === true) {
      no.setAttribute(chave, "");
    } else {
      no.setAttribute(chave, String(valor));
    }
  }

  for (const filho of [].concat(filhos)) {
    if (filho === null || filho === undefined || filho === false) continue;
    no.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return no;
}

/** Icone em SVG inline. Decorativo: quem usa leitor ouve o rotulo do botao. */
export function icone(nome, props = {}) {
  const svg = svgDoIcone(nome);
  for (const [chave, valor] of Object.entries(props)) {
    if (chave === "class") svg.classList.add(...String(valor).split(/\s+/).filter(Boolean));
    else svg.setAttribute(chave, String(valor));
  }
  return svg;
}

export function limpar(no) {
  no.replaceChildren();
  return no;
}

export function trocar(no, ...filhos) {
  no.replaceChildren(...filhos.flat().filter(Boolean));
  return no;
}

export const achar = (seletor, raiz = document) => raiz.querySelector(seletor);
export const acharTodos = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

/** Espera o navegador desenhar: sem isso a carga rapida troca o esqueleto no mesmo quadro. */
export const proximoQuadro = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
