// Shows a minted NFT straight from the blockchain and IPFS: who owns it
// (ownerOf), its metadata (tokenURI), and whether its image loads.
//
// Read-only: sends no transaction, costs nothing, and needs no private key,
// so anyone (e.g. an evaluator) can run it.
//
// Usage (from code/): npm run show-nft            → token 0
//                     TOKEN_ID=3 npm run show-nft  → another token
import { existsSync } from "node:fs";
import path from "node:path";
import { Contract, JsonRpcProvider } from "ethers";
import deploymentRecord from "./bscTestnet.json" with { type: "json" };

const envFilePath = path.join(import.meta.dirname, "..", "code", ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

// Public BSC Testnet endpoint, used when code/.env does not set one.
const DEFAULT_BSC_TESTNET_RPC_URL = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const IPFS_GATEWAY_URLS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://dweb.link/ipfs",
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Only the read functions this script calls.
const TOKENIZE_ART_READ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

type NftMetadata = {
  name: string;
  description: string;
  image: string;
  artist?: string;
  attributes?: { trait_type: string; value: string }[];
};

/** Fetches an ipfs:// URI through the first public gateway that answers. */
async function fetchFromIpfs(ipfsUri: string): Promise<{ bytes: Buffer; gatewayUrl: string }> {
  const contentPath = ipfsUri.replace(/^ipfs:\/\//, "");
  for (const gatewayBaseUrl of IPFS_GATEWAY_URLS) {
    const gatewayUrl = `${gatewayBaseUrl}/${contentPath}`;
    try {
      const response = await fetch(gatewayUrl, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        return { bytes: Buffer.from(await response.arrayBuffer()), gatewayUrl };
      }
    } catch {
      // Try the next gateway.
    }
  }
  throw new Error(`No public IPFS gateway could serve ${ipfsUri}`);
}

const tokenId = BigInt(process.env.TOKEN_ID ?? "0");
const rpcUrl = process.env.BSC_TESTNET_RPC_URL || DEFAULT_BSC_TESTNET_RPC_URL;
const provider = new JsonRpcProvider(rpcUrl);
const tokenizeArt = new Contract(deploymentRecord.contractAddress, TOKENIZE_ART_READ_ABI, provider);

console.log("== On-chain (BSC Testnet) ==");
console.log(`Contract:   ${deploymentRecord.contractAddress}`);
console.log(`Collection: ${await tokenizeArt.name()} (${await tokenizeArt.symbol()})`);
console.log(`Token ID:   ${tokenId}`);

// ownerOf reverts (ERC721NonexistentToken) for a token that was never minted.
let ownerAddress: string;
try {
  ownerAddress = await tokenizeArt.ownerOf(tokenId);
} catch {
  console.error(`Token ${tokenId} does not exist on this contract (never minted).`);
  process.exit(1);
}
console.log(`ownerOf:    ${ownerAddress}`);
const yourWalletAddress = process.env.DEPLOYER_ADDRESS;
if (yourWalletAddress) {
  const ownedByYou = ownerAddress.toLowerCase() === yourWalletAddress.toLowerCase();
  console.log(`            ${ownedByYou ? "= your wallet (DEPLOYER_ADDRESS)" : "≠ your wallet (DEPLOYER_ADDRESS)"}`);
}

const metadataUri: string = await tokenizeArt.tokenURI(tokenId);
console.log(`tokenURI:   ${metadataUri}`);

console.log("\n== Metadata (IPFS) ==");
const metadataDownload = await fetchFromIpfs(metadataUri);
const metadata = JSON.parse(metadataDownload.bytes.toString("utf8")) as NftMetadata;
console.log(`Name:       ${metadata.name}`);
console.log(`Artist:     ${metadata.artist ?? "(none)"}`);
console.log(`Image:      ${metadata.image}`);
for (const attribute of metadata.attributes ?? []) {
  console.log(`  - ${attribute.trait_type}: ${attribute.value}`);
}

console.log("\n== Image (IPFS) ==");
const imageDownload = await fetchFromIpfs(metadata.image);
const isPng = imageDownload.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
console.log(`Loaded:     ${imageDownload.bytes.length} bytes, ${isPng ? "valid PNG" : "NOT a PNG"}`);
console.log(`Open it:    ${imageDownload.gatewayUrl}`);
console.log(`Explorer:   https://testnet.bscscan.com/token/${deploymentRecord.contractAddress}?a=${tokenId}`);
