/**
 * db-lock.ts — Provoque volontairement un verrou Postgres pendant N secondes,
 * pour tester la résilience de l'app (timeouts, files d'attente, comportement
 * quand la BDD est « bloquée »).
 *
 * NON DESTRUCTIF : aucune donnée n'est écrite ni supprimée. Le script ouvre une
 * transaction, pose un verrou, le tient le temps demandé, puis COMMIT (relâche).
 * Ctrl+C relâche proprement avant la fin.
 *
 * ⚠️  À lancer de préférence sur une BRANCHE Neon jetable, pas sur la prod.
 *     (Neon → crée une branche, pointe DIRECT_URL/DATABASE_URL dessus, teste.)
 *
 * Usage :
 *   npx tsx scripts/db-lock.ts                          # verrou ACCESS EXCLUSIVE sur "Document", 30 s
 *   npx tsx scripts/db-lock.ts --table Payment --seconds 60
 *   npx tsx scripts/db-lock.ts --mode share --seconds 20
 *   npx tsx scripts/db-lock.ts --mode row --table Document --seconds 45
 *   npx tsx scripts/db-lock.ts --mode advisory --seconds 30
 *   npx tsx scripts/db-lock.ts --observe               # ouvre une 2e connexion qui se fait bloquer et mesure l'attente
 *   npx tsx scripts/db-lock.ts --pooled                # passe par DATABASE_URL (PgBouncer) au lieu de DIRECT_URL
 *
 * Modes :
 *   access-exclusive (défaut) — bloque TOUT sur la table, même les SELECT. Simule « la BDD est gelée ».
 *   share                     — bloque les écritures (INSERT/UPDATE/DELETE), laisse passer les lectures.
 *   row                       — verrouille une ligne (FOR UPDATE) : bloque seulement qui veut modifier cette ligne.
 *   advisory                  — verrou applicatif (pg_advisory_xact_lock) : ne bloque pas les tables, seulement
 *                               les autres qui tentent la même clé. Utile pour tester un mutex applicatif.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// --- Chargement .env (au cas où Prisma ne l'ait pas déjà fait) ----------------
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
    } catch {
      /* fichier absent : on ignore */
    }
  }
}
loadEnv();

// --- Arguments ----------------------------------------------------------------
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}
const has = (name: string) => process.argv.includes(`--${name}`);

if (has("help")) {
  console.log(readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\*+/, ""));
  process.exit(0);
}

const table = arg("table", "Document")!;
const mode = (arg("mode", "access-exclusive") ?? "access-exclusive").toLowerCase();
const seconds = Number(arg("seconds", "30"));
const usePooled = has("pooled");
const observe = has("observe");
const advisoryKey = Number(arg("advisory-key", "424242"));

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
  console.error(`Nom de table invalide : ${table}`);
  process.exit(1);
}
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) {
  console.error(`--seconds doit être entre 1 et 3600 (reçu : ${seconds})`);
  process.exit(1);
}

const url = usePooled ? process.env.DATABASE_URL : process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Aucune URL de connexion trouvée (DIRECT_URL / DATABASE_URL).");
  process.exit(1);
}

// --- Verrou selon le mode -----------------------------------------------------
function lockStatements(): { sql: string; note: string } {
  switch (mode) {
    case "access-exclusive":
      return {
        sql: `LOCK TABLE "${table}" IN ACCESS EXCLUSIVE MODE`,
        note: `bloque TOUT (y compris les SELECT) sur "${table}"`,
      };
    case "share":
      return {
        sql: `LOCK TABLE "${table}" IN SHARE MODE`,
        note: `bloque les écritures sur "${table}", laisse passer les lectures`,
      };
    case "row":
      return {
        sql: `SELECT id FROM "${table}" ORDER BY 1 LIMIT 1 FOR UPDATE`,
        note: `verrouille une ligne de "${table}" (FOR UPDATE)`,
      };
    case "advisory":
      return {
        sql: `SELECT pg_advisory_xact_lock(${advisoryKey})`,
        note: `verrou applicatif clé ${advisoryKey} (pg_advisory_xact_lock)`,
      };
    default:
      console.error(`Mode inconnu : ${mode}`);
      process.exit(1);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let stop = false;
process.on("SIGINT", () => {
  console.log("\n⏹  Ctrl+C reçu — relâchement du verrou…");
  stop = true;
});

// --- Le « tenant » du verrou --------------------------------------------------
async function holdLock() {
  const client = new PrismaClient({ datasourceUrl: url, log: ["error"] });
  const { sql, note } = lockStatements();
  console.log(`\n🔒 Connexion : ${usePooled ? "DATABASE_URL (poolée/PgBouncer)" : "DIRECT_URL (directe)"}`);
  console.log(`   Mode      : ${mode} — ${note}`);
  console.log(`   Durée     : ${seconds} s\n`);

  const start = Date.now();
  try {
    await client.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(sql);
        console.log(`✅ Verrou acquis à ${new Date().toLocaleTimeString()}. Maintien en cours…`);
        const end = start + seconds * 1000;
        while (Date.now() < end && !stop) {
          await sleep(Math.min(2000, end - Date.now()));
          // heartbeat : garde la transaction active (évite idle_in_transaction_session_timeout)
          await tx.$executeRawUnsafe("SELECT 1");
          const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          if (!stop) process.stdout.write(`   ⏳ verrou tenu — ${left}s restantes\r`);
        }
        console.log("\n🔓 Relâchement (COMMIT)…");
      },
      { timeout: seconds * 1000 + 15000, maxWait: 10000 },
    );
    console.log(`✔  Verrou relâché après ${((Date.now() - start) / 1000).toFixed(1)} s.`);
  } finally {
    await client.$disconnect();
  }
}

// --- L'observateur (optionnel) : se fait bloquer et mesure l'attente ----------
async function observer() {
  const client = new PrismaClient({ datasourceUrl: url, log: ["error"] });
  await sleep(800); // laisse le temps au verrou de se poser
  const probe =
    mode === "advisory"
      ? `SELECT pg_advisory_xact_lock(${advisoryKey})`
      : mode === "row"
        ? `SELECT id FROM "${table}" ORDER BY 1 LIMIT 1 FOR UPDATE`
        : `SELECT count(*)::int AS n FROM "${table}"`;
  console.log(`👀 Observateur : tente « ${probe} » sur une 2e connexion…`);
  const t0 = Date.now();
  try {
    await client.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(probe);
      },
      { timeout: seconds * 1000 + 20000, maxWait: seconds * 1000 + 20000 },
    );
    console.log(`👀 Observateur DÉBLOQUÉ après ${((Date.now() - t0) / 1000).toFixed(1)} s d'attente.`);
  } catch (e) {
    console.log(`👀 Observateur en erreur après ${((Date.now() - t0) / 1000).toFixed(1)} s : ${(e as Error).message}`);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const tasks = [holdLock()];
  if (observe) tasks.push(observer());
  await Promise.all(tasks);
  console.log("\nTerminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
