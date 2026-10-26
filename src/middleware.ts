import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Barrière optimiste : sans cookie de session, redirection immédiate vers la
 * connexion. Ce n'est qu'un confort (le cookie n'est pas vérifié ici) — la
 * vraie garde est `requireSession()` côté serveur, dans le layout protégé,
 * chaque server action et chaque route handler.
 */
export function middleware(request: NextRequest) {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf : connexion, espace public des intervenants (/reversement, gardé
  // par son seul jeton), API d'auth, logo (favicon de l'onglet, visible sur la
  // page de connexion), assets Next et fichiers statiques.
  matcher: [
    "/((?!login|reversement|api/auth|api/logo|_next/static|_next/image|favicon.ico).*)",
  ],
};
