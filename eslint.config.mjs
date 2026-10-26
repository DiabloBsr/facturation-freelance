import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Les gabarits PDF utilisent <Image> de @react-pdf/renderer, qui n'est pas
    // une balise HTML : les règles d'accessibilité du DOM ne s'y appliquent pas.
    files: ["src/pdf/**/*.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
];

export default eslintConfig;
