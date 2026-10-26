# FAQ

Common questions about how this NFT works, answered from this project's actual code.

## Basics

**What is an NFT here, concretely?**
An entry in the `TokenizeArt42` contract saying "token 0 belongs to address X", plus a stored link (`tokenURI`) to a metadata file on IPFS that describes the artwork. Ownership lives on the blockchain; the artwork lives on IPFS.

**What is the difference between ERC-721 and BEP-721?**
They are the same interface. ERC-721 is the Ethereum standard; BEP-721 is its name on BNB Smart Chain, which is EVM-compatible. The contract reports support for both the ERC-721 (`0x80ac58cd`) and ERC-721 Metadata (`0x5b5e139f`) interfaces through `supportsInterface`.

**Why BSC Testnet and not mainnet?**
The subject forbids real money. Testnet tBNB is free from faucets and worthless. BSC is the chain the subject recommends. The tooling also enforces it: mainnet isn't configured, and Hardhat refuses to connect if the RPC points at another chain (error `HHE708`).

**How much did it cost?**
About 0.00015 tBNB in total (deploy ~1.3M gas, mint ~120k gas, at ~0.1 gwei), all testnet funds.

## Storage

**What is IPFS, and what is a CID?**
IPFS is a distributed file system where a file's address (its CID) is computed from its content. The same bytes always give the same CID, and different bytes always give a different one.

**Why not store the image on the blockchain?**
Both are done. Tokens #0 and #1 use IPFS: a 2000×2000 PNG (~720 KB) would cost a large amount of gas, while a short `ipfs://` URI gives the same tamper-evidence, because the CID is a hash of the content. Token #2 (bonus) is **fully on-chain**: the artwork was redrawn as a 1.6 KB SVG that looks identical, and the metadata plus the image are stored in contract storage as a `data:` URI. That cost ~2.1M gas (~0.00021 tBNB), versus ~31M gas for the original 45 KB SVG.

**How does the on-chain token work without a new contract?**
`safeMint` accepts any non-empty metadata URI. For token #2, the URI is `data:application/json;base64,…`. Decoded, it's the metadata JSON, whose `image` is `data:image/svg+xml;utf8,<svg …>`. `tokenURI(2)` returns all of it straight from contract storage, so the token depends on nothing outside the blockchain.

**Can someone change the image behind the NFT?**
No. The contract stores the metadata CID, and the metadata stores the image CID. Changing either file would change its CID, and there is no function to update `tokenURI` after minting, not even for the owner.

**What if Pinata disappears?**
The files could become unreachable, but not altered. Re-uploading `code/art/tokenize-art-42.png` and `.json` to any IPFS pinning service brings them back at the **same** CIDs, so nothing on-chain changes.

## Contract and security

**Who can mint?**
Only the contract owner: `safeMint` has the `onlyOwner` modifier. The test "rejects minting by an account that is not the owner" proves another account gets `OwnableUnauthorizedAccount`.

**What is `Ownable2Step` and why use it?**
Ownership transfer happens in two calls: the owner proposes (`transferOwnership`), and the new owner must confirm (`acceptOwnership`). With plain `Ownable`, a typo in the address would hand the contract to an account nobody controls.

**Can the owner take my NFT?**
No. The owner has no special transfer rights; a transfer needs the holder or an approved operator. The test "does not let the contract owner move a holder's token" proves it.

**Why `_safeMint` instead of `_mint`?**
`_safeMint` checks that a contract recipient can handle ERC-721 tokens (`onERC721Received`). Otherwise the token could be locked forever in a contract that can't move it.

**What happens if the owner's private key leaks?**
The attacker could mint new tokens. They still couldn't move existing holders' tokens or change any metadata. The key is in a git-ignored `.env` and was never committed; this was checked across the full history. A production project would use a multisig owner (see [security.md](security.md)).

**What does `renounceOwnership()` do?**
It removes the owner forever, after which nobody can ever mint again. It's inherited from OpenZeppelin and kept as a deliberate way to freeze the supply, but it should never be called by accident.

**Why OpenZeppelin instead of writing ERC-721 yourself?**
It's the audited, industry-standard implementation used by most NFT contracts. Re-implementing token logic would only add risk. The project's own code is the small part on top: owner-only minting, the URI rule, and the counter.

## Verification

**How do I prove who owns the NFT?**
Call `ownerOf(0)`: `npm run show-nft` does it, with no wallet or key needed. BscScan's token page also shows the current holder.

**How do I know the deployed bytecode matches this source code?**
The contract is verified on [Sourcify](https://sourcify.dev/server/repo-ui/97/0xB81510a9b38443525808b3A762a68d5e9070a68f): it recompiled the source in this repository and matched it against the bytecode on-chain.

**How was the contract tested?**
15 unit tests (`npm test`) on a local simulated chain cover minting, `ownerOf`, `tokenURI`, privilege checks and edge cases. Slither static analysis found 0 issues.
