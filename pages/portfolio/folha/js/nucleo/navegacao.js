/** Mapa de modulos. Fonte unica da trilha e do grupo exibido na pagina. */

export const NAVEGACAO = [
  {
    grupo: "Processamento",
    itens: [
      { rota: "painel", rotulo: "Painel da competencia", icone: "painel" },
      { rota: "ponto", rotulo: "Apuracao de ponto", icone: "relogio" },
      { rota: "folha", rotulo: "Folha de pagamento", icone: "dinheiro" },
    ],
  },
  {
    grupo: "Cadastro",
    itens: [
      { rota: "colaboradores", rotulo: "Colaboradores", icone: "pessoas", conta: "pessoas" },
      { rota: "centros", rotulo: "Centros de custo", icone: "banco" },
      { rota: "lancamentos", rotulo: "Lancamentos manuais", icone: "documento" },
    ],
  },
  {
    grupo: "Conformidade",
    itens: [{ rota: "criticas", rotulo: "Criticas do fechamento", icone: "alerta", conta: "pendentes" }],
  },
  {
    grupo: "Configuracao",
    itens: [{ rota: "parametros", rotulo: "Parametrizacao", icone: "cofre" }],
  },
];

const GRUPO_POR_ROTA = new Map(
  NAVEGACAO.flatMap((secao) => secao.itens.map((item) => [item.rota, secao.grupo]))
);

export const grupoDaRota = (rota) => GRUPO_POR_ROTA.get(rota) ?? "";
