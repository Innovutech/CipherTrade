import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "../..");
export const CHAINS_ROOT = path.join(REPOSITORY_ROOT, "token-metadata", "chains");
export const DIST_ROOT = path.join(REPOSITORY_ROOT, "dist");
export const CANONICAL_RAW_BASE =
  "https://raw.githubusercontent.com/Innovutech/CipherTrade/main";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const LOWERCASE_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_LOGO_BYTES = 512 * 1024;
const MIN_LOGO_DIMENSION = 32;
const MAX_LOGO_DIMENSION = 1024;
const TOP_LEVEL_KEYS = new Set([
  "tokenAddress",
  "private",
  "tokenSymbol",
  "cgCoinId",
  "marketDataReference"
]);
const MARKET_REFERENCE_KEYS = new Set([
  "chainId",
  "tokenAddress",
  "priceMultiplier"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateTrimmedString(value, field, maxLength, errors, entryLabel) {
  if (typeof value !== "string") {
    errors.push(`${entryLabel}: ${field} must be a string`);
    return;
  }

  if (value.length === 0 || value.trim() !== value) {
    errors.push(`${entryLabel}: ${field} must be non-empty and have no surrounding whitespace`);
  }

  if (value.length > maxLength) {
    errors.push(`${entryLabel}: ${field} must not exceed ${maxLength} characters`);
  }

  if (/\p{Cc}/u.test(value)) {
    errors.push(`${entryLabel}: ${field} must not contain control characters`);
  }
}

async function readDirectory(directoryPath) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function validateLogo(logoPath, entryLabel, errors) {
  let logo;
  try {
    logo = await fs.readFile(logoPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      errors.push(`${entryLabel}: logo.png is missing`);
      return;
    }
    throw error;
  }

  if (logo.length > MAX_LOGO_BYTES) {
    errors.push(`${entryLabel}: logo.png exceeds 512 KiB`);
  }

  if (logo.length < 24 || !logo.subarray(0, 8).equals(PNG_SIGNATURE)) {
    errors.push(`${entryLabel}: logo.png is not a valid PNG file`);
    return;
  }

  if (logo.subarray(12, 16).toString("ascii") !== "IHDR") {
    errors.push(`${entryLabel}: logo.png has an invalid PNG header`);
    return;
  }

  const width = logo.readUInt32BE(16);
  const height = logo.readUInt32BE(20);

  if (width !== height) {
    errors.push(`${entryLabel}: logo.png must be square, received ${width}x${height}`);
  }

  if (
    width < MIN_LOGO_DIMENSION ||
    height < MIN_LOGO_DIMENSION ||
    width > MAX_LOGO_DIMENSION ||
    height > MAX_LOGO_DIMENSION
  ) {
    errors.push(
      `${entryLabel}: logo.png dimensions must be between 32x32 and 1024x1024 pixels`
    );
  }
}

function validateMetadata(entry, errors) {
  const { metadata, chainId, addressDirectory, label } = entry;

  if (!isPlainObject(metadata)) {
    errors.push(`${label}: metadata.json must contain a JSON object`);
    return;
  }

  for (const key of Object.keys(metadata)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      errors.push(`${label}: unsupported metadata field "${key}"`);
    }
  }

  for (const requiredField of ["tokenAddress", "private", "tokenSymbol"]) {
    if (!Object.hasOwn(metadata, requiredField)) {
      errors.push(`${label}: missing required field "${requiredField}"`);
    }
  }

  if (typeof metadata.tokenAddress !== "string" || !EVM_ADDRESS_PATTERN.test(metadata.tokenAddress)) {
    errors.push(`${label}: tokenAddress must be a valid EVM address`);
  } else if (metadata.tokenAddress.toLowerCase() !== addressDirectory) {
    errors.push(
      `${label}: tokenAddress does not match its lowercase directory name (${addressDirectory})`
    );
  }

  if (typeof metadata.private !== "boolean") {
    errors.push(`${label}: private must be a boolean`);
  }

  validateTrimmedString(metadata.tokenSymbol, "tokenSymbol", 32, errors, label);

  if (Object.hasOwn(metadata, "cgCoinId")) {
    validateTrimmedString(metadata.cgCoinId, "cgCoinId", 128, errors, label);
  }

  if (Object.hasOwn(metadata, "marketDataReference")) {
    const reference = metadata.marketDataReference;

    if (!isPlainObject(reference)) {
      errors.push(`${label}: marketDataReference must be an object`);
      return;
    }

    for (const key of Object.keys(reference)) {
      if (!MARKET_REFERENCE_KEYS.has(key)) {
        errors.push(`${label}: unsupported marketDataReference field "${key}"`);
      }
    }

    if (!Object.hasOwn(reference, "tokenAddress")) {
      errors.push(`${label}: marketDataReference.tokenAddress is required`);
    } else if (
      reference.tokenAddress !== "native" &&
      (typeof reference.tokenAddress !== "string" ||
        !EVM_ADDRESS_PATTERN.test(reference.tokenAddress))
    ) {
      errors.push(
        `${label}: marketDataReference.tokenAddress must be an EVM address or "native"`
      );
    }

    if (
      Object.hasOwn(reference, "chainId") &&
      (!Number.isSafeInteger(reference.chainId) || reference.chainId < 1)
    ) {
      errors.push(`${label}: marketDataReference.chainId must be a positive integer`);
    }

    if (
      Object.hasOwn(reference, "priceMultiplier") &&
      (typeof reference.priceMultiplier !== "string" ||
        !POSITIVE_DECIMAL_PATTERN.test(reference.priceMultiplier))
    ) {
      errors.push(
        `${label}: marketDataReference.priceMultiplier must be a positive decimal string`
      );
    }
  }

  if (!Number.isSafeInteger(chainId) || chainId < 1) {
    errors.push(`${label}: chain directory must be a positive integer`);
  }
}

export async function loadAndValidateTokenEntries() {
  const errors = [];
  const entries = [];
  const chainDirectoryEntries = await readDirectory(CHAINS_ROOT);

  if (chainDirectoryEntries === null) {
    errors.push("token-metadata/chains does not exist");
    return { entries, errors };
  }

  for (const chainDirectoryEntry of chainDirectoryEntries) {
    if (!chainDirectoryEntry.isDirectory()) {
      if (chainDirectoryEntry.name !== "README.md" && !chainDirectoryEntry.name.startsWith(".")) {
        errors.push(`token-metadata/chains/${chainDirectoryEntry.name}: unexpected file`);
      }
      continue;
    }

    if (!/^[1-9][0-9]*$/.test(chainDirectoryEntry.name)) {
      errors.push(
        `token-metadata/chains/${chainDirectoryEntry.name}: chain directory must be a positive integer`
      );
      continue;
    }

    const chainId = Number(chainDirectoryEntry.name);
    const chainPath = path.join(CHAINS_ROOT, chainDirectoryEntry.name);
    const tokenDirectoryEntries = await readDirectory(chainPath);

    for (const tokenDirectoryEntry of tokenDirectoryEntries ?? []) {
      if (!tokenDirectoryEntry.isDirectory()) {
        if (tokenDirectoryEntry.name !== "README.md" && !tokenDirectoryEntry.name.startsWith(".")) {
          errors.push(
            `token-metadata/chains/${chainDirectoryEntry.name}/${tokenDirectoryEntry.name}: unexpected file`
          );
        }
        continue;
      }

      const addressDirectory = tokenDirectoryEntry.name;
      const label = `${chainDirectoryEntry.name}/${addressDirectory}`;

      if (!LOWERCASE_ADDRESS_PATTERN.test(addressDirectory)) {
        errors.push(`${label}: token directory must be a lowercase EVM address`);
        continue;
      }

      const tokenPath = path.join(chainPath, addressDirectory);
      const tokenFiles = await readDirectory(tokenPath);
      const allowedFiles = new Set(["metadata.json", "logo.png"]);

      for (const tokenFile of tokenFiles ?? []) {
        if (!tokenFile.isFile() || !allowedFiles.has(tokenFile.name)) {
          errors.push(`${label}: unexpected entry "${tokenFile.name}"`);
        }
      }

      const metadataPath = path.join(tokenPath, "metadata.json");
      const logoPath = path.join(tokenPath, "logo.png");
      let metadata;

      try {
        metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
      } catch (error) {
        if (error && error.code === "ENOENT") {
          errors.push(`${label}: metadata.json is missing`);
        } else if (error instanceof SyntaxError) {
          errors.push(`${label}: metadata.json contains invalid JSON (${error.message})`);
        } else {
          throw error;
        }
      }

      const entry = {
        chainId,
        chainIdText: chainDirectoryEntry.name,
        addressDirectory,
        tokenPath,
        metadataPath,
        logoPath,
        metadata,
        label
      };

      if (metadata !== undefined) {
        validateMetadata(entry, errors);
      }
      await validateLogo(logoPath, label, errors);
      entries.push(entry);
    }
  }

  entries.sort((left, right) => {
    if (left.chainId !== right.chainId) {
      return left.chainId - right.chainId;
    }
    return left.addressDirectory.localeCompare(right.addressDirectory);
  });

  return { entries, errors };
}

export function buildGeneratedToken(entry) {
  const generated = {
    tokenAddress: entry.metadata.tokenAddress,
    private: entry.metadata.private,
    tokenSymbol: entry.metadata.tokenSymbol,
    logoUrl: `${CANONICAL_RAW_BASE}/token-metadata/chains/${entry.chainIdText}/${entry.addressDirectory}/logo.png`
  };

  if (Object.hasOwn(entry.metadata, "cgCoinId")) {
    generated.cgCoinId = entry.metadata.cgCoinId;
  }

  if (Object.hasOwn(entry.metadata, "marketDataReference")) {
    generated.marketDataReference = entry.metadata.marketDataReference;
  }

  return generated;
}
