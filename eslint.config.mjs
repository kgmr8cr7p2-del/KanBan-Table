import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: projectDirectory });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Existing API payloads are intentionally shaped at runtime; keep the
      // typecheck strict while allowing these narrow boundary assertions.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // The optional Electron companion and its node:test smoke check are
    // deliberately CommonJS entrypoints. They run outside the Next runtime,
    // so require() is the portable module boundary for those files.
    files: ["desktop/**/*.cjs", "tests/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
