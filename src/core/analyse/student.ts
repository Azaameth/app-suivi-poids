/**
 * Quantiles de la loi de Student (bilatéraux 95 % et 99 %), selon les degrés de liberté.
 * Plus justes que 2 et 2,6 pour les petits échantillons du rythme (12 à 26 ddl) (D36).
 * Valeurs tabulées ; au-delà de 30 ddl, la loi normale (écart < 2 %).
 */
const T_975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145,
  2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048,
  2.045, 2.042,
]
const T_995 = [
  63.657, 9.925, 5.841, 4.604, 4.032, 3.707, 3.499, 3.355, 3.25, 3.169, 3.106, 3.055, 3.012, 2.977,
  2.947, 2.921, 2.898, 2.878, 2.861, 2.845, 2.831, 2.819, 2.807, 2.797, 2.787, 2.779, 2.771, 2.763,
  2.756, 2.75,
]

export type Niveau = 95 | 99

export function quantileStudent(niveau: Niveau, degresLiberte: number): number {
  const table = niveau === 95 ? T_975 : T_995
  if (degresLiberte > table.length) return niveau === 95 ? 1.96 : 2.576
  return table[Math.max(1, Math.floor(degresLiberte)) - 1]
}
