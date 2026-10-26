import { SettingsTabs } from "@/components/settings/settings-tabs";
import { PageHeader, PageShell } from "@/components/page-header";

export const metadata = { title: "Mon entreprise" };

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <PageHeader
        title="Mon entreprise"
        description="Tout ce qui figure sur vos documents : identité, identifiants légaux, coordonnées de paiement, règles de facturation et modèles."
      />
      <SettingsTabs />
      {children}
    </PageShell>
  );
}
