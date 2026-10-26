import { requireSession } from "@/server/session";
import { SecuritySettings } from "./security-settings";

export const metadata = { title: "Sécurité" };

export default async function SecuritePage() {
  const session = await requireSession();

  return (
    <SecuritySettings
      email={session.user.email}
      twoFactorEnabled={Boolean(session.user.twoFactorEnabled)}
    />
  );
}
