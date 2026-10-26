// Mints the "42 Genesis Blocks" NFT and saves the result in
// deployment/bscTestnet-mint.json.
//
// The NFT goes to our wallet and points to the metadata on IPFS.
//
// from code/: npm run mint
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import deploymentRecord from "./bscTestnet.json" with { type: "json" };

// ipfs link of code/art/tokenize-art-42.json
const METADATA_URI = "ipfs://bafkreiec7ypupjglneppqu2jfhajmzhmfcr7xehukubdtslamrfki4tfum";
const BSC_TESTNET_CHAIN_ID = 97n;
const BSC_TESTNET_EXPLORER_URL = "https://testnet.bscscan.com";

const { ethers } = await network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();
if (chainId !== BSC_TESTNET_CHAIN_ID) {
  throw new Error(`Refusing to mint on chain ID ${chainId}: only BSC Testnet (97) is allowed.`);
}

const mintRecordPath = path.join(import.meta.dirname, "bscTestnet-mint.json");
if (existsSync(mintRecordPath)) {
  throw new Error(`${mintRecordPath} already exists: the NFT is already minted.`);
}

const tokenizeArt = await ethers.getContractAt("TokenizeArt42", deploymentRecord.contractAddress);

// we only want one NFT here, so stop if the contract already has one
// (in case a previous run crashed before saving the json)
const alreadyMintedCount = await tokenizeArt.totalMinted();
if (alreadyMintedCount > 0n) {
  throw new Error(`The contract already has ${alreadyMintedCount} minted token(s); not minting again.`);
}

const [ownerSigner] = await ethers.getSigners();
const recipientAddress = await ownerSigner.getAddress();

console.log(`Minting on ${deploymentRecord.contractAddress} with metadata ${METADATA_URI}...`);
const mintTransaction = await tokenizeArt.safeMint(recipientAddress, METADATA_URI);
const mintReceipt = await mintTransaction.wait();

// get the token id from the Transfer event
const transferEvent = mintReceipt?.logs
  .map((log) => tokenizeArt.interface.parseLog(log))
  .find((parsedLog) => parsedLog?.name === "Transfer");
if (!transferEvent) {
  throw new Error("Mint transaction has no Transfer event.");
}
const mintedTokenId: bigint = transferEvent.args.tokenId;

// check on the chain that the owner and the link are correct
const onChainOwner = await tokenizeArt.ownerOf(mintedTokenId);
const onChainTokenUri = await tokenizeArt.tokenURI(mintedTokenId);
if (onChainOwner !== recipientAddress || onChainTokenUri !== METADATA_URI) {
  throw new Error("Minted token does not have the expected owner or metadata URI.");
}

const mintRecord = {
  network: deploymentRecord.network,
  chainId: deploymentRecord.chainId,
  contractAddress: deploymentRecord.contractAddress,
  tokenId: Number(mintedTokenId),
  metadataURI: METADATA_URI,
  mintTransactionHash: mintTransaction.hash,
  blockNumber: mintReceipt?.blockNumber,
  explorerUrl: `${BSC_TESTNET_EXPLORER_URL}/token/${deploymentRecord.contractAddress}?a=${mintedTokenId}`,
};
writeFileSync(mintRecordPath, `${JSON.stringify(mintRecord, null, 2)}\n`);

console.log(`Token ID:     ${mintedTokenId}`);
console.log(`Transaction:  ${mintTransaction.hash}`);
console.log(`ownerOf:      OK (the minting wallet)`);
console.log(`tokenURI:     ${onChainTokenUri}`);
console.log(`Explorer:     ${mintRecord.explorerUrl}`);
console.log(`Saved ${mintRecordPath}`);
