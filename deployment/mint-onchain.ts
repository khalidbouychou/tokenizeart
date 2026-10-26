// Bonus: mints an NFT where the metadata AND the image are stored on-chain.
//
// Our contract accepts any uri, so instead of an ipfs:// link we give it a
// data: uri that contains everything (see onchain-metadata.ts).
// tokenURI() then gives back everything directly from the contract.
//
// from code/:
//   npm run mint-onchain             → only shows the gas and the price
//   MINT=yes npm run mint-onchain    → really mints and saves
//                                      deployment/bscTestnet-mint-onchain.json
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { network } from "hardhat";
import deploymentRecord from "./bscTestnet.json" with { type: "json" };
import { buildOnChainTokenUri } from "./onchain-metadata.ts";

const BSC_TESTNET_CHAIN_ID = 97n;
const BSC_TESTNET_EXPLORER_URL = "https://testnet.bscscan.com";
// ask for 20% more than the estimate, gas price can change
const BALANCE_SAFETY_MARGIN_PERCENT = 120n;

const mintRecordPath = path.join(import.meta.dirname, "bscTestnet-mint-onchain.json");

const { ethers } = await network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();
if (chainId !== BSC_TESTNET_CHAIN_ID) {
  throw new Error(`Refusing to run on chain ID ${chainId}: only BSC Testnet (97) is allowed.`);
}
if (existsSync(mintRecordPath)) {
  throw new Error(`${mintRecordPath} already exists: the on-chain token is already minted.`);
}

const tokenizeArt = await ethers.getContractAt("TokenizeArt42", deploymentRecord.contractAddress);
const [ownerSigner] = await ethers.getSigners();
const ownerAddress = await ownerSigner.getAddress();
const onChainTokenUri = buildOnChainTokenUri();

// don't mint it twice (in case a previous run crashed before saving)
const mintedCount = await tokenizeArt.totalMinted();
for (let existingTokenId = 0n; existingTokenId < mintedCount; existingTokenId++) {
  if ((await tokenizeArt.tokenURI(existingTokenId)) === onChainTokenUri) {
    throw new Error(`Token ${existingTokenId} already has this on-chain metadata; not minting again.`);
  }
}

const estimatedGas = await tokenizeArt.safeMint.estimateGas(ownerAddress, onChainTokenUri);
const { gasPrice } = await ethers.provider.getFeeData();
if (gasPrice === null) {
  throw new Error("The RPC returned no gas price.");
}
const estimatedCost = estimatedGas * gasPrice;
const requiredBalance = (estimatedCost * BALANCE_SAFETY_MARGIN_PERCENT) / 100n;
const ownerBalance = await ethers.provider.getBalance(ownerAddress);

console.log(`Token URI size: ${onChainTokenUri.length} bytes (stored in contract storage)`);
console.log(`Estimated gas:  ${estimatedGas}`);
console.log(`Gas price:      ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
console.log(`Estimated cost: ${ethers.formatEther(estimatedCost)} tBNB (needs ${ethers.formatEther(requiredBalance)} with margin)`);
console.log(`Balance:        ${ethers.formatEther(ownerBalance)} tBNB`);

if (ownerBalance < requiredBalance) {
  const missingAmount = ethers.formatEther(requiredBalance - ownerBalance);
  console.error(`Not enough tBNB: ${missingAmount} more needed. Claim from a BSC Testnet faucet, then retry.`);
  process.exit(1);
}
if (process.env.MINT !== "yes") {
  console.log("Estimate only. Run with MINT=yes to mint.");
  process.exit(0);
}

console.log("Minting the on-chain token...");
const mintTransaction = await tokenizeArt.safeMint(ownerAddress, onChainTokenUri, { gasLimit: (estimatedGas * 110n) / 100n });
const mintReceipt = await mintTransaction.wait();

const transferEvent = mintReceipt?.logs
  .map((log) => tokenizeArt.interface.parseLog(log))
  .find((parsedLog) => parsedLog?.name === "Transfer");
if (!transferEvent) {
  throw new Error("Mint transaction has no Transfer event.");
}
const mintedTokenId: bigint = transferEvent.args.tokenId;

// check that the chain saved exactly what we sent
if ((await tokenizeArt.tokenURI(mintedTokenId)) !== onChainTokenUri) {
  throw new Error("tokenURI read back from the chain does not match what was minted.");
}

const mintRecord = {
  network: deploymentRecord.network,
  chainId: deploymentRecord.chainId,
  contractAddress: deploymentRecord.contractAddress,
  tokenId: Number(mintedTokenId),
  storage: "on-chain (data: URI in contract storage, no IPFS)",
  tokenUriBytes: onChainTokenUri.length,
  gasUsed: mintReceipt?.gasUsed.toString(),
  mintTransactionHash: mintTransaction.hash,
  blockNumber: mintReceipt?.blockNumber,
  explorerUrl: `${BSC_TESTNET_EXPLORER_URL}/token/${deploymentRecord.contractAddress}?a=${mintedTokenId}`,
};
writeFileSync(mintRecordPath, `${JSON.stringify(mintRecord, null, 2)}\n`);

console.log(`Token ID:     ${mintedTokenId}`);
console.log(`Gas used:     ${mintReceipt?.gasUsed}`);
console.log(`Transaction:  ${mintTransaction.hash}`);
console.log(`tokenURI:     verified on-chain (${onChainTokenUri.length} bytes)`);
console.log(`Saved ${mintRecordPath}`);
