# How it works

An NFT is a record on a blockchain that says **who owns token #N**, plus a **link to what the token represents**. This project has three pieces that fit together:

```
 ┌──────────────────────────┐        tokenURI(0)         ┌───────────────────────────┐
 │  BSC Testnet (on-chain)  │ ─────────────────────────▶ │  IPFS: metadata JSON      │
 │                          │  ipfs://bafkreiec7y…tfum   │  name: 42 Genesis Blocks  │
 │  TokenizeArt42 contract  │                            │  artist: khbouych         │
 │  0xB815…a68f             │                            │  image: ipfs://bafybei…   │
 │                          │                            └─────────────┬─────────────┘
 │  ownerOf(0) → wallet     │                                          │ image
 └──────────────────────────┘                                          ▼
                                                           ┌───────────────────────────┐
                                                           │  IPFS: PNG artwork (42)   │
                                                           └───────────────────────────┘
```

- **The contract** (on BSC Testnet) stores ownership and, for each token, one metadata URI.
- **The metadata JSON** (on IPFS) describes the NFT: its name, artist, description, and a link to the image.
- **The image** (on IPFS) is the artwork itself.

The blockchain holds only the small, essential facts (owner, URI). The heavy data lives on IPFS. Both are public and tamper-evident.

## Why IPFS links can't be faked

An IPFS address (a **CID**, e.g. `bafybei…`) is computed from the file's content. Change one pixel and the CID changes. Since the contract stores the metadata CID and the metadata stores the image CID, the chain from token to artwork is fixed: nobody can swap the image behind the token, not even the contract owner.

## The lifecycle, step by step

Each step is one script, run from `code/` (see the [usage guide](usage.md) for details):

| # | Step | Command | Result |
|---|---|---|---|
| 1 | Draw the artwork | `npm run generate-art` | `code/art/tokenize-art-42.png` (2000×2000) + SVG source |
| 2 | Put the image on IPFS | `npm run upload-to-ipfs -- art/tokenize-art-42.png` | Image CID `bafybeicdnsg3…vu7e` |
| 3 | Write the metadata | (hand-written) | `code/art/tokenize-art-42.json`, pointing to the image CID |
| 4 | Put the metadata on IPFS | `npm run upload-to-ipfs -- art/tokenize-art-42.json` | Metadata CID `bafkreiec7y…tfum` |
| 5 | Deploy the contract | `npm run deploy` | Contract `0xB815…a68f`, recorded in `deployment/bscTestnet.json` |
| 6 | Mint the NFT | `npm run mint` | Token 0 → owner wallet, `tokenURI` = metadata CID, recorded in `deployment/bscTestnet-mint.json` |
| 7 | Check and display | `npm run show-nft` | Prints `ownerOf`, `tokenURI`, metadata, and checks the image |

The order matters: the image CID must exist before the metadata can point to it, and the metadata CID must exist before minting.

## The contract

[`code/contracts/TokenizeArt42.sol`](../code/contracts/TokenizeArt42.sol) extends two audited OpenZeppelin building blocks:

- **`ERC721URIStorage`**: the BEP-721/ERC-721 token standard (`ownerOf`, `balanceOf`, `transferFrom`, `approve`, …) plus one stored URI per token (`tokenURI`).
- **`Ownable2Step`**: a single owner with privileged rights, where an ownership transfer must be accepted by the new owner.

It adds only:

| Function | What it does |
|---|---|
| `constructor(name, symbol, initialOwner)` | Sets the collection name ("42 Genesis Blocks"), the symbol ("GB42") and the owner |
| `safeMint(recipient, metadataURI)` | Owner only. Creates the next token ID for `recipient` with its metadata URI; rejects an empty URI |
| `totalMinted()` | How many tokens exist (IDs 0 … totalMinted − 1) |

Who may call what is detailed in the [security review](security.md).

## Where things live

| Path | Role |
|---|---|
| `code/contracts/` | The Solidity contract |
| `code/test/` | Unit tests (run on a local simulated chain) |
| `code/scripts/` | Artwork generator, IPFS uploader, wallet tools |
| `code/art/` | The image (PNG + SVG) and the metadata JSON |
| `code/hardhat.config.ts` | Compiler settings and the BSC Testnet network (chain ID 97 only) |
| `deployment/` | Deploy, mint and display scripts, plus the deployment and mint records |
| `code/.env` | Private key, RPC URL, wallet address, Pinata key. Git-ignored; never committed |
