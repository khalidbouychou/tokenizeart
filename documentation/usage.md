# Usage guide

## Prerequisites

- **Node.js 22.18 or newer** (tested with Node 24). Scripts are TypeScript run directly by Node.
- **npm** (comes with Node).
- For write actions only (deploy, mint, upload): a test wallet with a little **tBNB**, and a **Pinata** account for IPFS uploads.

Reading and checking the NFT needs none of the accounts.

## Install

From the repository root (it's an npm workspace, so this installs everything for `code/` and `deployment/`):

```bash
npm install
```

All commands below run from the `code/` folder:

```bash
cd code
```

## 1. Check the NFT (anyone, no keys)

```bash
npm run show-nft
```

It prints, live from BSC Testnet and IPFS:

- the collection name and symbol,
- **`ownerOf(0)`**, the wallet that owns the NFT,
- **`tokenURI(0)`**, the IPFS link to the metadata,
- the metadata: name `42 Genesis Blocks`, artist `khbouych`, attributes,
- the image: downloaded and checked to be a valid PNG, with a link to open it in a browser.

Another token: `TOKEN_ID=1 npm run show-nft` (a token that was never minted gives a clear "does not exist" message).

You can also look at it in a browser:

- Contract: https://testnet.bscscan.com/address/0xB81510a9b38443525808b3A762a68d5e9070a68f
- Token 0: https://testnet.bscscan.com/token/0xB81510a9b38443525808b3A762a68d5e9070a68f?a=0
- Image: https://gateway.pinata.cloud/ipfs/bafybeicdnsg3gsn5hillr3x7dbjarbnjrkxk7zrfygkdeehllwu2nvvu7e

### In a wallet (MetaMask)

1. Add the network **BSC Testnet**: RPC `https://data-seed-prebsc-1-s1.bnbchain.org:8545`, chain ID `97`, symbol `tBNB`, explorer `https://testnet.bscscan.com`.
2. Open the account that owns the NFT, then go to **NFTs → Import NFT**.
3. Address `0xB81510a9b38443525808b3A762a68d5e9070a68f`, token ID `0`.

## 2. Run the tests

```bash
npm test                              # all 15 tests on a local simulated chain
npx hardhat test test/TokenizeArt42.ts # one file
npm run build                         # compile only
```

## 3. Set up your own wallet and keys (for write actions)

All secrets go in `code/.env`, which git ignores. `code/.env.example` lists the variables:

| Variable | What it is |
|---|---|
| `BSC_TESTNET_PRIVATE_KEY` | Private key of the test-only deployer wallet |
| `BSC_TESTNET_RPC_URL` | BSC Testnet RPC endpoint |
| `DEPLOYER_ADDRESS` | Public address of that wallet |
| `PINATA_JWT` | Pinata API key (JWT) for IPFS uploads |

1. **Create a wallet:** `npm run create-wallet`. It writes the key, address and RPC URL into `code/.env` and prints only the address. It refuses to overwrite an existing `.env`.
2. **Get test tBNB:** paste the address into a BSC Testnet faucet. The official BNB Chain faucet requires a mainnet balance; `https://faucet.zalalena.com/bsc` worked without one.
3. **Check the balance:** `npm run check-deployer`.
4. **Pinata (for uploads):** create a free account at pinata.cloud, go to API Keys, then New Key, and put the **JWT** in `PINATA_JWT=`.

Never share or commit `code/.env`.

## 4. Full pipeline (how this NFT was made)

Each step is already done for the deployed NFT; the deploy and mint scripts refuse to run twice.

```bash
npm run generate-art                                  # draw the 42 artwork (PNG + SVG)
npm run upload-to-ipfs -- art/tokenize-art-42.png     # image → IPFS, prints its CID
#   then put that CID in art/tokenize-art-42.json → "image": "ipfs://<CID>"
npm run upload-to-ipfs -- art/tokenize-art-42.json    # metadata → IPFS, prints its CID
npm run deploy:local                                  # dry run on a local chain
npm run deploy                                        # deploy to BSC Testnet → deployment/bscTestnet.json
npm run mint                                          # mint token 0 → deployment/bscTestnet-mint.json
npm run show-nft                                      # check owner, metadata, image
```

To redo a deployment from scratch, delete `deployment/bscTestnet.json` and `deployment/bscTestnet-mint.json` first. A new contract gets a new address.

Verify the source code publicly (Sourcify, no API key needed):

```bash
npx hardhat verify sourcify --network bscTestnet <contract-address> "42 Genesis Blocks" GB42 <deployer-address>
```

## 5. Demo for the evaluation

A minimal sequence that shows everything working. Steps 1 and 2 together: `npm run demo`.

1. `npm test`: 15 passing tests, including "non-owner cannot mint" and "ownerOf returns the recipient".
2. `npm run show-nft`: the live owner, metadata and image from BSC Testnet and IPFS.
3. Open the image link: the 42 is clearly legible.
4. Open the BscScan contract page: the deployment and mint transactions are public.
5. Walk through [`security.md`](security.md): who can mint, two-step ownership, what the owner cannot do.

Never call `renounceOwnership()` during a demo: it removes the owner forever, and minting becomes impossible.

## 6. On-chain token (bonus)

Token #2 stores its metadata and image entirely in contract storage. To inspect it:

```bash
TOKEN_ID=2 npm run show-nft
```

It decodes the `data:` URI returned by `tokenURI(2)`, prints the metadata, and saves the decoded SVG to a temporary file you can open in a browser.

How it was minted:

```bash
npm run generate-art                 # also writes art/tokenize-art-42-onchain.svg (~1.6 KB, same look)
npm run mint-onchain                 # estimates gas and cost only; sends nothing
MINT=yes npm run mint-onchain        # mints, then writes deployment/bscTestnet-mint-onchain.json
```

The script refuses to run if your balance is below the estimate plus 20%, if the record already exists, or if a token with the same on-chain URI already exists. The token URI is built in `deployment/onchain-metadata.ts`. The SVG is embedded as UTF-8 (only `#` is escaped), which is ~25% smaller than base64.

## 7. Minting website (bonus)

```bash
cd code
npm run website        # serves http://127.0.0.1:8042 (SITE_PORT to change)
```

Open http://127.0.0.1:8042 in a browser with MetaMask installed.

- **Without a wallet:** the page shows the contract, its owner, the number minted, and a gallery of every token (image, name, artist, owner, explorer link), read live from BSC Testnet and IPFS.
- **Connect wallet:** MetaMask asks for permission and is switched to BSC Testnet, adding the network if needed.
- **Minting (owner wallet only):**
  1. The recipient defaults to your own address, and the metadata URI defaults to the "42 Genesis Blocks" metadata. A preview shows the name, artist and image the URI points to.
  2. Click **Mint**. The page validates the inputs and simulates the mint first, so a failing mint costs no gas, then MetaMask asks you to confirm.
  3. Once confirmed, the page shows the new token ID with a transaction link, and the gallery refreshes.
- **Any other wallet:** the form stays disabled and explains that only the owner can mint, matching the contract's rule.

To mint with the owner wallet in MetaMask, import its key there (MetaMask → Add account → Import account) from `code/.env`. Only do this on your own machine.

How it is built: `website/server.ts` serves an allow-listed set of files: the page, the ethers browser bundle from `node_modules` (no CDN), and `/config.json`, built from `deployment/bscTestnet.json`. It never sends anything from `code/.env` to the browser. The page (`website/app.js`) inserts on-chain and IPFS data with `textContent` only, and loads images only from `ipfs://` URIs through the gateway.

## Troubleshooting

| Message | Fix |
|---|---|
| `PINATA_JWT is missing` | Put your Pinata JWT in `code/.env` |
| `Invalid private key value … BSC_TESTNET_PRIVATE_KEY` | The value must be `0x` + 64 hex characters (the key, not the address) |
| `HHE708 … chain id "97", but connected to … "56"` | `BSC_TESTNET_RPC_URL` points at mainnet; use a testnet RPC |
| `insufficient funds` | Get more tBNB from a faucet; check with `npm run check-deployer` |
| Gateway `HTTP 429` | Public IPFS gateways rate-limit; the scripts try several. Retry later or use the Pinata gateway link |
| `… already exists: the contract is already deployed` | Intended guard; see "redo a deployment" above |
