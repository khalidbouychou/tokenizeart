# TokenizeArt: 42 Genesis Blocks

A BEP-721 NFT created, deployed and minted on **BNB Smart Chain Testnet** for the 42 TokenizeArt project.
The artwork is the number **42** built from glowing gold blocks, stored on **IPFS**.

<p align="center"><img src="code/art/tokenize-art-42.png" alt="42 Genesis Blocks: the number 42 made of gold blocks on a dark grid" width="360"></p>

## Deployed NFT

| | |
|---|---|
| **Network** | BNB Smart Chain **Testnet** (chain ID 97). No real funds are used. |
| **Contract address** | [`0xB81510a9b38443525808b3A762a68d5e9070a68f`](https://testnet.bscscan.com/address/0xB81510a9b38443525808b3A762a68d5e9070a68f) |
| **Collection** | 42 Genesis Blocks (`GB42`) |
| **Token** | ID `0`, [view on BscScan](https://testnet.bscscan.com/token/0xB81510a9b38443525808b3A762a68d5e9070a68f?a=0) |
| **Artist** | `khbouych` |
| **Metadata** | `ipfs://bafkreiec7ypupjglneppqu2jfhajmzhmfcr7xehukubdtslamrfki4tfum` ([gateway](https://gateway.pinata.cloud/ipfs/bafkreiec7ypupjglneppqu2jfhajmzhmfcr7xehukubdtslamrfki4tfum)) |
| **Image** | `ipfs://bafybeicdnsg3gsn5hillr3x7dbjarbnjrkxk7zrfygkdeehllwu2nvvu7e` ([gateway](https://gateway.pinata.cloud/ipfs/bafybeicdnsg3gsn5hillr3x7dbjarbnjrkxk7zrfygkdeehllwu2nvvu7e)) |
| **Source verification** | [Sourcify](https://sourcify.dev/server/repo-ui/97/0xB81510a9b38443525808b3A762a68d5e9070a68f) |

Machine-readable records: [`deployment/bscTestnet.json`](deployment/bscTestnet.json) (deployment) and [`deployment/bscTestnet-mint.json`](deployment/bscTestnet-mint.json) (mint).

## Check it yourself

No wallet or private key needed:

```bash
npm install            # at the repository root
cd code
npm run show-nft       # prints ownerOf, tokenURI, metadata, and checks the image
npm run demo           # runs the 15 tests, then show-nft
```

## On-chain token (bonus)

Token [#2](https://testnet.bscscan.com/token/0xB81510a9b38443525808b3A762a68d5e9070a68f?a=2), "42 Genesis Blocks (On-chain)", stores **both its metadata and its image in contract storage**, with no IPFS. The artwork was redrawn as a 1.6 KB SVG that looks identical: repeating patterns replace 625 separate squares. `tokenURI(2)` returns a `data:application/json;base64,…` URI whose `image` is a `data:image/svg+xml` URI. The mint cost ~2.1M gas (~0.00021 tBNB), about 15× less than storing the original 45 KB SVG. The existing contract was reused as is, since `safeMint` accepts any metadata URI. Record: [`deployment/bscTestnet-mint-onchain.json`](deployment/bscTestnet-mint-onchain.json).

```bash
cd code
TOKEN_ID=2 npm run show-nft   # decodes metadata and image straight from the chain
```

## Minting website (bonus)

```bash
cd code
npm run website        # then open http://127.0.0.1:8042
```

A graphical interface for the contract. Anyone can see the collection and every minted token (image, name, artist, owner), read live from BSC Testnet and IPFS. The owner can connect MetaMask and mint through a form, with a live preview of the metadata. The page switches the wallet to BSC Testnet automatically, simulates each mint before signing so a failing one costs no gas, and keeps the form disabled for any account other than the owner. No private key ever reaches the page: the visitor's own wallet signs. Token [#1](https://testnet.bscscan.com/token/0xB81510a9b38443525808b3A762a68d5e9070a68f?a=1) was minted through this website with MetaMask. Details in the [usage guide](documentation/usage.md#7-minting-website-bonus).

## Repository layout

| Folder | Contents |
|---|---|
| [`code/`](code/) | The code that creates the NFT: the Solidity contract, its tests, the artwork generator and the IPFS upload script (Hardhat 3 project) |
| [`deployment/`](deployment/) | Everything needed to deploy and mint: deploy, mint and display scripts, plus the deployment and mint records |
| [`documentation/`](documentation/) | How it works, how to use it, the security review, the whitepaper and the original subject (PRD) |
| [`website/`](website/) | Bonus: the minting website (static page plus a small local server) |

## Choices and reasons

| Choice | Reason |
|---|---|
| **BNB Smart Chain Testnet** | Recommended by the subject. EVM-compatible, so the standard Solidity tooling works. It's a testnet, so no real money is ever involved (a PRD rule). Very low gas (~0.1 gwei): the whole project cost about 0.00015 test tBNB. |
| **BEP-721 (ERC-721 compatible)** | The NFT standard required on BSC. Wallets, explorers and marketplaces understand it out of the box. |
| **Solidity 0.8.28** | The native language of the chain. Version 0.8 has built-in overflow checks; the version is pinned exactly so the deployed bytecode is reproducible and verifiable. |
| **OpenZeppelin Contracts 5.6.1** | The industry-standard, audited ERC-721 implementation. Writing token logic from scratch would add risk for no benefit. |
| **`ERC721URIStorage`** | Each token stores its own `ipfs://` metadata URI, which points straight to the IPFS file with no base-URI tricks. |
| **`Ownable2Step` + owner-only `safeMint`** | Only the owner can mint. Ownership transfer needs the new owner to accept, so a typo can't lose control of the contract. The metadata can't be changed after minting. See [security review](documentation/security.md). |
| **Hardhat 3 (TypeScript)** | One tool for compiling, testing (15 tests), deploying, minting and verifying, all scriptable and reproducible. TypeScript catches mistakes before they reach the chain. |
| **IPFS via Pinata** | The subject requires distributed storage. IPFS addresses content by its hash (CID), so the artwork can't be swapped silently. Pinata keeps the files pinned and offers a free public gateway. |
| **Font-free block-pixel artwork** | "42" is drawn block by block from bitmaps, so it renders identically everywhere and stays legible at thumbnail size (the subject rejects an ambiguous 42). The 2 has a rounded top so it isn't read as a Z. |
| **Standard metadata JSON** | `name`, `description`, `image`, `attributes` is the format wallets and marketplaces read. The name includes "42" and a title, and the artist is the 42 login, as required. |
| **Secrets in a git-ignored `.env`** | The private key and API keys never enter the code or the git history. This was checked across the full history; see the [security review](documentation/security.md). |

## Documentation

- [How it works](documentation/how-it-works.md): architecture and the NFT lifecycle
- [Usage guide](documentation/usage.md): setup, every command, and a step-by-step demo
- [Security review](documentation/security.md): roles, privileges, and checks performed
- [Whitepaper](documentation/whitepaper.md): the NFT's concept, features and functionality
- [FAQ](documentation/faq.md): common questions about the standard, IPFS, security and verification
- [Subject / PRD](documentation/PRD.md): the original project requirements
