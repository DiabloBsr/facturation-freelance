import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Demandes de facture adressées aux intervenants.
 *
 * Le lien public ne porte qu'un jeton : c'est la seule clé d'accès, et le seul
 * endroit de l'application où l'on entre sans session. Il est donc long
 * (32 octets, 256 bits — hors de portée d'une énumération) et n'est stocké que
 * haché : une copie de la base ne rouvre aucun lien.
 */

/** Longueurs plausibles d'un jeton base64url de 32 octets, avec un peu de marge. */
const TOKEN_MIN = 32;
const TOKEN_MAX = 128;

export function hashRequestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createRequestToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashRequestToken(token) };
}

export const requestDetailInclude = {
  beneficiary: { select: { id: true, name: true, email: true } },
  lines: { orderBy: { position: "asc" } },
  payout: { select: { id: true, number: true } },
  document: { select: { id: true, number: true } },
} satisfies Prisma.PayoutRequestInclude;

export type PayoutRequestDetail = Prisma.PayoutRequestGetPayload<{
  include: typeof requestDetailInclude;
}>;

export const getPayoutRequest = cache(
  async (id: string): Promise<PayoutRequestDetail | null> =>
    prisma.payoutRequest.findUnique({ where: { id }, include: requestDetailInclude }),
);

/**
 * Demande correspondant à un jeton public, ou null.
 * La recherche porte sur l'empreinte : le jeton en clair n'est jamais comparé
 * ni journalisé.
 */
export async function findRequestByToken(
  token: string,
): Promise<PayoutRequestDetail | null> {
  if (typeof token !== "string" || token.length < TOKEN_MIN || token.length > TOKEN_MAX) {
    return null;
  }
  return prisma.payoutRequest.findUnique({
    where: { tokenHash: hashRequestToken(token) },
    include: requestDetailInclude,
  });
}

/** Une demande n'accepte un envoi que tant qu'elle est en attente et valide. */
export function isRequestOpen(request: {
  status: string;
  expiresAt: Date;
}): boolean {
  return request.status === "PENDING" && request.expiresAt.getTime() > Date.now();
}

export async function listPayoutRequests() {
  return prisma.payoutRequest.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      beneficiary: { select: { id: true, name: true } },
      document: { select: { id: true, number: true } },
      // Seuls les montants : de quoi afficher le total déclaré sans tout charger.
      lines: { select: { amount: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
}

/** Total déclaré par l'intervenant, en devise de la demande. */
export function requestTotal(lines: { amount: number }[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}
