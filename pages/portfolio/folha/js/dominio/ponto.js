/**
 * Leitura e apuracao do espelho de ponto diario: uma linha por colaborador e
 * por dia, com as quatro marcacoes.
 *
 * Base legal: jornada de 8h e 44h semanais (CLT art. 58); extra com adicional
 * minimo de 50% (art. 59 §1o) e 100% em domingo e feriado por norma coletiva;
 * falta descontada pelo dia (art. 64) com perda do DSR (Lei 605/1949 art. 6o);
 * tolerancia de 5 min por marcacao, ate 10 min no dia (art. 58 §1o).
 */

export const PARAMETROS = {
  jornadaDiaria: 8,
  toleranciaMinutosPorMarcacao: 5,
  toleranciaMinutosPorDia: 10,
  adicionalExtra: 0.5,
  adicionalExtraEspecial: 1.0,
  divisorMensal: 220,
  diasDoMes: 30,
};

const CABECALHOS = {
  matricula: ["matricula", "mat", "codigo", "cod"],
  nome: ["nome", "funcionario", "colaborador"],
  data: ["data", "dia"],
  entrada: ["entrada", "entrada1", "e1"],
  saidaAlmoco: ["saidaalmoco", "saida1", "inicioalmoco", "saidaintervalo"],
  retorno: ["retorno", "entrada2", "retornoalmoco", "fimalmoco", "retornointervalo"],
  saida: ["saida", "saida2", "saidafinal"],
};

const chave = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Separador escolhido pelo que produz mais colunas consistentes. */
function detectarSeparador(linhas) {
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ";";
  let melhorLargura = 0;
  for (const separador of candidatos) {
    const largura = linhas[0].split(separador).length;
    const consistente = linhas
      .slice(0, 20)
      .every((linha) => Math.abs(linha.split(separador).length - largura) <= 1);
    if (largura > melhorLargura && consistente) {
      melhor = separador;
      melhorLargura = largura;
    }
  }
  return melhor;
}

function mapearColunas(cabecalho) {
  const normalizado = cabecalho.map(chave);
  const mapa = {};
  for (const [campo, nomes] of Object.entries(CABECALHOS)) {
    const indice = normalizado.findIndex((coluna) => nomes.includes(coluna));
    if (indice >= 0) mapa[campo] = indice;
  }
  return mapa;
}

/** "08:30" em horas decimais. Aceita "8:30", "08h30" e vazio. */
function paraHoras(texto) {
  const limpo = String(texto ?? "").trim();
  if (!limpo) return null;
  const partes = limpo.split(/[:h]/).map((parte) => Number(parte.replace(/\D/g, "")));
  if (!partes.length || Number.isNaN(partes[0])) return null;
  return partes[0] + (partes[1] || 0) / 60;
}

function paraData(texto) {
  const limpo = String(texto ?? "").trim();
  const comBarra = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (comBarra) return new Date(Number(comBarra[3]), Number(comBarra[2]) - 1, Number(comBarra[1]));
  const iso = limpo.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

/**
 * Le o CSV e devolve as linhas ja tipadas, mais os problemas encontrados.
 * Nenhuma linha e descartada em silencio: o que nao da para ler vira rejeicao
 * com o numero da linha de origem.
 */
export function lerCsv(texto) {
  const linhas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((linha) => linha.trim());

  if (linhas.length < 2) {
    return { registros: [], rejeitadas: [], erro: "arquivo sem linhas de dado" };
  }

  const separador = detectarSeparador(linhas);
  const cabecalho = linhas[0].split(separador);
  const colunas = mapearColunas(cabecalho);

  const faltando = ["matricula", "data"].filter((campo) => colunas[campo] === undefined);
  if (faltando.length) {
    return {
      registros: [],
      rejeitadas: [],
      erro: `o arquivo nao tem coluna de ${faltando.join(" nem de ")}`,
      colunasLidas: cabecalho,
    };
  }

  const registros = [];
  const rejeitadas = [];

  for (let indice = 1; indice < linhas.length; indice += 1) {
    const celulas = linhas[indice].split(separador);
    const data = paraData(celulas[colunas.data]);
    const matricula = String(celulas[colunas.matricula] ?? "").replace(/\D/g, "");

    if (!matricula || !data) {
      rejeitadas.push({
        linha: indice + 1,
        motivo: !matricula ? "matricula ilegivel" : "data ilegivel",
        conteudo: linhas[indice].slice(0, 70),
      });
      continue;
    }

    registros.push({
      linha: indice + 1,
      matricula,
      nome: colunas.nome !== undefined ? String(celulas[colunas.nome] ?? "").trim() : "",
      data,
      entrada: paraHoras(celulas[colunas.entrada]),
      saidaAlmoco: paraHoras(celulas[colunas.saidaAlmoco]),
      retorno: paraHoras(celulas[colunas.retorno]),
      saida: paraHoras(celulas[colunas.saida]),
    });
  }

  return { registros, rejeitadas, separador, colunas: cabecalho, erro: null };
}

/** Classifica um dia: trabalhado, extra, atraso, falta ou marcacao incompleta. */
export function apurarDia(registro) {
  const { entrada, saidaAlmoco, retorno, saida, data } = registro;
  const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;

  if (entrada === null && saida === null) {
    return { tipo: fimDeSemana ? "folga" : "falta", trabalhadas: 0, extras50: 0, extras100: 0, atraso: 0 };
  }

  if (entrada === null || saida === null) {
    return { tipo: "pendente", trabalhadas: 0, extras50: 0, extras100: 0, atraso: 0 };
  }

  const intervalo =
    saidaAlmoco !== null && retorno !== null ? Math.max(0, retorno - saidaAlmoco) : 0;
  const trabalhadas = Math.max(0, saida - entrada - intervalo);

  if (fimDeSemana) {
    // Domingo e sabado convocado: a hora toda e extra, com o adicional maior em
    // domingo, por norma coletiva.
    const especial = data.getDay() === 0;
    return {
      tipo: "convocacao",
      trabalhadas,
      extras50: especial ? 0 : trabalhadas,
      extras100: especial ? trabalhadas : 0,
      atraso: 0,
    };
  }

  const tolerancia = PARAMETROS.toleranciaMinutosPorDia / 60;
  const diferenca = trabalhadas - PARAMETROS.jornadaDiaria;

  if (diferenca > tolerancia) {
    return { tipo: "extra", trabalhadas, extras50: diferenca, extras100: 0, atraso: 0 };
  }
  if (diferenca < -tolerancia) {
    return { tipo: "atraso", trabalhadas, extras50: 0, extras100: 0, atraso: -diferenca };
  }
  return { tipo: "normal", trabalhadas, extras50: 0, extras100: 0, atraso: 0 };
}

/**
 * Consolida por colaborador. O DSR perdido acompanha a falta injustificada
 * (Lei 605/1949, art. 6o): uma falta na semana derruba o descanso daquela
 * semana, e a apuracao aproxima para uma perda por falta.
 */
export function apurar(registros) {
  const porPessoa = new Map();

  for (const registro of registros) {
    const dia = apurarDia(registro);
    if (!porPessoa.has(registro.matricula)) {
      porPessoa.set(registro.matricula, {
        matricula: registro.matricula,
        nome: registro.nome,
        dias: 0,
        diasTrabalhados: 0,
        horasTrabalhadas: 0,
        extras50: 0,
        extras100: 0,
        atrasos: 0,
        faltas: 0,
        pendentes: 0,
        convocacoes: 0,
        detalhe: [],
      });
    }
    const pessoa = porPessoa.get(registro.matricula);
    pessoa.dias += 1;
    pessoa.horasTrabalhadas += dia.trabalhadas;
    pessoa.extras50 += dia.extras50;
    pessoa.extras100 += dia.extras100;
    pessoa.atrasos += dia.atraso;
    if (dia.tipo === "falta") pessoa.faltas += 1;
    if (dia.tipo === "pendente") pessoa.pendentes += 1;
    if (dia.tipo === "convocacao") pessoa.convocacoes += 1;
    if (dia.trabalhadas > 0) pessoa.diasTrabalhados += 1;
    pessoa.detalhe.push({ ...registro, ...dia });
  }

  const pessoas = [...porPessoa.values()].map((pessoa) => ({
    ...pessoa,
    dsrPerdido: pessoa.faltas,
    reflexoDsr: (pessoa.extras50 + pessoa.extras100) * 0.1667,
  }));

  return {
    pessoas,
    totais: {
      colaboradores: pessoas.length,
      dias: registros.length,
      horasTrabalhadas: pessoas.reduce((soma, p) => soma + p.horasTrabalhadas, 0),
      extras50: pessoas.reduce((soma, p) => soma + p.extras50, 0),
      extras100: pessoas.reduce((soma, p) => soma + p.extras100, 0),
      atrasos: pessoas.reduce((soma, p) => soma + p.atrasos, 0),
      faltas: pessoas.reduce((soma, p) => soma + p.faltas, 0),
      pendentes: pessoas.reduce((soma, p) => soma + p.pendentes, 0),
      convocacoes: pessoas.reduce((soma, p) => soma + p.convocacoes, 0),
    },
  };
}
