import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty";
import { IconBank, IconMobile, IconTrash } from "@/components/icons";
import { BankAccountForm } from "@/components/settings/bank-account-form";
import { BANK_ACCOUNT_KIND_LABELS, type BankAccountKind } from "@/lib/enums";
import { getActiveCurrencies, getBankAccounts, getCompany } from "@/server/settings";
import { deleteBankAccount, upsertBankAccount } from "@/server/actions/settings";

export const metadata = { title: "Coordonnées de paiement" };

/** Résumé lisible d'un compte, tel qu'il apparaîtra sur le document. */
function summarize(account: {
  kind: string;
  bankName: string | null;
  bankCode: string | null;
  branchCode: string | null;
  accountNumber: string | null;
  ribKey: string | null;
  iban: string | null;
  provider: string | null;
  phoneNumber: string | null;
  accountRef: string | null;
}): string {
  if (account.kind === "MOBILE_MONEY") {
    return [account.provider, account.phoneNumber].filter(Boolean).join(" · ") || "—";
  }
  if (account.kind === "PAYPAL" || account.kind === "WISE") {
    return account.accountRef ?? "—";
  }
  const rib = [account.bankCode, account.branchCode, account.accountNumber, account.ribKey]
    .filter(Boolean)
    .join(" ");
  return [account.bankName, rib || account.iban].filter(Boolean).join(" · ") || "—";
}

export default async function ParametresPaiementsPage() {
  const [accounts, currencies, company] = await Promise.all([
    getBankAccounts(),
    getActiveCurrencies(),
    getCompany(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Comptes enregistrés"
          description="Le compte choisi sur un document apparaît dans le bloc « coordonnées de paiement » du PDF."
        />

        {accounts.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<IconBank />}
            title="Aucune coordonnée de paiement"
            description="Ajoutez votre RIB, votre IBAN ou un numéro Mobile Money pour que vos clients sachent où régler."
          />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface-2 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 text-faint">
                    {account.kind === "MOBILE_MONEY" ? (
                      <IconMobile className="h-4 w-4" />
                    ) : (
                      <IconBank className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink">
                      {account.label}
                      {account.isDefault && <Badge tone="accent">par défaut</Badge>}
                      {!account.showOnPdf && <Badge tone="neutral">masqué du PDF</Badge>}
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-muted">{summarize(account)}</p>
                    <p className="text-[11px] text-faint">
                      {BANK_ACCOUNT_KIND_LABELS[account.kind as BankAccountKind]} ·{" "}
                      {account.currency}
                    </p>
                  </div>
                </div>

                <ConfirmAction
                  action={deleteBankAccount}
                  hidden={{ id: account.id }}
                  triggerLabel=""
                  triggerVariant="ghost"
                  triggerSize="icon"
                  icon={<IconTrash className="h-4 w-4" />}
                  title={`Supprimer « ${account.label} » ?`}
                  description="Ces coordonnées disparaîtront des documents qui les affichent. Les encaissements déjà rattachés à ce compte sont conservés, mais perdent le lien."
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modification d'un compte existant */}
      {accounts.map((account) => (
        <details
          key={account.id}
          className="rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-sm)]"
        >
          <summary className="cursor-pointer px-5 py-3.5 text-[13px] font-medium text-ink">
            Modifier « {account.label} »
          </summary>
          <div className="border-t border-line p-1">
            <BankAccountForm
              action={upsertBankAccount}
              values={{
                id: account.id,
                kind: account.kind,
                label: account.label,
                holder: account.holder,
                bankName: account.bankName,
                branchName: account.branchName,
                bankCode: account.bankCode,
                branchCode: account.branchCode,
                accountNumber: account.accountNumber,
                ribKey: account.ribKey,
                iban: account.iban,
                bic: account.bic,
                provider: account.provider,
                phoneNumber: account.phoneNumber,
                accountRef: account.accountRef,
                currency: account.currency,
                isDefault: account.isDefault,
                showOnPdf: account.showOnPdf,
                notes: account.notes,
              }}
              currencies={currencies}
              title={account.label}
              submitLabel="Enregistrer les modifications"
            />
          </div>
        </details>
      ))}

      <BankAccountForm
        action={upsertBankAccount}
        values={{
          kind: "BANK",
          label: "",
          holder: company.legalName,
          bankName: null,
          branchName: null,
          bankCode: null,
          branchCode: null,
          accountNumber: null,
          ribKey: null,
          iban: null,
          bic: null,
          provider: null,
          phoneNumber: null,
          accountRef: null,
          currency: company.defaultCurrency,
          isDefault: accounts.length === 0,
          showOnPdf: true,
          notes: null,
        }}
        currencies={currencies}
        title="Ajouter des coordonnées"
        description="Compte bancaire, Mobile Money (MVola, Orange Money, Airtel Money), PayPal ou Wise."
        submitLabel="Ajouter"
      />
    </div>
  );
}
