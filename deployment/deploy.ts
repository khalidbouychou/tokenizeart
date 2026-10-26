// Deploys the TokenizeArt42 contract and records the result in
// deployment/<network>.json (committed: the PRD requires the contract
// address and network to be in the repository).
//
// Usage (from code/):
//   npm run deploy           → BSC Testnet
//   npm run deploy:local     → local simulated chain (dry run, nothing saved)
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { network } from "hardhat";

const COLLECTION_NAME = "42 Genesis Blocks";
const COLLECTION_SYMBOL = "GB42";
const BSC_TESTNET_CHAIN_ID = 97n;
const BSC_TESTNET_EXPLORER_URL = "https://testnet.bscscan.com";

const { ethers, networkName } = await network.getOrCreate();
const { chainId } = await ethers.provider.getNetwork();
const isBscTestnet = chainId === BSC_TESTNET_CHAIN_ID;
const deploymentRecordPath = path.join(import.meta.dirname, `${networkName}.json`);

// Safety: never touch a live chain other than BSC Testnet (no real funds).
const isLocalSimulatedChain = chainId === 31337n;
if (!isBscTestnet && !isLocalSimulatedChain) {
  throw new Error(`Refusing to deploy to chain ID ${chainId}: only BSC Testnet (97) is allowed.`);
}

// Avoid deploying a second copy by accident; delete the record to redeploy.
if (isBscTestnet && existsSync(deploymentRecordPath)) {
  throw new Error(`${deploymentRecordPath} already exists: the contract is already deployed.`);
}

const [deployerSigner] = await ethers.getSigners();
const deployerAddress = await deployerSigner.getAddress();

console.log(`Deploying TokenizeArt42 ("${COLLECTION_NAME}", ${COLLECTION_SYMBOL}) to ${networkName} (chain ID ${chainId})...`);

// The deployer becomes the contract owner, the only account allowed to mint.
const tokenizeArt = await ethers.deployContract("TokenizeArt42", [
  COLLECTION_NAME,
  COLLECTION_SYMBOL,
  deployerAddress,
]);
const deploymentTransaction = tokenizeArt.deploymentTransaction();
await tokenizeArt.waitForDeployment();
const deploymentReceipt = await deploymentTransaction?.wait();

const contractAddress = await tokenizeArt.getAddress();
console.log(`Contract address: ${contractAddress}`);
console.log(`Transaction:      ${deploymentTransaction?.hash}`);

// Sanity check the live contract before recording it.
const onChainOwner = await tokenizeArt.owner();
if (onChainOwner !== deployerAddress) {
  throw new Error(`Unexpected owner ${onChainOwner}; expected the deployer.`);
}
console.log(`Owner check:      OK (owner is the deployer)`);

if (isBscTestnet) {
  const deploymentRecord = {
    network: "BSC Testnet",
    chainId: Number(chainId),
    contractName: "TokenizeArt42",
    collectionName: COLLECTION_NAME,
    collectionSymbol: COLLECTION_SYMBOL,
    contractAddress,
    deploymentTransactionHash: deploymentTransaction?.hash,
    blockNumber: deploymentReceipt?.blockNumber,
    explorerUrl: `${BSC_TESTNET_EXPLORER_URL}/address/${contractAddress}`,
  };
  writeFileSync(deploymentRecordPath, `${JSON.stringify(deploymentRecord, null, 2)}\n`);
  console.log(`Explorer:         ${deploymentRecord.explorerUrl}`);
  console.log(`Saved ${deploymentRecordPath}`);
}
