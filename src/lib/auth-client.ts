"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/** Client d'authentification côté navigateur (connexion, 2FA, mot de passe). */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
