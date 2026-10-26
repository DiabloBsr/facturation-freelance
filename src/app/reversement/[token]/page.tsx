import type { Metadata } from "next";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { findRequestByToken, isRequestOpen, requestTotal } from "@/server/payout-requests";
import { getCompany, getCurrencyFormat } from "@/server/settings";
import { RequestForm } from "./request-form";

/** Un lien privé n'a rien à faire dans un index de moteur de recherche. */
export const metadata: Metadata = {
  title: "Déclarer ma facture",
  robots: { index: false, follow: false },
};

export default async function ReversementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [request, company] = await Promise.all([findRequestByToken(token), getCompany()]);
  const companyName = company.tradeName?.trim() || company.legalName;

  // Jeton inconnu, révoqué ou périmé : même écran dans tous les cas, aucune
  // information ne filtre sur l'existence ou non d'une demande.
  if (!request || request.status === "CANCELLED" || request.expiresAt.getTime() <= Date.now()) {
    return (
      <Shell companyName={companyName}>
        <h1 className="text-lg font-semibold tracking-tight text-ink">Lien expiré</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Ce lien n&apos;est plus valable. Demandez-en un nouveau à {companyName} pour
          transmettre votre facture.
        </p>
      </Shell>
    );
  }

  const currency = await getCurrencyFormat(request.currency);

  // Déjà envoyée : on affiche le récapitulatif, en lecture seule.
  if (!isRequestOpen(request)) {
    const total = requestTotal(request.lines);
    return (
      <Shell companyName={companyName}>
        <h1 className="text-lg font-semibold tracking-tight text-ink">Facture transmise</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Merci {request.beneficiary.name}. Votre déclaration a bien été reçue
          {request.submittedAt ? ` le ${formatDate(request.submittedAt)}` : ""} — il n&apos;y a
          rien d&apos;autre à faire.
        </p>

        <ul className="mt-5 divide-y divide-[var(--border)] rounded-[var(--radius)] border border-line">
          {request.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="min-w-0 text-[13px] text-ink">{line.label}</span>
              <span className="tnum shrink-0 text-[13px] font-medium text-ink">
                {formatMoney(line.amount, currency)}
              </span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 bg-surface-2 px-4 py-3">
            <span className="text-[13px] font-semibold text-ink">Total</span>
            <span className="tnum text-sm font-semibold text-ink">
              {formatMoney(total, currency)}
            </span>
          </li>
        </ul>
      </Shell>
    );
  }

  return (
    <Shell companyName={companyName} wide>
      <RequestForm
        token={token}
        beneficiaryName={request.beneficiary.name}
        companyName={companyName}
        subject={request.subject}
        expiresAt={formatDate(request.expiresAt)}
        defaultEmail={request.beneficiary.email}
        currency={currency}
      />
    </Shell>
  );
}

/** Cadre autonome : la page publique n'a ni barre latérale ni session. */
function Shell({
  children,
  companyName,
  wide,
}: {
  children: React.ReactNode;
  companyName: string;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-surface-2 px-4 py-10">
      <div className={`mx-auto w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <p className="mb-4 text-[13px] font-medium text-muted">{companyName}</p>
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-sm)]">
          {children}
        </div>
      </div>
    </div>
  );
}
