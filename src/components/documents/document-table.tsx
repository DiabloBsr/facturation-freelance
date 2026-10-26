import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableEmpty, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, daysLate } from "@/lib/dates";
import { formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import { DOCUMENT_TYPE_SHORT, type DocumentType } from "@/lib/enums";
import type { DocumentRow } from "@/server/documents";
import { getCurrencyMap } from "@/server/settings";

export async function DocumentTable({
  rows,
  emptyMessage,
  showType,
}: {
  rows: DocumentRow[];
  emptyMessage: React.ReactNode;
  showType?: boolean;
}) {
  const currencies = await getCurrencyMap();
  const columnCount = showType ? 8 : 7;

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>Numéro</TH>
            {showType && <TH>Type</TH>}
            <TH>Date</TH>
            <TH>Destinataire</TH>
            <TH>Objet</TH>
            <TH>Statut</TH>
            <TH align="right">Total</TH>
            <TH align="right">Reste dû</TH>
          </TR>
        </THead>
        <tbody>
          {rows.length === 0 && <TableEmpty colSpan={columnCount}>{emptyMessage}</TableEmpty>}

          {rows.map((row) => {
            const currency = currencies.get(row.currency) ?? FALLBACK_CURRENCY;
            const late = row.status === "LATE" ? daysLate(row.dueDate) : 0;

            return (
              <TR key={row.id} interactive>
                <TD className="font-medium">
                  <Link
                    href={`/documents/${row.id}`}
                    className="tnum text-ink transition-colors hover:text-accent"
                  >
                    {row.number ?? (
                      <span className="text-faint italic">brouillon</span>
                    )}
                  </Link>
                </TD>

                {showType && (
                  <TD className="text-[13px] text-muted">
                    {DOCUMENT_TYPE_SHORT[row.type as DocumentType] ?? row.type}
                  </TD>
                )}

                <TD className="tnum whitespace-nowrap text-[13px] text-muted">
                  {formatDate(row.issueDate)}
                </TD>

                <TD>
                  <Link
                    href={`/${row.billTo.kind === "AGENCY" ? "agences" : "clients"}/${row.billTo.id}`}
                    className="text-[13px] font-medium text-ink transition-colors hover:text-accent"
                  >
                    {row.billTo.name}
                  </Link>
                  {row.endClient && (
                    <span className="mt-0.5 block text-[11px] text-faint">
                      pour {row.endClient.name}
                    </span>
                  )}
                </TD>

                <TD className="max-w-[22ch] truncate text-[13px] text-muted" title={row.subject ?? ""}>
                  {row.subject ?? "—"}
                </TD>

                <TD>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={row.status} />
                    {late > 0 && (
                      <span className="text-[11px] font-medium text-danger">
                        {late} j de retard
                      </span>
                    )}
                  </div>
                </TD>

                <TD align="right" className="tnum whitespace-nowrap font-medium">
                  {formatMoney(row.total, currency)}
                </TD>

                <TD align="right" className="tnum whitespace-nowrap">
                  {row.balanceDue > 0 ? (
                    <span className="font-medium text-danger">
                      {formatMoney(row.balanceDue, currency)}
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
  );
}
