# CipherTrade Token Metadata

This repository hosts community-maintained token metadata used by CipherTrade.

Projects add one directory per token under:

```text
token-metadata/chains/<chainId>/<lowercase-token-address>/
├── metadata.json
└── logo.png
```

Contributors do **not** add `logoUrl` to `metadata.json`. The canonical raw GitHub URL is generated automatically from the token path when the per-chain token list is built.

## Example metadata

```json
{
  "tokenAddress": "0x682e3142e62a7aDe2a0CA5bdC87b205CaDe4B17a",
  "private": true,
  "tokenSymbol": "p.WISP",
  "cgCoinId": "wisp",
  "marketDataReference": {
    "tokenAddress": "0xb70c55bd0823436F44877DC6A9f46E0C55f2C3A8"
  }
}
```

`cgCoinId` and `marketDataReference` are optional. `marketDataReference` accepts:

```json
{
  "chainId": 2632500,
  "tokenAddress": "0x0000000000000000000000000000000000000000",
  "priceMultiplier": "1"
}
```

`chainId` and `priceMultiplier` may be omitted. `tokenAddress` may also be `"native"`.

## Commands

```bash
npm run tokens:validate
npm run tokens:build
```

The build command writes generated lists to `dist/chains/<chainId>.json`. Generated entries match the submitted metadata and add the canonical `logoUrl` field.

See [CONTRIBUTING.md](CONTRIBUTING.md) for submission requirements.

## Disclaimer

Token-list inclusion is metadata curation only. It is not a contract audit, verification of safety, or endorsement by CipherTrade.
