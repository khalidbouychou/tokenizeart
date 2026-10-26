// Shows the wallet address and how much tBNB it has.
// Run it before deploying to be sure the wallet has some test money.
//
// npm run check-deployer
import { network } from "hardhat";

const { ethers, networkName } = await network.getOrCreate();

const [deployerSigner] = await ethers.getSigners();
const deployerAddress = await deployerSigner.getAddress();
const balanceInWei = await ethers.provider.getBalance(deployerAddress);
const { chainId } = await ethers.provider.getNetwork();

console.log(`Network:  ${networkName} (chain ID ${chainId})`);
console.log(`Deployer: ${deployerAddress}`);
console.log(`Balance:  ${ethers.formatEther(balanceInWei)} tBNB`);

// make sure the address in .env really matches the private key,
// otherwise the faucet money goes to the wrong wallet
const expectedDeployerAddress = process.env.DEPLOYER_ADDRESS;
if (expectedDeployerAddress && expectedDeployerAddress.toLowerCase() !== deployerAddress.toLowerCase()) {
  console.log(`WARNING: DEPLOYER_ADDRESS in .env (${expectedDeployerAddress}) does not match the private key.`);
}

if (balanceInWei === 0n) {
  console.log("Balance is zero. Request test tBNB from a BSC Testnet faucet (e.g. faucet.zalalena.com/bsc).");
}
