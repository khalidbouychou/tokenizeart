// Prints the deployer address and its BSC Testnet balance, so you can confirm
// the wallet is funded with test tBNB before deploying.
//
// Usage: npm run check-deployer
import { network } from "hardhat";

const { ethers, networkName } = await network.getOrCreate();

const [deployerSigner] = await ethers.getSigners();
const deployerAddress = await deployerSigner.getAddress();
const balanceInWei = await ethers.provider.getBalance(deployerAddress);
const { chainId } = await ethers.provider.getNetwork();

console.log(`Network:  ${networkName} (chain ID ${chainId})`);
console.log(`Deployer: ${deployerAddress}`);
console.log(`Balance:  ${ethers.formatEther(balanceInWei)} tBNB`);

// DEPLOYER_ADDRESS in .env is what you paste into faucets; warn if it does
// not belong to the private key, since funds would go to the wrong wallet.
const expectedDeployerAddress = process.env.DEPLOYER_ADDRESS;
if (expectedDeployerAddress && expectedDeployerAddress.toLowerCase() !== deployerAddress.toLowerCase()) {
  console.log(`WARNING: DEPLOYER_ADDRESS in .env (${expectedDeployerAddress}) does not match the private key.`);
}

if (balanceInWei === 0n) {
  console.log("Balance is zero. Request test tBNB from a BSC Testnet faucet (e.g. faucet.zalalena.com/bsc).");
}
