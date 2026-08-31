# Contributing token metadata

Submit one token per pull request.

## 1. Create the token directory

Use the chain ID and the lowercase token contract address:

```text
token-metadata/chains/<chainId>/<lowercase-token-address>/
```

For example:

```text
token-metadata/chains/2632500/0x682e3142e62a7ade2a0ca5bdc87b205cade4b17a/
```

The directory must contain exactly:

```text
metadata.json
logo.png
```

## 2. Add `metadata.json`

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

Required fields:

- `tokenAddress`: the token contract address.
- `private`: `true` for a private token, otherwise `false`.
- `tokenSymbol`: the token symbol displayed by CipherTrade.

Optional fields:

- `cgCoinId`: the token's CoinGecko coin ID.
- `marketDataReference`: pricing and analytics identity inherited from another token or the native asset.

A full `marketDataReference` is:

```json
{
  "chainId": 2632500,
  "tokenAddress": "0xb70c55bd0823436F44877DC6A9f46E0C55f2C3A8",
  "priceMultiplier": "1"
}
```

Within a per-chain file, `chainId` and `priceMultiplier` may be omitted. `tokenAddress` may be an EVM contract address or `"native"`.

Do not add `logoUrl`. It is derived from the repository path during the build.

## 3. Add `logo.png`

The logo must be:

- PNG format;
- square;
- between 32 x 32 and 1024 x 1024 pixels;
- no larger than 512 KiB.

## 4. Validate the submission

Node.js 20 or newer is required.

```bash
npm run tokens:validate
npm run tokens:build
```

## 5. Open the pull request

Include links showing that the submitting project controls or officially recognizes the token contract and logo. Pull requests that change multiple token directories or mix token metadata with framework changes will fail validation.
