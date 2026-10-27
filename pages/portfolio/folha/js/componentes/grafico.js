/**
 * Grafico sobre ECharts. As cores saem dos tokens, lidas na hora do desenho.
 * Se a biblioteca de CDN nao carregar, o componente mostra a tabela no lugar.
 */

import { el } from "../nucleo/dom.js";

const instancias = new Set();

const token = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

function base() {
  const texto = token("--texto-2");
  const fraco = token("--texto-3");
  const regua = token("--borda");
  return {
    textStyle: { fontFamily: token("--fonte") || "Inter, sans-serif", color: texto },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: token("--superficie"),
      borderColor: regua,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: token("--texto"), fontSize: 12 },
      axisPointer: { type: "line", lineStyle: { color: token("--borda-forte"), width: 1 } },
    },
    xAxis: {
      type: "category",
      axisLine: { lineStyle: { color: regua } },
      axisTick: { show: false },
      axisLabel: { color: fraco, fontSize: 11, margin: 12 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: regua, type: "dashed" } },
      axisLabel: { color: fraco, fontSize: 11 },
    },
  };
}

/** Fundo honesto quando a biblioteca nao esta disponivel. */
function alternativa(series, categorias) {
  return el("div.cartao-corpo", {}, [
    el("p.secundario", {
      texto: "A biblioteca de grafico nao carregou. Os valores estao na tabela abaixo.",
    }),
    el("div.tabela-caixa", { estilo: { marginTop: "12px" } }, [
      el("table", {}, [
        el(
          "thead",
          {},
          el("tr", {}, [
            el("th", { scope: "col" }, "Competencia"),
            ...series.map((serie) => el("th", { scope: "col", class: "num" }, serie.nome)),
          ])
        ),
        el(
          "tbody",
          {},
          categorias.map((categoria, indice) =>
            el("tr", {}, [
              el("td", {}, categoria),
              ...series.map((serie) =>
                el("td.num", {}, serie.formatar ? serie.formatar(serie.dados[indice]) : String(serie.dados[indice]))
              ),
            ])
          )
        ),
      ]),
    ]),
  ]);
}

/**
 * @param {object} opcoes
 * @param {"linha"|"barra"|"area"} opcoes.tipo
 * @param {string[]} opcoes.categorias
 * @param {Array} opcoes.series  {nome, dados, cor, tipo?, formatar?, destacarUltimo?}
 * @param {string} [opcoes.altura]
 */
export function grafico({ tipo = "linha", categorias, series, altura = "grafico", formatarEixo }) {
  const alvo = el("div." + altura);

  if (typeof echarts === "undefined") {
    return alternativa(series, categorias);
  }

  const instancia = echarts.init(alvo, null, { renderer: "svg" });
  instancias.add(instancia);

  const cores = [token("--serie-1"), token("--serie-2"), token("--serie-3"), token("--serie-4")];

  const montadas = series.map((serie, indice) => {
    const cor = serie.cor ? token(serie.cor) || serie.cor : cores[indice % cores.length];
    const comum = {
      name: serie.nome,
      data: serie.dados,
      itemStyle: { color: cor, borderRadius: tipo === "barra" ? [3, 3, 0, 0] : 0 },
    };
    if ((serie.tipo ?? tipo) === "barra") {
      return { ...comum, type: "bar", barMaxWidth: 28 };
    }
    return {
      ...comum,
      type: "line",
      smooth: 0.25,
      symbol: "circle",
      symbolSize: 5,
      showSymbol: false,
      lineStyle: { width: 2, color: cor },
      areaStyle:
        (serie.tipo ?? tipo) === "area"
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: cor + "33" },
                  { offset: 1, color: cor + "00" },
                ],
              },
            }
          : undefined,
    };
  });

  instancia.setOption({
    ...base(),
    xAxis: { ...base().xAxis, data: categorias },
    yAxis: {
      ...base().yAxis,
      axisLabel: { ...base().yAxis.axisLabel, formatter: formatarEixo },
    },
    series: montadas,
    animationDuration: 420,
    animationEasing: "cubicOut",
  });

  // ECharts nao redimensiona sozinho: sem isso o grafico fica cortado quando a
  // gaveta abre ou a janela muda.
  const observador = new ResizeObserver(() => instancia.resize());
  observador.observe(alvo);

  return alvo;
}

/** Redesenha todos os graficos com os tokens do tema corrente. */
export function redesenharPorTema() {
  for (const instancia of instancias) instancia.dispose?.();
  instancias.clear();
}
