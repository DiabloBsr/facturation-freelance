/**
 * Détecte les styles en ligne qui mêlent une propriété raccourcie et une
 * propriété détaillée dans le même objet — par exemple `border` avec
 * `borderTop`.
 *
 * React avertit en console dans ce cas, à juste titre : l'ordre d'application
 * des deux n'est pas garanti d'un rendu à l'autre, ce qui produit des bordures
 * ou des marges qui changent toutes seules.
 *
 * Usage : node scripts/check-styles.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const SHORTHAND = {
  border: ["borderTop", "borderRight", "borderBottom", "borderLeft"],
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
  background: ["backgroundColor", "backgroundImage"],
  flex: ["flexGrow", "flexShrink", "flexBasis"],
};

/** Blocs `{ … }` ne contenant aucun autre bloc : un vrai objet de style. */
function innermostBlocks(text) {
  const found = [];
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "{") {
      stack.push([i, found.length]);
    } else if (char === "}" && stack.length > 0) {
      const [start, mark] = stack.pop();
      // Rien n'a été refermé à l'intérieur : le bloc est bien terminal.
      if (mark === found.length) found.push([start, text.slice(start, i + 1)]);
    }
  }
  return found;
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const problems = [];

for (const path of await sourceFiles("src")) {
  const text = await readFile(path, "utf8");
  for (const [position, block] of innermostBlocks(text)) {
    for (const [shorthand, longhands] of Object.entries(SHORTHAND)) {
      if (!new RegExp(`(?<![\\w.])${shorthand}\\s*:`).test(block)) continue;
      for (const longhand of longhands) {
        if (new RegExp(`(?<![\\w.])${longhand}\\s*:`).test(block)) {
          const line = text.slice(0, position).split("\n").length;
          problems.push(`${path}:${line}  « ${shorthand} » avec « ${longhand} »`);
        }
      }
    }
  }
}

const unique = [...new Set(problems)].sort();

if (unique.length > 0) {
  console.log(`${unique.length} conflit(s) de style :`);
  for (const problem of unique) console.log(`  ${problem}`);
  process.exitCode = 1;
} else {
  console.log("Aucun style ne mêle propriété raccourcie et propriété détaillée.");
}
