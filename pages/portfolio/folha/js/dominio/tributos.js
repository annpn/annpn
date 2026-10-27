/**
 * INSS, IRRF e FGTS com vigencia e base legal declaradas, como no motor Python.
 *
 * Existe para recalcular a folha no navegador com o ponto importado na sessao.
 * O fechamento oficial continua sendo o do Python.
 */

export const VIGENCIA = { inicio: "2026-01", fim: "2026-12" };

export const INSS = {
  baseLegal: "Portaria Interministerial MPS/MF no 13, de 09/01/2026",
  faixas: [
    { limite: 1621.0, aliquota: 0.075 },
    { limite: 2902.84, aliquota: 0.09 },
    { limite: 4354.27, aliquota: 0.12 },
    { limite: 8475.55, aliquota: 0.14 },
  ],
};

export const IRRF = {
  baseLegal: "Lei 15.191, de 11/08/2025",
  dependente: 189.59,
  descontoSimplificado: 607.2,
  faixas: [
    { limite: 2428.8, aliquota: 0, parcela: 0 },
    { limite: 2826.65, aliquota: 0.075, parcela: 182.16 },
    { limite: 3751.05, aliquota: 0.15, parcela: 394.16 },
    { limite: 4664.68, aliquota: 0.225, parcela: 675.49 },
    { limite: Infinity, aliquota: 0.275, parcela: 908.73 },
  ],
  redutor: {
    baseLegal: "Lei 15.270, de 26/11/2025",
    isencaoIntegral: 5000.0,
    limite: 7350.0,
    coeficiente: 978.62,
    fator: 0.133145,
  },
};

export const FGTS = { baseLegal: "Lei 8.036/1990 art. 15", aliquota: 0.08 };

const centavos = (valor) => Math.round(valor * 100) / 100;

/** Progressivo por faixa. Aliquota da faixa sobre a base inteira cobra a mais. */
export function inss(base) {
  const teto = INSS.faixas[INSS.faixas.length - 1].limite;
  const tributavel = Math.min(Math.max(0, base), teto);
  let piso = 0;
  let total = 0;
  for (const faixa of INSS.faixas) {
    total += Math.max(0, Math.min(tributavel, faixa.limite) - piso) * faixa.aliquota;
    piso = faixa.limite;
  }
  return centavos(total);
}

/**
 * Tabela progressiva, deducao mais vantajosa e o redutor da Lei 15.270.
 * Legal ou simplificada: vale a menor, por pessoa e por mes.
 */
export function irrf(rendimento, inssDescontado, dependentes = 0) {
  const legal = inssDescontado + dependentes * IRRF.dependente;
  const via = legal > IRRF.descontoSimplificado ? "legal" : "simplificada";
  const deducao = Math.max(legal, IRRF.descontoSimplificado);
  const base = Math.max(0, rendimento - deducao);
  const faixa = IRRF.faixas.find((item) => base <= item.limite);
  const pelaTabela = Math.max(0, base * faixa.aliquota - faixa.parcela);

  const r = IRRF.redutor;
  let redutor = 0;
  if (rendimento <= r.isencaoIntegral) redutor = pelaTabela;
  else if (rendimento <= r.limite) redutor = Math.max(0, r.coeficiente - r.fator * rendimento);

  return {
    via,
    deducao: centavos(deducao),
    base: centavos(base),
    aliquota: faixa.aliquota,
    parcela: faixa.parcela,
    pelaTabela: centavos(pelaTabela),
    redutor: centavos(redutor),
    imposto: centavos(Math.max(0, pelaTabela - redutor)),
  };
}

export const fgts = (base) => centavos(Math.max(0, base) * FGTS.aliquota);

/** Demonstrativo do colaborador: cadastro mais ponto apurado, nas linhas do contracheque. */
export function calcularDemonstrativo({ cadastro, ponto, parametros }) {
  const { divisorMensal = 220, diasDoMes = 30 } = parametros ?? {};
  const valorHora = cadastro.salario / divisorMensal;
  const valorDia = cadastro.salario / diasDoMes;

  const linhas = [
    { codigo: "400", descricao: "SALARIO BASE", referencia: "", provento: centavos(cadastro.salario), desconto: 0 },
  ];

  const acrescentar = (codigo, descricao, referencia, provento, desconto) => {
    if (centavos(provento || desconto) <= 0) return;
    linhas.push({
      codigo,
      descricao,
      referencia,
      provento: centavos(provento),
      desconto: centavos(desconto),
    });
  };

  const formatarHoras = (decimal) => {
    const inteiras = Math.floor(decimal);
    return `${String(inteiras).padStart(2, "0")}:${String(Math.round((decimal - inteiras) * 60)).padStart(2, "0")}`;
  };

  if (ponto.extras50 > 0) {
    acrescentar("010", "HORA EXTRA 50%", formatarHoras(ponto.extras50), ponto.extras50 * valorHora * 1.5, 0);
  }
  if (ponto.extras100 > 0) {
    acrescentar("011", "HORA EXTRA 100%", formatarHoras(ponto.extras100), ponto.extras100 * valorHora * 2, 0);
  }
  if (ponto.reflexoDsr > 0) {
    acrescentar("020", "DSR SOBRE HORA EXTRA", formatarHoras(ponto.reflexoDsr), ponto.reflexoDsr * valorHora * 1.5, 0);
  }
  if (ponto.faltas > 0) {
    acrescentar("030", "FALTA INJUSTIFICADA", `${ponto.faltas} dias`, 0, ponto.faltas * valorDia);
    acrescentar("031", "DSR PERDIDO POR FALTA", `${ponto.dsrPerdido} dias`, 0, ponto.dsrPerdido * valorDia);
  }
  if (ponto.atrasos > 0) {
    acrescentar("035", "ATRASOS E SAIDAS ANTECIPADAS", formatarHoras(ponto.atrasos), 0, ponto.atrasos * valorHora);
  }

  const baseTributavel = Math.max(
    0,
    centavos(linhas.reduce((soma, linha) => soma + linha.provento - linha.desconto, 0))
  );

  const valorInss = inss(baseTributavel);
  const calculoIrrf = irrf(baseTributavel, valorInss, cadastro.dependentes ?? 0);

  if (valorInss > 0) acrescentar("500", "INSS SOBRE SALARIO", "", 0, valorInss);
  if (calculoIrrf.imposto > 0) acrescentar("501", "IRRF SOBRE SALARIO", "", 0, calculoIrrf.imposto);

  const proventos = centavos(linhas.reduce((soma, linha) => soma + linha.provento, 0));
  const descontos = centavos(linhas.reduce((soma, linha) => soma + linha.desconto, 0));

  return {
    ...cadastro,
    linhas,
    informativos: [],
    proventos,
    descontos,
    liquido: centavos(proventos - descontos),
    base_inss: baseTributavel,
    inss: valorInss,
    base_irrf: calculoIrrf.base,
    irrf: calculoIrrf.imposto,
    via_deducao: calculoIrrf.via,
    deducao: calculoIrrf.deducao,
    base_fgts: baseTributavel,
    fgts: fgts(baseTributavel),
    origem: "ponto importado",
  };
}
