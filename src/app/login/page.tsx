import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  // Déjà connecté : direction le tableau de bord.
  if (await getSession()) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <LoginForm />
    </div>
  );
}
