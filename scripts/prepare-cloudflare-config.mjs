import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_CONFIG = resolve(ROOT, "wrangler.jsonc");
const OUTPUT_CONFIG = resolve(ROOT, "wrangler.deploy.jsonc");
const PLACEHOLDER = "REPLACE_WITH_YOUR_D1_DATABASE_ID";

export function isValidCloudflareUuid(value) {
  return /^[0-9a-f]{32}$/i.test(value ?? "") || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value ?? "");
}

export function renderCloudflareConfig(source, databaseId) {
  if (!isValidCloudflareUuid(databaseId)) {
    throw new Error(
      "CLOUDFLARE_D1_DATABASE_ID doit contenir le database_id D1 reel de lexigo-scores. " +
        "Commande: pnpm run cf:d1:list"
    );
  }

  if (!source.includes(PLACEHOLDER)) {
    throw new Error(`Placeholder ${PLACEHOLDER} introuvable dans wrangler.jsonc.`);
  }

  return source.replaceAll(PLACEHOLDER, databaseId);
}

export function prepareCloudflareConfig({
  sourcePath = SOURCE_CONFIG,
  outputPath = OUTPUT_CONFIG,
  databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID,
} = {}) {
  const source = readFileSync(sourcePath, "utf-8");
  const rendered = renderCloudflareConfig(source, databaseId);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered);
  return outputPath;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputPath = prepareCloudflareConfig();
  console.log(`Wrangler config generated: ${outputPath}`);
}
