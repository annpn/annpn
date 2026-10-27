/**
 * Store relacional em memoria. Folha, totais e rateio sao seletores, nunca
 * valores gravados: cadastro que muda e derivado que fica para tras e o
 * defeito classico de ERP.
 *
 *   colaboradores  PK matricula   FK centro -> centros.codigo
 *   centros        PK codigo      FK pai    -> centros.codigo
 *   rubricas       PK codigo
 *   lancamentos    PK id          FK matricula, FK rubrica
 *   tributos       tabela vigente por competencia
 */

import { calcularDemonstrativo } from "../dominio/tributos.js";

const OUVINTES = new Set();
let proximoId = 1;

export const db = {
  competencia: null,
  empresa: null,
  centros: new Map(),
  colaboradores: new Map(),
  rubricas: new Map(),
  /** Lancamento manual da sessao: hora extra, falta, atraso, evento avulso. */
  lancamentos: new Map(),
  /** Apuracao do CSV de ponto importado, por matricula. */
  ponto: new Map(),
  historico: null,
  criticas: { excecoes: [], regras: [] },
  tributos: null,
};

/* ------------------------------- assinatura ------------------------------- */

export function assinarStore(ouvinte) {
  OUVINTES.add(ouvinte);
  return () => OUVINTES.delete(ouvinte);
}

function notificar(evento) {
  for (const ouvinte of OUVINTES) ouvinte(evento);
}

/* --------------------------------- carga --------------------------------- */

export function hidratar({ competencia, empresa, colaboradores, centros, rubricas, historico, criticas }) {
  db.competencia = competencia;
  db.empresa = empresa;
  db.historico = historico;
  db.criticas = criticas;

  db.centros.clear();
  for (const centro of centros) {
    db.centros.set(centro.codigo, { ...centro, pai: centro.pai ?? null });
  }

  db.colaboradores.clear();
  for (const pessoa of colaboradores) {
    // O que vem do fechamento e cadastro mais demonstrativo. Guardamos so o
    // cadastro; o demonstrativo volta a ser derivado por `folhaDe()`.
    db.colaboradores.set(pessoa.matricula, {
      matricula: pessoa.matricula,
      cpf: pessoa.cpf,
      nome: pessoa.nome,
      funcao: pessoa.funcao,
      centro: pessoa.centro,
      obra: pessoa.obra,
      situacao: pessoa.situacao,
      admissao: pessoa.admissao,
      desligamento: pessoa.desligamento,
      dependentes: pessoa.dependentes,
      salario: pessoa.salario,
      vinculo: pessoa.vinculo ?? "CLT",
      comparavel: pessoa.comparavel,
      motivo: pessoa.motivo,
      // Demonstrativo do fechamento oficial, mantido como referencia para
      // comparar com o que o store recalcula apos uma edicao.
      fechado: {
        linhas: pessoa.linhas,
        informativos: pessoa.informativos,
        proventos: pessoa.proventos,
        descontos: pessoa.descontos,
        liquido: pessoa.liquido,
        base_inss: pessoa.base_inss,
        inss: pessoa.inss,
        base_irrf: pessoa.base_irrf,
        irrf: pessoa.irrf,
        via_deducao: pessoa.via_deducao,
        deducao: pessoa.deducao,
        base_fgts: pessoa.base_fgts,
        fgts: pessoa.fgts,
      },
    });
  }

  db.rubricas.clear();
  for (const rubrica of rubricas ?? []) db.rubricas.set(rubrica.codigo, { ...rubrica });

  notificar({ tipo: "hidratado" });
}

/* -------------------------------- mutacoes -------------------------------- */

const exigir = (condicao, mensagem) => {
  if (!condicao) throw new Error(mensagem);
};

export function salvarColaborador(dados, matriculaOriginal = null) {
  const matricula = String(dados.matricula ?? "").trim();
  exigir(matricula, "matricula e obrigatoria");
  exigir(String(dados.nome ?? "").trim(), "nome e obrigatorio");
  exigir(Number(dados.salario) > 0, "salario base precisa ser maior que zero");
  exigir(
    !dados.centro || db.centros.has(dados.centro),
    `centro de custo ${dados.centro} nao existe`
  );

  const novo = matriculaOriginal === null;
  exigir(
    !novo || !db.colaboradores.has(matricula),
    `ja existe colaborador com a matricula ${matricula}`
  );

  const anterior = matriculaOriginal ? db.colaboradores.get(matriculaOriginal) : null;
  if (matriculaOriginal && matriculaOriginal !== matricula) db.colaboradores.delete(matriculaOriginal);

  db.colaboradores.set(matricula, {
    ...(anterior ?? {}),
    ...dados,
    matricula,
    dependentes: Number(dados.dependentes) || 0,
    salario: Number(dados.salario),
    obra: db.centros.get(dados.centro)?.nome ?? "",
  });

  notificar({ tipo: novo ? "colaborador:criado" : "colaborador:alterado", matricula });
  return db.colaboradores.get(matricula);
}

export function excluirColaborador(matricula) {
  const temLancamento = [...db.lancamentos.values()].some(
    (lancamento) => lancamento.matricula === matricula
  );
  exigir(!temLancamento, "existe lancamento para esta matricula; remova os lancamentos antes");
  db.colaboradores.delete(matricula);
  notificar({ tipo: "colaborador:excluido", matricula });
}

export function salvarCentro(dados, codigoOriginal = null) {
  const codigo = String(dados.codigo ?? "").trim().toUpperCase();
  exigir(codigo, "codigo e obrigatorio");
  exigir(String(dados.nome ?? "").trim(), "nome e obrigatorio");
  exigir(dados.pai !== codigo, "um centro de custo nao pode ser pai de si mesmo");
  exigir(!dados.pai || db.centros.has(dados.pai), "centro pai inexistente");

  const novo = codigoOriginal === null;
  exigir(!novo || !db.centros.has(codigo), `ja existe centro com o codigo ${codigo}`);

  if (codigoOriginal && codigoOriginal !== codigo) {
    db.centros.delete(codigoOriginal);
    // Chave estrangeira: quem apontava para o codigo antigo acompanha.
    for (const pessoa of db.colaboradores.values()) {
      if (pessoa.centro === codigoOriginal) pessoa.centro = codigo;
    }
  }

  db.centros.set(codigo, { codigo, nome: dados.nome.trim(), pai: dados.pai || null });
  notificar({ tipo: novo ? "centro:criado" : "centro:alterado", codigo });
  return db.centros.get(codigo);
}

export function excluirCentro(codigo) {
  const emUso = [...db.colaboradores.values()].some((pessoa) => pessoa.centro === codigo);
  exigir(!emUso, "existe colaborador neste centro de custo");
  const temFilho = [...db.centros.values()].some((centro) => centro.pai === codigo);
  exigir(!temFilho, "existe centro de custo subordinado a este");
  db.centros.delete(codigo);
  notificar({ tipo: "centro:excluido", codigo });
}

export function salvarRubrica(dados, codigoOriginal = null) {
  const codigo = String(dados.codigo ?? "").trim().padStart(3, "0");
  exigir(/^\d{3}$/.test(codigo), "codigo da rubrica deve ter tres digitos");
  exigir(String(dados.nome ?? "").trim(), "descricao e obrigatoria");
  exigir(["provento", "desconto", "informativa", "base"].includes(dados.tipo), "tipo invalido");

  const novo = codigoOriginal === null;
  exigir(!novo || !db.rubricas.has(codigo), `ja existe rubrica com o codigo ${codigo}`);
  if (codigoOriginal && codigoOriginal !== codigo) db.rubricas.delete(codigoOriginal);

  const anterior = codigoOriginal ? db.rubricas.get(codigoOriginal) : null;
  db.rubricas.set(codigo, {
    ...(anterior ?? {}),
    ...dados,
    codigo,
    incide_inss: Boolean(Number(dados.incide_inss)),
    incide_irrf: Boolean(Number(dados.incide_irrf)),
    incide_fgts: Boolean(Number(dados.incide_fgts)),
    entra_liquido: Boolean(Number(dados.entra_liquido)),
    valoracao_fator: Number(dados.valoracao_fator) || 0,
  });
  notificar({ tipo: novo ? "rubrica:criada" : "rubrica:alterada", codigo });
  return db.rubricas.get(codigo);
}

export function excluirRubrica(codigo) {
  const protegidas = new Set(["400", "500", "501"]);
  exigir(!protegidas.has(codigo), "rubrica de sistema: salario base, INSS e IRRF nao sao removiveis");
  const emUso = [...db.lancamentos.values()].some((l) => l.rubrica === codigo);
  exigir(!emUso, "existe lancamento com esta rubrica");
  db.rubricas.delete(codigo);
  notificar({ tipo: "rubrica:excluida", codigo });
}

/**
 * Tabela de aliquota da sessao. A que o fechamento aplica fica versionada em
 * `config/tributos.toml`.
 */
export function salvarFaixa(tributo, indice, dados) {
  const tabela = db.tributos?.[tributo];
  exigir(tabela, `tabela ${tributo} nao carregada`);
  const faixa = tabela.faixas[indice];
  exigir(faixa, "faixa inexistente");

  const ate = dados.ate === "" || dados.ate === null ? null : Number(dados.ate);
  exigir(ate === null || ate > Number(dados.de), "o limite superior precisa ser maior que o inferior");
  exigir(Number(dados.aliquota) >= 0 && Number(dados.aliquota) <= 1, "aliquota entre 0 e 1");

  Object.assign(faixa, {
    de: Number(dados.de),
    ate,
    aliquota: Number(dados.aliquota),
    parcela_deduzir: dados.parcela_deduzir === undefined ? faixa.parcela_deduzir : Number(dados.parcela_deduzir),
  });
  notificar({ tipo: "tributo:alterado", tributo, indice });
  return faixa;
}

export function definirTributos(tributos) {
  db.tributos = tributos;
}

/**
 * Lancamento manual de ponto ou evento.
 * Substitui o valor apurado do CSV para aquela matricula e rubrica.
 */
export function lancar({ matricula, rubrica, quantidade, valor, motivo, autor }) {
  exigir(db.colaboradores.has(matricula), `matricula ${matricula} nao existe no cadastro`);
  exigir(rubrica, "rubrica e obrigatoria");
  exigir(String(motivo ?? "").trim(), "motivo e obrigatorio: lancamento manual sem motivo nao se audita");
  exigir(String(autor ?? "").trim(), "autor e obrigatorio");

  const id = proximoId++;
  db.lancamentos.set(id, {
    id,
    matricula,
    rubrica,
    quantidade: Number(quantidade) || 0,
    valor: Number(valor) || 0,
    motivo: motivo.trim(),
    autor: autor.trim(),
    em: new Date(),
  });
  notificar({ tipo: "lancamento:criado", id, matricula });
  return db.lancamentos.get(id);
}

export function excluirLancamento(id) {
  const lancamento = db.lancamentos.get(id);
  db.lancamentos.delete(id);
  notificar({ tipo: "lancamento:excluido", id, matricula: lancamento?.matricula });
}

export function definirApuracaoDePonto(apuracao) {
  db.ponto.clear();
  for (const pessoa of apuracao?.pessoas ?? []) db.ponto.set(pessoa.matricula, pessoa);
  notificar({ tipo: "ponto:importado" });
}

/* -------------------------------- seletores ------------------------------- */

const zerado = () => ({
  extras50: 0,
  extras100: 0,
  reflexoDsr: 0,
  faltas: 0,
  dsrPerdido: 0,
  atrasos: 0,
});

/** Apuracao efetiva: o CSV importado, com os lancamentos manuais por cima. */
export function apuracaoDe(matricula) {
  const base = { ...zerado(), ...(db.ponto.get(matricula) ?? {}) };
  const porRubrica = {
    "010": "extras50",
    "011": "extras100",
    "020": "reflexoDsr",
    "030": "faltas",
    "031": "dsrPerdido",
    "035": "atrasos",
  };

  for (const lancamento of db.lancamentos.values()) {
    if (lancamento.matricula !== matricula) continue;
    const campo = porRubrica[lancamento.rubrica];
    if (campo) base[campo] = lancamento.quantidade;
  }
  if (base.faltas && !base.dsrPerdido) base.dsrPerdido = base.faltas;
  return base;
}

const temApuracao = (matricula) =>
  db.ponto.has(matricula) ||
  [...db.lancamentos.values()].some((lancamento) => lancamento.matricula === matricula);

/**
 * Demonstrativo do colaborador: o do fechamento, ou recalculado a partir do
 * cadastro corrente quando ha apuracao na sessao.
 */
export function folhaDe(matricula) {
  const cadastro = db.colaboradores.get(matricula);
  if (!cadastro) return null;

  if (!temApuracao(matricula)) {
    return { ...cadastro, ...cadastro.fechado, origem: "fechamento" };
  }
  return {
    ...calcularDemonstrativo({ cadastro, ponto: apuracaoDe(matricula) }),
    origem: "recalculado",
  };
}

export const folha = () =>
  [...db.colaboradores.keys()].map(folhaDe).filter(Boolean);

export function totais(lista = folha()) {
  const soma = (campo) => Math.round(lista.reduce((t, item) => t + (item[campo] ?? 0), 0) * 100) / 100;
  return {
    colaboradores: lista.length,
    proventos: soma("proventos"),
    descontos: soma("descontos"),
    liquido: soma("liquido"),
    inss: soma("inss"),
    irrf: soma("irrf"),
    fgts: soma("fgts"),
  };
}

export function porCentroDeCusto(lista = folha()) {
  const agrupado = new Map();
  for (const item of lista) {
    const codigo = item.centro || "(sem centro de custo)";
    if (!agrupado.has(codigo)) {
      agrupado.set(codigo, {
        centro_custo: codigo,
        obra: db.centros.get(codigo)?.nome ?? "",
        pessoas: 0,
        proventos: 0,
        descontos: 0,
        liquido: 0,
        fgts: 0,
      });
    }
    const linha = agrupado.get(codigo);
    linha.pessoas += 1;
    linha.proventos += item.proventos ?? 0;
    linha.descontos += item.descontos ?? 0;
    linha.liquido += item.liquido ?? 0;
    linha.fgts += item.fgts ?? 0;
  }
  return [...agrupado.values()]
    .map((linha) => ({
      ...linha,
      proventos: Math.round(linha.proventos * 100) / 100,
      descontos: Math.round(linha.descontos * 100) / 100,
      liquido: Math.round(linha.liquido * 100) / 100,
      fgts: Math.round(linha.fgts * 100) / 100,
    }))
    .sort((a, b) => b.liquido - a.liquido);
}

/** Centros com o caminho hierarquico montado, para a tela de cadastro. */
export function centrosComHierarquia() {
  const caminho = (centro) => {
    const partes = [centro.nome];
    let atual = centro;
    const vistos = new Set([centro.codigo]);
    while (atual.pai && db.centros.has(atual.pai) && !vistos.has(atual.pai)) {
      atual = db.centros.get(atual.pai);
      vistos.add(atual.codigo);
      partes.unshift(atual.nome);
    }
    return partes.join(" / ");
  };

  const quadro = new Map();
  for (const pessoa of db.colaboradores.values()) {
    quadro.set(pessoa.centro, (quadro.get(pessoa.centro) ?? 0) + 1);
  }

  return [...db.centros.values()]
    .map((centro) => ({
      ...centro,
      caminho: caminho(centro),
      nivel: caminho(centro).split(" / ").length - 1,
      pessoas: quadro.get(centro.codigo) ?? 0,
    }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho, "pt-BR"));
}

export const lancamentosDe = (matricula) =>
  [...db.lancamentos.values()].filter((lancamento) => lancamento.matricula === matricula);

export const todosOsLancamentos = () =>
  [...db.lancamentos.values()].sort((a, b) => b.id - a.id);
