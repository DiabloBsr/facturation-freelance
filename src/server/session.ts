import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Session courante, mémoïsée par requête. */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/**
 * Garde d'authentification des pages et server actions : redirige vers la
 * connexion si personne n'est connecté. Chaque server action DOIT l'appeler —
 * ce sont des endpoints HTTP publics, le layout ne les protège pas.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Garde des route handlers (PDF, exports…) : 401 plutôt qu'une redirection. */
export async function sessionOr401(): Promise<Response | null> {
  const session = await getSession();
  if (!session) return new Response("Authentification requise.", { status: 401 });
  return null;
}
