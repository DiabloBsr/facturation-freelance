import { ButtonLink } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/page-header";
import { IconPlus } from "@/components/icons";
import { formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import type { DocumentStatus, DocumentType } from "@/lib/enums";
import { listDocuments } from "@/server/documents";
import { getBaseCurrencyFormat, getRatesToBase } from "@/server/settings";
import { convertToBase } from "@/lib/money";
import { DocumentTable } from "./document-table";
import { ListFilters } from "./list-filters";

export type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Page de liste commune aux devis, factures et avoirs.
 * Le total affiché est converti en devise de base pour rester comparable
 * lorsque plusieurs devises coexistent.
 */
export async function DocumentsListPage({
  types,
  title,
  description,
  newType,
  statuses,
  showType,
  emptyMessage,
  searchParams,
}: {
  types: DocumentType[];
  title: string;
  description: string;
  newType: DocumentType;
  statuses: DocumentStatus[];
  showType?: boolean;
  emptyMessage: React.ReactNode;
  searchParams: SearchParams;
}) {
  const search = single(searchParams, "q");
  const status = single(searchParams, "statut");

  const [rows, baseCurrency, rates] = await Promise.all([
    listDocuments({ types, search, status }),
    getBaseCurrencyFormat(),
    getRatesToBase(),
  ]);

  const totalBase = rows.reduce(
    (sum, row) => sum + convertToBase(row.total, rates.get(row.currency) ?? 1),
    0,
  );
  const dueBase = rows.reduce(
    (sum, row) => sum + convertToBase(row.balanceDue, rates.get(row.currency) ?? 1),
    0,
  );

  return (
    <PageShell wide>
      <PageHeader
        title={title}
        description={description}
        actions={
          <ButtonLink href={`/documents/nouveau?type=${newType}`}>
            <IconPlus className="h-4 w-4" />
            Nouveau
          </ButtonLink>
        }
      />

      <ListFilters statuses={statuses} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-muted">
        <span>
          <strong className="font-semibold text-ink">{rows.length}</strong> document
          {rows.length > 1 ? "s" : ""}
        </span>
        <span>
          Total :{" "}
          <strong className="tnum font-semibold text-ink">
            {formatMoney(totalBase, baseCurrency ?? FALLBACK_CURRENCY)}
          </strong>
        </span>
        {dueBase > 0 && (
          <span>
            Reste dû :{" "}
            <strong className="tnum font-semibold text-danger">
              {formatMoney(dueBase, baseCurrency ?? FALLBACK_CURRENCY)}
            </strong>
          </span>
        )}
      </div>

      <DocumentTable rows={rows} emptyMessage={emptyMessage} showType={showType} />
    </PageShell>
  );
}
