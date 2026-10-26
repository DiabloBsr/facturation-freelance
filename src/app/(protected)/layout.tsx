import { Sidebar } from "@/components/nav";
import { getCompany, getLogoMark } from "@/server/settings";
import { requireSession } from "@/server/session";

/**
 * Tout l'espace de travail vit sous ce layout : personne ne passe sans
 * session. Les server actions et les route handlers refont leur propre
 * contrôle — un layout ne protège que les pages.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSession();

  const [company, logoMark] = await Promise.all([getCompany(), getLogoMark()]);
  const displayName = company.tradeName?.trim() || company.legalName;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar companyName={displayName} logoMark={logoMark} accent={company.accentColor} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
