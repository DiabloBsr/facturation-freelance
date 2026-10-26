/**
 * Crée le compte propriétaire via better-auth (hash scrypt géré par la lib).
 *
 * Usage (PowerShell) :
 *   $env:ALLOW_SIGNUP="1"; $env:SEED_EMAIL="..."; $env:SEED_PASSWORD="..."
 *   npx tsx scripts/seed-owner.ts
 *
 * DATABASE_URL/DIRECT_URL désignent la base cible (dev ou production).
 * Les inscriptions restant fermées partout ailleurs, ce script est le seul
 * chemin de création de compte.
 */
import { auth } from "../src/lib/auth";

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const name = process.env.SEED_NAME ?? "Propriétaire";

if (!email || !password) {
  console.error("SEED_EMAIL et SEED_PASSWORD sont requis.");
  process.exit(1);
}
if (process.env.ALLOW_SIGNUP !== "1") {
  console.error("ALLOW_SIGNUP=1 est requis (les inscriptions sont fermées).");
  process.exit(1);
}

(async () => {
  try {
    const result = await auth.api.signUpEmail({ body: { email, password, name } });
    console.log("compte créé :", result.user.email);
    process.exit(0);
  } catch (error) {
    const body = (error as { body?: unknown }).body;
    console.error("échec :", body ?? error);
    process.exit(1);
  }
})();
