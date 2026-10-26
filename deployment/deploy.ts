// Deploys the contract and saves the address in deployment/<network>.json
// (the subject wants the address and network in the repo).
//
// from code/:
//   npm run deploy           → BSC Testnet
//   npm run deploy:local     → local test only, nothing saved
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

// only testnet (or local), never a real chain
const isLocalSimulatedChain = chainId === 31337n;
if (!isBscTestnet && !isLocalSimulatedChain) {
  throw new Error(`Refusing to deploy to chain ID ${chainId}: only BSC Testnet (97) is allowed.`);
}

// already deployed? stop here (delete the json file to deploy again)
if (isBscTestnet && existsSync(deploymentRecordPath)) {
  throw new Error(`${deploymentRecordPath} already exists: the contract is already deployed.`);
}

const [deployerSigner] = await ethers.getSigners();
const deployerAddress = await deployerSigner.getAddress();

console.log(`Deploying TokenizeArt42 ("${COLLECTION_NAME}", ${COLLECTION_SYMBOL}) to ${networkName} (chain ID ${chainId})...`);

// our wallet becomes the owner = the only one who can mint
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

// quick check that the owner is really us
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
