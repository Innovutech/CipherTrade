import { loadAndValidateTokenEntries } from "./lib/token-metadata.mjs";

const { entries, errors } = await loadAndValidateTokenEntries();

if (errors.length > 0) {
  console.error(`Token metadata validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Token metadata validation passed (${entries.length} token entr${entries.length === 1 ? "y" : "ies"}).`);
}
