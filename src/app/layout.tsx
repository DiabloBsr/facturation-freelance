import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { FlashToaster, ToastProvider } from "@/components/ui/toast";
import { getCompany } from "@/server/settings";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  const name = company.tradeName?.trim() || company.legalName;

  return {
    // Le nom de l'entreprise dans l'onglet : deux fenêtres ouvertes ne se
    // ressemblent plus.
    title: { default: `Facturation · ${name}`, template: `%s · ${name}` },
    description: "Devis, factures, encaissements et suivi d'activité en freelance.",
    // L'icône de l'onglet est la marque choisie dans la galerie.
    icons: { icon: [{ url: "/api/logo/icon.svg", type: "image/svg+xml" }] },
  };
}

/**
 * Toutes les pages lisent la base à chaque affichage.
 * Sans cela, Next pré-rendrait certaines listes au moment du build et
 * afficherait des données figées.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <ToastProvider>
          <Suspense fallback={null}>
            <FlashToaster />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
