// Shows an NFT: who owns it (ownerOf), its metadata (tokenURI)
// and checks that the image loads. Works for IPFS and on-chain NFTs.
//
// It only reads, no transaction, no private key needed,
// so anyone can run it.
//
// from code/: npm run show-nft            → token 0
//             TOKEN_ID=2 npm run show-nft  → another token
// CONTRACT_ADDRESS=... to read another copy of the contract
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Contract, JsonRpcProvider } from "ethers";
import deploymentRecord from "./bscTestnet.json" with { type: "json" };

const envFilePath = path.join(import.meta.dirname, "..", "code", ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

// public testnet RPC, used if there is no .env
const DEFAULT_BSC_TESTNET_RPC_URL = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const IPFS_GATEWAY_URLS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://dweb.link/ipfs",
];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// only the functions we read
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

// gets the content of a uri:
// data: uri → decoded here, ipfs:// → downloaded from a gateway
async function loadUri(uri: string): Promise<{ bytes: Buffer; source: string }> {
  const dataUriMatch = /^data:([^,]*?)(;base64)?,(.*)$/s.exec(uri);
  if (dataUriMatch) {
    const [, mediaType, base64Marker, payload] = dataUriMatch;
    const bytes = base64Marker ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    return { bytes, source: `on-chain data: URI (${mediaType}, ${uri.length} bytes)` };
  }
  if (!uri.startsWith("ipfs://")) {
    throw new Error(`Unsupported URI scheme: ${uri.slice(0, 20)}…`);
  }
  return fetchFromIpfs(uri);
}

// downloads an ipfs:// link from the first gateway that works
async function fetchFromIpfs(ipfsUri: string): Promise<{ bytes: Buffer; source: string }> {
  const contentPath = ipfsUri.replace(/^ipfs:\/\//, "");
  for (const gatewayBaseUrl of IPFS_GATEWAY_URLS) {
    const gatewayUrl = `${gatewayBaseUrl}/${contentPath}`;
    try {
      const response = await fetch(gatewayUrl, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        return { bytes: Buffer.from(await response.arrayBuffer()), source: gatewayUrl };
      }
    } catch {
      // try the next one
    }
  }
  throw new Error(`No public IPFS gateway could serve ${ipfsUri}`);
}

const tokenId = BigInt(process.env.TOKEN_ID ?? "0");
const rpcUrl = process.env.BSC_TESTNET_RPC_URL || DEFAULT_BSC_TESTNET_RPC_URL;
const provider = new JsonRpcProvider(rpcUrl);
const contractAddress = process.env.CONTRACT_ADDRESS || deploymentRecord.contractAddress;
const tokenizeArt = new Contract(contractAddress, TOKENIZE_ART_READ_ABI, provider);

console.log("== On-chain (BSC Testnet) ==");
console.log(`Contract:   ${contractAddress}`);
console.log(`Collection: ${await tokenizeArt.name()} (${await tokenizeArt.symbol()})`);
console.log(`Token ID:   ${tokenId}`);

// ownerOf fails if the token doesn't exist
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

// data: uris are long, so we cut them when printing
function shortenUri(uri: string): string {
  return uri.length > 90 ? `${uri.slice(0, 60)}… (${uri.length} bytes)` : uri;
}

const metadataUri: string = await tokenizeArt.tokenURI(tokenId);
console.log(`tokenURI:   ${shortenUri(metadataUri)}`);

console.log("\n== Metadata ==");
const metadataDownload = await loadUri(metadataUri);
const metadata = JSON.parse(metadataDownload.bytes.toString("utf8")) as NftMetadata;
console.log(`Source:     ${metadataDownload.source}`);
console.log(`Name:       ${metadata.name}`);
console.log(`Artist:     ${metadata.artist ?? "(none)"}`);
console.log(`Image:      ${shortenUri(metadata.image)}`);
for (const attribute of metadata.attributes ?? []) {
  console.log(`  - ${attribute.trait_type}: ${attribute.value}`);
}

console.log("\n== Image ==");
const imageDownload = await loadUri(metadata.image);
const isPng = imageDownload.bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
const isSvg = imageDownload.bytes.toString("utf8", 0, 200).trimStart().startsWith("<svg");
const imageKind = isPng ? "valid PNG" : isSvg ? "valid SVG" : "UNKNOWN format";
console.log(`Source:     ${imageDownload.source}`);
console.log(`Loaded:     ${imageDownload.bytes.length} bytes, ${imageKind}`);
if (imageDownload.source.startsWith("http")) {
  console.log(`Open it:    ${imageDownload.source}`);
} else {
  // on-chain image: save it to a file so you can open it
  const savedImagePath = path.join(tmpdir(), `tokenize-art-42-token-${tokenId}.${isPng ? "png" : "svg"}`);
  writeFileSync(savedImagePath, imageDownload.bytes);
  console.log(`Open it:    ${savedImagePath} (decoded from the chain)`);
}
console.log(`Explorer:   https://testnet.bscscan.com/token/${contractAddress}?a=${tokenId}`);
