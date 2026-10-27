/** Formatacao brasileira. Todo numero da interface passa por aqui. */

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const reais = (valor) =>
  valor === null || valor === undefined || Number.isNaN(valor)
    ? "—"
    : valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const moeda = (valor) => (valor === null || valor === undefined ? "—" : "R$ " + reais(valor));

/** Valor grande em KPI: "1,21 mi" le melhor que "1.207.428,16". */
export function compacto(valor) {
  if (valor === null || valor === undefined) return "—";
  const absoluto = Math.abs(valor);
  if (absoluto >= 1e6) return (valor / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
  if (absoluto >= 1e3) return (valor / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
  return reais(valor);
}

export const inteiro = (valor) =>
  valor === null || valor === undefined ? "—" : valor.toLocaleString("pt-BR");

export const porcento = (fracao, casas = 1) =>
  fracao === null || fracao === undefined
    ? "—"
    : (fracao * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      }) + "%";

/** Horas decimais no formato que o holerite usa. */
export function horas(decimal) {
  if (decimal === null || decimal === undefined) return "—";
  const inteiras = Math.floor(decimal);
  const minutos = Math.round((decimal - inteiras) * 60);
  return `${String(inteiras).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

export function competenciaLonga(competencia) {
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1]} de ${ano}`;
}

export function competenciaCurta(competencia) {
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1].slice(0, 3)}/${ano.slice(2)}`;
}

export function cpf(digitos) {
  const limpo = String(digitos || "").replace(/\D/g, "");
  if (limpo.length !== 11) return limpo || "—";
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
}

/** Comparacao de texto sem acento e sem caixa, para busca. */
export const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export const variacao = (atual, anterior) =>
  !anterior ? null : (atual - anterior) / anterior;
