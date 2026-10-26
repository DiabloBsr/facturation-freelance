import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, SubmitButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { IconClock, IconPlus, IconTrash } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  daysOfMonth,
  formatDayShort,
  formatMonth,
  isWeekend,
  monthKey,
  startOfMonth,
  endOfMonth,
  toDateInput,
  today,
} from "@/lib/dates";
import { formatMoney, formatQuantity, mulQuantity, FALLBACK_CURRENCY } from "@/lib/money";
import { RATE_TYPE_UNIT, TIME_UNITS, TIME_UNIT_LABELS, type RateType, type TimeUnit } from "@/lib/enums";
import { getCurrencyMap } from "@/server/settings";
import { deleteTimeEntry, invoiceTimeEntries, upsertTimeEntry } from "@/server/actions/time";

export const metadata = { title: "Temps / CRA" };

function parseMonth(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0));
  }
  return startOfMonth(today());
}

export default async function TempsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const monthParam = Array.isArray(params.mois) ? params.mois[0] : params.mois;
  const missionParam = Array.isArray(params.mission) ? params.mission[0] : params.mission;

  const month = parseMonth(monthParam);
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  const [missions, entries, currencies] = await Promise.all([
    prisma.mission.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      include: { client: { select: { name: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(missionParam ? { missionId: missionParam } : {}),
      },
      include: {
        mission: { include: { client: { select: { name: true } } } },
        document: { select: { id: true, number: true } },
      },
      orderBy: [{ missionId: "asc" }, { date: "asc" }],
    }),
    getCurrencyMap(),
  ]);

  const backTo = `/temps?mois=${monthKey(month)}${missionParam ? `&mission=${missionParam}` : ""}`;

  // Regroupement par mission pour permettre une facturation groupée.
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const bucket = groups.get(entry.missionId);
    if (bucket) bucket.push(entry);
    else groups.set(entry.missionId, [entry]);
  }

  const totalLogged = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingEntries = entries.filter((entry) => entry.billable && !entry.documentId);
  const totalPending = pendingEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingValue = pendingEntries.reduce(
    (sum, entry) => sum + mulQuantity(entry.rate ?? entry.mission.rate, entry.quantity),
    0,
  );

  const days = daysOfMonth(month);
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = toDateInput(entry.date);
    byDay.set(key, (byDay.get(key) ?? 0) + entry.quantity);
  }

  const selectedMission = missionParam
    ? missions.find((mission) => mission.id === missionParam)
    : undefined;

  return (
    <PageShell wide>
      <PageHeader
        title="Temps / CRA"
        description="Saisissez vos journées, puis transformez-les en facture : une ligne par tarif, le détail des dates en description."
        actions={
          <div className="flex items-center gap-1">
            <ButtonLink
              href={`/temps?mois=${monthKey(addMonths(month, -1))}${missionParam ? `&mission=${missionParam}` : ""}`}
              variant="secondary"
              size="sm"
            >
              ←
            </ButtonLink>
            <span className="min-w-[9rem] text-center text-[13px] font-medium capitalize text-ink">
              {formatMonth(month)}
            </span>
            <ButtonLink
              href={`/temps?mois=${monthKey(addMonths(month, 1))}${missionParam ? `&mission=${missionParam}` : ""}`}
              variant="secondary"
              size="sm"
            >
              →
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Temps saisi" value={formatQuantity(totalLogged)} sub="sur le mois" />
        <StatCard
          label="En attente de facturation"
          value={formatQuantity(totalPending)}
          sub={`${pendingEntries.length} saisie(s)`}
          tone={totalPending > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Valeur à facturer"
          value={formatMoney(
            pendingValue,
            currencies.get(pendingEntries[0]?.mission.currency ?? "") ?? FALLBACK_CURRENCY,
          )}
          tone="accent"
        />
      </div>

      {/* Filtre mission */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/temps?mois=${monthKey(month)}`}
          className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
            missionParam
              ? "border-line bg-surface text-muted hover:text-ink"
              : "border-accent bg-accent text-accent-contrast"
          }`}
        >
          Toutes les missions
        </Link>
        {missions.map((mission) => (
          <Link
            key={mission.id}
            href={`/temps?mois=${monthKey(month)}&mission=${mission.id}`}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              missionParam === mission.id
                ? "border-accent bg-accent text-accent-contrast"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {mission.title}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Aperçu du mois */}
          <Card>
            <CardHeader title="Vue du mois" description="Les jours saisis apparaissent en couleur." />
            <div className="mt-4 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = toDateInput(day);
                const quantity = byDay.get(key) ?? 0;
                return (
                  <div
                    key={key}
                    className={`flex flex-col items-center rounded-[var(--radius-sm)] border px-1 py-1.5 text-center ${
                      quantity > 0
                        ? "border-accent-border bg-accent-soft"
                        : isWeekend(day)
                          ? "border-line bg-surface-2"
                          : "border-line bg-surface"
                    }`}
                  >
                    <span className="text-[10px] capitalize text-faint">{formatDayShort(day)}</span>
                    <span
                      className={`tnum text-[12px] font-semibold ${
                        quantity > 0 ? "text-accent" : "text-faint"
                      }`}
                    >
                      {quantity > 0 ? formatQuantity(quantity) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Saisies groupées par mission */}
          {entries.length === 0 ? (
            <EmptyState
              icon={<IconClock />}
              title="Aucune saisie ce mois-ci"
              description={
                missions.length === 0
                  ? "Créez d'abord une mission : elle porte le tarif et la devise utilisés par le CRA."
                  : "Utilisez le formulaire de saisie pour enregistrer vos journées."
              }
              action={
                missions.length === 0 ? (
                  <ButtonLink href="/missions/nouveau">
                    <IconPlus className="h-4 w-4" />
                    Créer une mission
                  </ButtonLink>
                ) : undefined
              }
            />
          ) : (
            [...groups.entries()].map(([missionId, missionEntries]) => {
              const mission = missionEntries[0].mission;
              const currency = currencies.get(mission.currency) ?? FALLBACK_CURRENCY;
              const unit = RATE_TYPE_UNIT[mission.rateType as RateType] ?? "jour";
              const billable = missionEntries.filter(
                (entry) => entry.billable && !entry.documentId,
              );
              const total = billable.reduce(
                (sum, entry) => sum + mulQuantity(entry.rate ?? mission.rate, entry.quantity),
                0,
              );

              return (
                <Card key={missionId} padded={false}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                    <div>
                      <Link
                        href={`/missions/${missionId}`}
                        className="text-[15px] font-semibold tracking-tight text-ink hover:text-accent"
                      >
                        {mission.title}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {mission.client.name} · {formatMoney(mission.rate, currency)} / {unit}
                      </p>
                    </div>
                    {billable.length > 0 && (
                      <span className="tnum text-[13px] text-muted">
                        À facturer :{" "}
                        <strong className="font-semibold text-ink">
                          {formatMoney(total, currency)}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Les cases sont reliées au formulaire par l'attribut `form` :
                      cela évite d'imbriquer le formulaire de suppression dans
                      celui de facturation, ce que le HTML interdit. */}
                  <div>
                    <ul className="divide-y divide-[var(--border)]">
                      {missionEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-center gap-3 px-5 py-2.5"
                        >
                          {entry.billable && !entry.documentId ? (
                            <input
                              type="checkbox"
                              form={`facturer-${missionId}`}
                              name="entryId"
                              value={entry.id}
                              defaultChecked
                              className="h-4 w-4 accent-[var(--accent)]"
                              aria-label={`Facturer la saisie du ${toDateInput(entry.date)}`}
                            />
                          ) : (
                            <span className="w-4" />
                          )}

                          <span className="tnum w-24 text-[13px] text-muted">
                            {new Intl.DateTimeFormat("fr-FR", {
                              weekday: "short",
                              day: "2-digit",
                              timeZone: "UTC",
                            }).format(entry.date)}
                          </span>

                          <span className="tnum w-16 text-[13px] font-medium text-ink">
                            {formatQuantity(entry.quantity)} {entry.unit === "HOUR" ? "h" : "j"}
                          </span>

                          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                            {entry.label ?? entry.description ?? "—"}
                          </span>

                          {entry.document ? (
                            <Link href={`/documents/${entry.document.id}`}>
                              <Badge tone="success">
                                {entry.document.number ?? "facturé"}
                              </Badge>
                            </Link>
                          ) : entry.billable ? (
                            <Badge tone="warning">à facturer</Badge>
                          ) : (
                            <Badge tone="neutral">non facturable</Badge>
                          )}

                          {!entry.documentId && (
                            <ConfirmAction
                              action={deleteTimeEntry}
                              hidden={{ id: entry.id, backTo }}
                              triggerLabel=""
                              triggerVariant="ghost"
                              triggerSize="icon"
                              icon={<IconTrash className="h-3.5 w-3.5" />}
                              title="Supprimer cette saisie ?"
                              description={`La journée du ${toDateInput(entry.date)} (${formatQuantity(
                                entry.quantity,
                              )} ${unit}) sera définitivement perdue.`}
                            />
                          )}
                        </li>
                      ))}
                    </ul>

                    {billable.length > 0 && (
                      <form
                        id={`facturer-${missionId}`}
                        action={invoiceTimeEntries}
                        className="border-t border-line px-5 py-3"
                      >
                        <input type="hidden" name="missionId" value={missionId} />
                        <input type="hidden" name="backTo" value={backTo} />
                        <SubmitButton size="sm" pendingLabel="Création…">
                          Facturer la sélection ({billable.length})
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Formulaire de saisie */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader title="Saisir du temps" />

            {missions.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted">
                Créez d&apos;abord une mission pour pouvoir saisir du temps.
              </p>
            ) : (
              <form action={upsertTimeEntry} className="mt-4 grid gap-3">
                <input type="hidden" name="backTo" value={backTo} />

                <Field label="Mission" required>
                  <Select name="missionId" defaultValue={missionParam ?? missions[0].id} required>
                    {missions.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.title} — {mission.client.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" required>
                    <Input type="date" name="date" defaultValue={toDateInput(today())} required />
                  </Field>
                  <Field label="Quantité" required>
                    <Input
                      name="quantity"
                      inputMode="decimal"
                      defaultValue="1"
                      className="tnum text-right"
                      required
                    />
                  </Field>
                </div>

                <Field label="Unité">
                  <Select
                    name="unit"
                    defaultValue={
                      selectedMission?.rateType === "HOURLY" ? "HOUR" : "DAY"
                    }
                  >
                    {TIME_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {TIME_UNIT_LABELS[unit as TimeUnit]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Intitulé">
                  <Input name="label" placeholder="Développement du module facturation" />
                </Field>

                <Checkbox
                  name="billable"
                  defaultChecked
                  label="Facturable"
                  hint="Décochez pour du temps interne ou offert."
                />

                <SubmitButton pendingLabel="Enregistrement…">
                  <IconPlus className="h-4 w-4" />
                  Enregistrer
                </SubmitButton>
              </form>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
