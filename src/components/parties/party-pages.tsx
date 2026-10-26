import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, SubmitButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableEmpty, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { IconAgency, IconClients, IconPlus, IconTrash, IconUsers } from "@/components/icons";
import { PartyForm, type PartyFormValues } from "./party-form";
import { DocumentTable } from "@/components/documents/document-table";
import { prisma } from "@/lib/prisma";
import { convertToBase, formatMoney } from "@/lib/money";
import { PARTY_KIND_LABELS, type PartyKind } from "@/lib/enums";
import { listDocuments } from "@/server/documents";
import {
  getActiveCurrencies,
  getBaseCurrencyFormat,
  getCompany,
  getRatesToBase,
} from "@/server/settings";
import { createParty, deleteContact, deleteParty, updateParty, upsertContact } from "@/server/actions/parties";

const COPY = {
  CLIENT: {
    list: "Clients",
    listDescription:
      "Les entreprises et particuliers à qui vous facturez. Leurs identifiants légaux figurent sur chaque document.",
    one: "client",
    newTitle: "Nouveau client",
    path: "/clients",
    icon: <IconClients />,
    empty: "Aucun client enregistré.",
  },
  AGENCY: {
    list: "Agences",
    listDescription:
      "Les intermédiaires (ESN, portage, apporteurs d'affaires) qui vous mandatent et reçoivent la facture pour le compte de leur client.",
    one: "agence",
    newTitle: "Nouvelle agence",
    path: "/agences",
    icon: <IconAgency />,
    empty: "Aucune agence enregistrée.",
  },
  SUBCONTRACTOR: {
    list: "Sous-traitants",
    listDescription:
      "Ceux qui réalisent une partie de vos prestations et que vous rémunérez. C'est à eux que s'adressent les justificatifs de reversement.",
    one: "sous-traitant",
    newTitle: "Nouveau sous-traitant",
    path: "/sous-traitants",
    icon: <IconUsers />,
    empty: "Aucun sous-traitant enregistré.",
  },
} as const;

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------

export async function PartyListPage({ kind }: { kind: PartyKind }) {
  const copy = COPY[kind];

  const [parties, baseCurrency, rates] = await Promise.all([
    prisma.party.findMany({
      where: { kind },
      include: {
        _count: { select: { documentsBilled: true, missionsAsClient: true, contacts: true } },
        documentsBilled: {
          where: { type: { in: ["INVOICE", "DEPOSIT"] }, status: { not: "CANCELLED" } },
          select: { total: true, balanceDue: true, currency: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    getBaseCurrencyFormat(),
    getRatesToBase(),
  ]);

  return (
    <PageShell wide>
      <PageHeader
        title={copy.list}
        description={copy.listDescription}
        actions={
          <ButtonLink href={`${copy.path}/nouveau`}>
            <IconPlus className="h-4 w-4" />
            Nouveau
          </ButtonLink>
        }
      />

      {parties.length === 0 ? (
        <EmptyState
          icon={copy.icon}
          title={copy.empty}
          description={`Créez votre premier ${copy.one} pour pouvoir émettre un document.`}
          action={
            <ButtonLink href={`${copy.path}/nouveau`}>
              <IconPlus className="h-4 w-4" />
              Créer un {copy.one}
            </ButtonLink>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Nom</TH>
                <TH>Ville</TH>
                <TH>Contacts</TH>
                <TH align="right">Documents</TH>
                <TH align="right">Facturé</TH>
                <TH align="right">Reste dû</TH>
              </TR>
            </THead>
            <tbody>
              {parties.length === 0 && <TableEmpty colSpan={6}>{copy.empty}</TableEmpty>}
              {parties.map((party) => {
                const invoiced = party.documentsBilled.reduce(
                  (sum, doc) => sum + convertToBase(doc.total, rates.get(doc.currency) ?? 1),
                  0,
                );
                const due = party.documentsBilled.reduce(
                  (sum, doc) => sum + convertToBase(doc.balanceDue, rates.get(doc.currency) ?? 1),
                  0,
                );

                return (
                  <TR key={party.id} interactive>
                    <TD>
                      <Link
                        href={`${copy.path}/${party.id}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {party.name}
                      </Link>
                      {!party.isActive && (
                        <Badge tone="neutral" className="ml-2">
                          archivé
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-[13px] text-muted">{party.city ?? "—"}</TD>
                    <TD className="text-[13px] text-muted">{party._count.contacts}</TD>
                    <TD align="right" className="tnum text-[13px] text-muted">
                      {party._count.documentsBilled}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap font-medium">
                      {formatMoney(invoiced, baseCurrency)}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap">
                      {due > 0 ? (
                        <span className="font-medium text-danger">
                          {formatMoney(due, baseCurrency)}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function PartyNewPage({ kind }: { kind: PartyKind }) {
  const copy = COPY[kind];
  const [company, currencies] = await Promise.all([getCompany(), getActiveCurrencies()]);

  const values: PartyFormValues = {
    kind,
    type: "COMPANY",
    name: "",
    legalName: null,
    legalForm: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    region: null,
    // Volontairement vide : le pays d'un client se saisit, il ne se devine pas.
    country: "",
    email: null,
    phone: null,
    website: null,
    currency: company.defaultCurrency,
    vatRate: null,
    paymentTermsDays: company.paymentTermsDays,
    commissionRate: 0,
    withholdingRate: 0,
    notes: null,
    isActive: true,
    identifiers: [],
  };

  return (
    <PageShell>
      <PageHeader
        backHref={copy.path}
        backLabel={`Retour aux ${copy.list.toLowerCase()}`}
        title={copy.newTitle}
      />
      <PartyForm
        action={createParty}
        values={values}
        currencies={currencies}
        submitLabel={`Créer le ${copy.one}`}
      />
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Fiche
// ---------------------------------------------------------------------------

export async function PartyDetailPage({ kind, id }: { kind: PartyKind; id: string }) {
  const copy = COPY[kind];

  const [party, currencies, documents] = await Promise.all([
    prisma.party.findUnique({
      where: { id },
      include: {
        identifiers: { orderBy: { position: "asc" } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
        missionsAsClient: { orderBy: { title: "asc" } },
        missionsAsAgency: { orderBy: { title: "asc" } },
      },
    }),
    getActiveCurrencies(),
    listDocuments({ partyId: id }),
  ]);

  if (!party || party.kind !== kind) notFound();

  const missions = kind === "AGENCY" ? party.missionsAsAgency : party.missionsAsClient;

  const values: PartyFormValues = {
    id: party.id,
    kind,
    type: party.type,
    name: party.name,
    legalName: party.legalName,
    legalForm: party.legalForm,
    addressLine1: party.addressLine1,
    addressLine2: party.addressLine2,
    postalCode: party.postalCode,
    city: party.city,
    region: party.region,
    country: party.country,
    email: party.email,
    phone: party.phone,
    website: party.website,
    currency: party.currency,
    vatRate: party.vatRate,
    paymentTermsDays: party.paymentTermsDays,
    commissionRate: party.commissionRate,
    withholdingRate: party.withholdingRate,
    notes: party.notes,
    isActive: party.isActive,
    identifiers: party.identifiers.map((identifier) => ({
      label: identifier.label,
      value: identifier.value,
    })),
  };

  return (
    <PageShell wide>
      <PageHeader
        backHref={copy.path}
        backLabel={`Retour aux ${copy.list.toLowerCase()}`}
        eyebrow={PARTY_KIND_LABELS[kind]}
        title={party.name}
        description={[party.city, party.country].filter(Boolean).join(", ") || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/documents/nouveau?type=INVOICE&tiers=${party.id}`} size="sm">
              <IconPlus className="h-4 w-4" />
              Facture
            </ButtonLink>
            <ButtonLink
              href={`/documents/nouveau?type=QUOTE&tiers=${party.id}`}
              variant="secondary"
              size="sm"
            >
              Devis
            </ButtonLink>
            <ConfirmAction
              action={deleteParty}
              hidden={{ id: party.id }}
              triggerLabel="Supprimer"
              triggerVariant="ghost"
              icon={<IconTrash className="h-4 w-4" />}
              title={`Supprimer « ${party.name} » ?`}
              description={
                documents.length > 0 || missions.length > 0
                  ? `Cette fiche est rattachée à ${documents.length} document(s) et ${missions.length} mission(s) : elle sera archivée plutôt que supprimée, pour ne pas casser l'historique comptable.`
                  : `Seront perdus : la fiche, ses ${party.identifiers.length} identifiant(s) légaux et ses ${party.contacts.length} contact(s).`
              }
            />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <PartyForm
            action={updateParty}
            values={values}
            currencies={currencies}
            submitLabel="Enregistrer la fiche"
          />

          <div>
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-ink">
              Documents ({documents.length})
            </h2>
            <DocumentTable
              rows={documents}
              showType
              emptyMessage="Aucun document pour ce tiers."
            />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Contacts" description="Le contact principal apparaît sur les documents." />

            <div className="mt-3 flex flex-col gap-2">
              {party.contacts.length === 0 && (
                <p className="text-[13px] text-muted">Aucun contact enregistré.</p>
              )}
              {party.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
                      {contact.isPrimary && (
                        <Badge tone="accent" className="ml-2">
                          principal
                        </Badge>
                      )}
                    </p>
                    <p className="text-[11px] text-muted">
                      {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </div>
                  <ConfirmAction
                    action={deleteContact}
                    hidden={{ id: contact.id }}
                    triggerLabel=""
                    triggerVariant="ghost"
                    triggerSize="icon"
                    icon={<IconTrash className="h-3.5 w-3.5" />}
                    title="Supprimer ce contact ?"
                    description={`« ${[contact.firstName, contact.lastName]
                      .filter(Boolean)
                      .join(" ")} » sera retiré de la fiche. Les documents qui le mentionnent le perdront.`}
                  />
                </div>
              ))}
            </div>

            <form action={upsertContact} className="mt-4 grid gap-3 border-t border-line pt-4">
              <input type="hidden" name="partyId" value={party.id} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom">
                  <Input name="firstName" />
                </Field>
                <Field label="Nom">
                  <Input name="lastName" />
                </Field>
              </div>
              <Field label="Fonction">
                <Input name="role" placeholder="Responsable achats" />
              </Field>
              <Field label="E-mail">
                <Input type="email" name="email" />
              </Field>
              <Field label="Téléphone">
                <Input name="phone" />
              </Field>
              <Checkbox name="isPrimary" label="Contact principal" />
              <SubmitButton variant="secondary" pendingLabel="Ajout…">
                Ajouter le contact
              </SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Missions (${missions.length})`} />
            <div className="mt-3 flex flex-col gap-2">
              {missions.length === 0 && (
                <p className="text-[13px] text-muted">Aucune mission rattachée.</p>
              )}
              {missions.map((mission) => (
                <Link
                  key={mission.id}
                  href={`/missions/${mission.id}`}
                  className="rounded-[var(--radius)] border border-line px-3 py-2 text-[13px] transition-colors hover:border-accent-border hover:bg-accent-soft"
                >
                  <span className="font-medium text-ink">{mission.title}</span>
                </Link>
              ))}
              <ButtonLink
                href={`/missions/nouveau?client=${party.id}`}
                variant="secondary"
                size="sm"
                className="mt-1 w-fit"
              >
                <IconPlus className="h-4 w-4" />
                Nouvelle mission
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
