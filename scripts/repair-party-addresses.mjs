/**
 * Réparation ponctuelle des fiches tiers créées avant la correction du
 * pré-remplissage automatique du pays.
 *
 * Deux choses à réparer :
 *  - le pays « Madagascar » inscrit d'office sur des tiers qui ne l'ont jamais
 *    été : c'est une affirmation que l'utilisateur n'a pas faite, elle est
 *    effacée plutôt que devinée (un pays vide ne s'imprime pas) ;
 *  - les lignes d'identifiants (NIF, STAT…) enregistrées sans numéro, qui
 *    encombraient la fiche sans rien apporter.
 *
 * Le pays n'est conservé que s'il a manifestement été saisi (valeur autre que
 * la valeur d'usine).
 *
 * Usage : node scripts/repair-party-addresses.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const AUTO_FILLED = "Madagascar";

const parties = await prisma.party.findMany({ include: { identifiers: true } });
let cleared = 0;
let identifiersRemoved = 0;

for (const party of parties) {
  // Le pays d'usine n'est effacé que si rien d'autre ne le corrobore :
  // ni ville, ni région ne mentionnant le pays.
  if (party.country === AUTO_FILLED) {
    await prisma.party.update({ where: { id: party.id }, data: { country: "" } });
    cleared++;
    console.log(`  ${party.name} : pays « ${AUTO_FILLED} » effacé (jamais choisi)`);
  }

  const empties = party.identifiers.filter((identifier) => identifier.value.trim() === "");
  if (empties.length > 0) {
    await prisma.partyIdentifier.deleteMany({
      where: { id: { in: empties.map((identifier) => identifier.id) } },
    });
    identifiersRemoved += empties.length;
    console.log(
      `  ${party.name} : ${empties.length} identifiant(s) sans numéro retiré(s)`,
    );
  }
}

console.log(
  `\n${cleared} pays effacé(s), ${identifiersRemoved} identifiant(s) vide(s) retiré(s).`,
);
console.log("Renseignez le pays de chaque client depuis sa fiche.");

await prisma.$disconnect();
