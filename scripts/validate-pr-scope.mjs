import { execFileSync } from "node:child_process";

const [baseSha, headSha] = process.argv.slice(2);

if (!baseSha || !headSha) {
  console.error("Usage: node scripts/validate-pr-scope.mjs <base-sha> <head-sha>");
  process.exit(1);
}

const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", `${baseSha}...${headSha}`],
  { encoding: "utf8" }
)
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const tokenRootPattern = /^(token-metadata\/chains\/[1-9][0-9]*\/0x[a-f0-9]{40})(?:\/|$)/;
const tokenRoots = new Set();

for (const changedFile of changedFiles) {
  const match = changedFile.match(tokenRootPattern);
  if (match) {
    tokenRoots.add(match[1]);
  }
}

if (tokenRoots.size > 1) {
  console.error("A token metadata pull request may change only one token directory.");
  for (const tokenRoot of tokenRoots) {
    console.error(`- ${tokenRoot}`);
  }
  process.exit(1);
}

if (tokenRoots.size === 1) {
  const [tokenRoot] = tokenRoots;
  const unrelatedFiles = changedFiles.filter(
    (changedFile) => !changedFile.startsWith(`${tokenRoot}/`)
  );

  if (unrelatedFiles.length > 0) {
    console.error(
      "A token submission may not include framework or unrelated file changes."
    );
    for (const unrelatedFile of unrelatedFiles) {
      console.error(`- ${unrelatedFile}`);
    }
    process.exit(1);
  }
}

console.log(
  tokenRoots.size === 1
    ? "Pull request scope is valid for one token entry."
    : "No token-entry scope restriction was required for this framework-only change."
);
