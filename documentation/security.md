# Security review: TokenizeArt42

Contract `TokenizeArt42` ("42 Genesis Blocks", GB42), deployed on **BSC Testnet** (chain ID 97) at
[`0xB81510a9b38443525808b3A762a68d5e9070a68f`](https://testnet.bscscan.com/address/0xB81510a9b38443525808b3A762a68d5e9070a68f).
Source: [`code/contracts/TokenizeArt42.sol`](../code/contracts/TokenizeArt42.sol), verified on
[Sourcify](https://sourcify.dev/server/repo-ui/97/0xB81510a9b38443525808b3A762a68d5e9070a68f).

## 1. Roles and privileges

The contract has three kinds of actors. Nobody else has any special power.

| Role | Who | Can do |
|---|---|---|
| **Owner** | The deployer wallet (`owner()`) | Mint new tokens; start an ownership transfer; renounce ownership |
| **Pending owner** | Set by the owner (`pendingOwner()`) | Accept ownership (completes the transfer) |
| **Token holder** | Whoever `ownerOf(tokenId)` returns | Transfer or approve their own token (standard ERC-721) |
| **Anyone** | Any address | Read functions only (`ownerOf`, `tokenURI`, `name`, …) |

Live state at the time of this review: the owner is the deployer wallet, there is no pending owner (`0x000…000`), and 1 token has been minted (token 0).

### Every state-changing function

| Function | Restricted to | Notes |
|---|---|---|
| `safeMint(recipient, metadataURI)` | Owner (`onlyOwner`) | Rejects an empty URI (`EmptyMetadataURI`) and the zero address. Uses `_safeMint`, so contracts that cannot hold NFTs are rejected and tokens can't get stuck. |
| `transferOwnership(newOwner)` | Owner | Only *proposes* a new owner (Ownable2Step). |
| `acceptOwnership()` | Pending owner | Completes the transfer. A typo in the address therefore can't hand the contract to an unreachable account. |
| `renounceOwnership()` | Owner | Removes the owner forever, which **permanently disables minting**. Kept on purpose as a way to freeze the supply; never call it by accident. |
| `transferFrom` / `safeTransferFrom` | Token holder or approved operator | Standard ERC-721 rules from OpenZeppelin. |
| `approve` / `setApprovalForAll` | Token holder | Standard ERC-721. |

### What the owner can NOT do

- **Move or burn someone else's token.** The owner has no special transfer rights; this is tested (`ERC721InsufficientApproval`).
- **Change a token's metadata after minting.** There is no setter for `tokenURI`, so the artwork a token points to is fixed.
- **Take funds.** The contract holds no BNB and has no payable or withdraw function.

## 2. Metadata and image integrity

- `tokenURI` stores an `ipfs://<CID>` URI. A CID is a hash of the content, so the metadata and image cannot be swapped without the CID (and therefore the on-chain URI) changing. Tampering is detectable by anyone.
- Availability depends on the files staying pinned on IPFS (Pinata). If they were ever unpinned, re-uploading the same files from `code/art/` restores them **at the same CID**, with no on-chain change needed.

## 3. No real funds

- The only live network configured in `code/hardhat.config.ts` is `bscTestnet`, pinned to chain ID 97. If the RPC URL ever points at another chain, Hardhat stops before doing anything. Tested by pointing it at BSC mainnet: `Error HHE708: Hardhat was set to use chain id "97", but connected to a chain with id "56"`. BSC mainnet is deliberately absent.
- `deployment/deploy.ts` and `deployment/mint.ts` also refuse to run on any chain other than 97 (and the local 31337 test chain for deploy).
- The wallet was funded only from a testnet faucet (tBNB has no value).

## 4. Secrets and key management

- The deployer private key, the RPC URL, the wallet address and the Pinata API credentials live only in `code/.env`. That file is git-ignored and readable only by its owner (permissions `600`). `code/.env.example` lists the variable names with empty values.
- **History check:** every value in `code/.env` was searched for across the full git history (`git log --all -p`). The private key, wallet address and all Pinata credentials appear **0 times**. Only the public BSC Testnet RPC URL appears, which is not a secret. No `.env` file was ever committed.
- The deployer is a fresh wallet created only for this project (`npm run create-wallet`), never used with real funds.
- **Minting website (bonus):** the local server only serves an allow-list of files and never reads `code/.env`. Requests for anything else, including `/.env`, get 404. Transactions are signed by the visitor's own wallet. The page inserts on-chain and IPFS data as text only (no HTML injection), and the contract's `onlyOwner` check still applies whatever the page does.

## 5. Automated checks

| Check | Result |
|---|---|
| Unit tests (`npm test` in `code/`) | 15 passing: minting, `ownerOf`, `tokenURI`, non-owner rejection, empty URI, zero address, unminted tokens, two-step ownership, owner can't move holders' tokens |
| Slither 0.11.6 static analysis (102 detectors, OpenZeppelin excluded) | **0 findings** |
| `npm audit --omit=dev` (on-chain dependency: OpenZeppelin Contracts 5.6.1) | 0 vulnerabilities |
| Library | OpenZeppelin Contracts 5.6.1, the industry-standard, audited ERC-721 implementation |

Re-run Slither (requires `pip install slither-analyzer solc-select` and `solc-select install 0.8.28`), from `code/`:

```
SOLC_VERSION=0.8.28 slither contracts/TokenizeArt42.sol \
  --solc-remaps "@openzeppelin/=../node_modules/@openzeppelin/" --filter-paths node_modules
```

## 6. Known limitations (accepted for a testnet project)

- **Single-key owner.** The owner is one wallet (an EOA), not a multisig. Whoever holds its key can mint. For a production collection, the owner should be a multisig such as a Safe.
- **Key stored in a plaintext file.** `code/.env` is protected by file permissions only. That is acceptable for a test-only wallet, but not for one holding value.
- **Token URI set after the mint callback.** `safeMint` calls `_safeMint` (which may call `onERC721Received` on a contract recipient) before `_setTokenURI`. During that callback the token's URI is still empty. This has no security impact: only the owner can mint, and the token ID counter is updated before the external call, so re-entrancy can't reuse an ID.
