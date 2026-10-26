/**
 * Jetons de période pour les abonnements.
 *
 * Une facture mensuelle récurrente doit porter le mois qu'elle couvre. Sans
 * cela, l'abonnement recopierait « juin 2026 » sur toutes les échéances
 * suivantes. Les jetons sont résolus au moment où la facture est générée, à
 * partir de sa date d'émission.
 */

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

export type Placeholder = { token: string; description: string; example: string };

/** Jetons proposés dans l'interface, avec un exemple pour juin 2026. */
export const PLACEHOLDERS: Placeholder[] = [
  { token: "{MOIS}", description: "le mois en toutes lettres", example: "juin" },
  { token: "{MOIS_ANNEE}", description: "le mois et l'année", example: "juin 2026" },
  { token: "{ANNEE}", description: "l'année", example: "2026" },
  { token: "{MOIS_NUM}", description: "le mois sur deux chiffres", example: "06" },
  { token: "{MOIS_PRECEDENT}", description: "le mois précédent", example: "mai 2026" },
];

/**
 * Remplace les jetons de période dans un texte.
 * `{MOIS_PRECEDENT}` sert aux factures émises en début de mois pour la période
 * écoulée — le cas le plus courant d'une prestation payée à terme échu.
 */
export function applyDatePlaceholders(
  value: string | null | undefined,
  date: Date,
): string | null {
  if (!value) return value ?? null;

  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  const previousMonth = month === 0 ? 11 : month - 1;
  const previousYear = month === 0 ? year - 1 : year;

  return value
    .replace(/\{MOIS_ANNEE\}/g, `${MOIS[month]} ${year}`)
    .replace(/\{MOIS_PRECEDENT\}/g, `${MOIS[previousMonth]} ${previousYear}`)
    .replace(/\{MOIS_NUM\}/g, String(month + 1).padStart(2, "0"))
    .replace(/\{MOIS\}/g, MOIS[month])
    .replace(/\{ANNEE\}/g, String(year));
}

/** Vrai si le texte contient au moins un jeton. */
export function hasPlaceholder(value: string | null | undefined): boolean {
  if (!value) return false;
  return PLACEHOLDERS.some((placeholder) => value.includes(placeholder.token));
}
