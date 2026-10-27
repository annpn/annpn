/**
 * Estado e carga dos dados. Nao ha servidor: `dados/` e a saida do fechamento
 * em Python, lida uma vez na abertura. O que a sessao apura vive ao lado e nao
 * e gravado.
 */

import { hidratar } from "./store.js";

const OUVINTES = new Map();

export const estado = {
  competencia: null,
  empresa: null,
  total: null,
  centros: [],
  rubricas: [],
  colaboradores: [],
  historico: null,
  criticas: { excecoes: [], regras: [] },
  /** Apuracao do CSV importado na sessao. `null` enquanto ninguem importou. */
  ponto: null,
  carregado: false,
};

export function assinar(evento, ouvinte) {
  if (!OUVINTES.has(evento)) OUVINTES.set(evento, new Set());
  OUVINTES.get(evento).add(ouvinte);
  return () => OUVINTES.get(evento).delete(ouvinte);
}

export function emitir(evento, carga) {
  for (const ouvinte of OUVINTES.get(evento) ?? []) ouvinte(carga);
}

async function ler(nome) {
  const resposta = await fetch(`dados/${nome}.json`, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`nao foi possivel ler dados/${nome}.json (${resposta.status})`);
  return resposta.json();
}

export async function carregar() {
  const [competencia, colaboradores, historico, criticas] = await Promise.all([
    ler("competencia"),
    ler("colaboradores"),
    ler("historico"),
    ler("criticas"),
  ]);

  Object.assign(estado, {
    competencia: competencia.competencia,
    empresa: competencia.empresa,
    total: competencia.total,
    centros: competencia.centros,
    rubricas: competencia.rubricas,
    pendentes: competencia.pendentes,
    naoCasados: competencia.nao_casados,
    colaboradores,
    historico,
    criticas,
    carregado: true,
  });
  // O store relacional e a fonte de verdade das telas de cadastro; `estado`
  // segue servindo o que e so leitura da competencia fechada.
  hidratar({
    competencia: estado.competencia,
    empresa: estado.empresa,
    colaboradores,
    centros: competencia.centros.map((centro) => ({
      codigo: centro.centro_custo,
      nome: centro.obra || centro.centro_custo,
      pai: null,
    })),
    rubricas: competencia.rubricas,
    historico,
    criticas,
  });

  emitir("carregado", estado);
  return estado;
}

export function definirPonto(apuracao) {
  estado.ponto = apuracao;
  emitir("ponto", apuracao);
}

export const porId = (id) => estado.colaboradores.find((pessoa) => pessoa.id === id);

export const porMatricula = (matricula) =>
  estado.colaboradores.find((pessoa) => pessoa.matricula === String(matricula));
