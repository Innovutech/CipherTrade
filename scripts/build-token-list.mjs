import fs from "node:fs/promises";
import path from "node:path";
import {
  DIST_ROOT,
  buildGeneratedToken,
  loadAndValidateTokenEntries
} from "./lib/token-metadata.mjs";

const { entries, errors } = await loadAndValidateTokenEntries();

if (errors.length > 0) {
  console.error("Cannot build token lists because validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

await fs.rm(DIST_ROOT, { recursive: true, force: true });
const chainsOutputDirectory = path.join(DIST_ROOT, "chains");
await fs.mkdir(chainsOutputDirectory, { recursive: true });

const entriesByChain = new Map();
for (const entry of entries) {
  const chainEntries = entriesByChain.get(entry.chainIdText) ?? [];
  chainEntries.push(buildGeneratedToken(entry));
  entriesByChain.set(entry.chainIdText, chainEntries);
}

const manifest = {
  schemaVersion: 1,
  chains: {}
};

for (const chainId of [...entriesByChain.keys()].sort((left, right) => Number(left) - Number(right))) {
  const tokens = entriesByChain.get(chainId);
  const relativePath = `chains/${chainId}.json`;

  await fs.writeFile(
    path.join(DIST_ROOT, relativePath),
    `${JSON.stringify(tokens, null, 2)}\n`,
    "utf8"
  );

  manifest.chains[chainId] = {
    path: relativePath,
    tokenCount: tokens.length
  };
}

await fs.writeFile(
  path.join(DIST_ROOT, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(
  `Built ${entries.length} token entr${entries.length === 1 ? "y" : "ies"} across ${entriesByChain.size} chain${entriesByChain.size === 1 ? "" : "s"}.`
);
