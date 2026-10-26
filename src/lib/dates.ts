/**
 * Dates « calendaires » (émission, échéance, CRA).
 *
 * Elles sont normalisées à midi UTC : quel que soit le fuseau de la machine,
 * la date affichée reste celle qui a été saisie (pas de décalage d'un jour).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Construit une date calendaire à partir de "AAAA-MM-JJ". */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : atUtcNoon(parsed);
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0));
}

export function atUtcNoon(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
  );
}

export function today(): Date {
  return atUtcNoon(new Date());
}

/** Valeur d'un <input type="date">. */
export function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "11/08/2026" */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "11 août 2026" */
export function formatDateLong(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "août 2026" */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "lun. 11" — utilisé par la grille du CRA. */
export function formatDayShort(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const target = new Date(Date.UTC(y, m + months, 1, 12, 0, 0, 0));
  // Conserve le quantième quand le mois cible est plus court (31 janv. -> 28 févr.).
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12, 0, 0, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target;
}

/** Nombre de jours entiers entre deux dates calendaires (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((atUtcNoon(b).getTime() - atUtcNoon(a).getTime()) / DAY_MS);
}

/** Nombre de jours de retard d'une échéance (0 si à jour). */
export function daysLate(dueDate: Date | null | undefined, now = today()): number {
  if (!dueDate) return 0;
  const diff = daysBetween(dueDate, now);
  return diff > 0 ? diff : 0;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0, 0));
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12, 0, 0, 0));
}

export function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12, 0, 0, 0));
}

/** Toutes les dates d'un mois, pour la grille du CRA. */
export function daysOfMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const count = endOfMonth(date).getUTCDate();
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), i + 1, 12, 0, 0, 0)),
  );
}

/** Samedi ou dimanche. */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** "2026-08" — clé de mois pour les regroupements. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
