import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { prisma } from "./prisma";

/**
 * Authentification de l'application.
 *
 * Compte unique propriétaire : les inscriptions sont fermées en temps normal.
 * `ALLOW_SIGNUP=1` ne sert qu'au seeding initial du compte, jamais en
 * production. Double facteur TOTP disponible, limitation de débit stockée en
 * base (les instances serverless ne partagent pas leur mémoire).
 */
export const auth = betterAuth({
  appName: "Facturation",
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.ALLOW_SIGNUP !== "1",
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
    },
  },
  plugins: [twoFactor({ issuer: "Facturation" })],
});
