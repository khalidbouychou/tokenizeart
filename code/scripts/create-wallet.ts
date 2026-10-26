// Creates a new wallet just for testing and saves it in code/.env.
// Only the address is printed, the private key stays in the file.
//
// npm run create-wallet
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Wallet } from "ethers";

const envFilePath = path.join(import.meta.dirname, "..", ".env");
const BSC_TESTNET_PUBLIC_RPC_URL = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";

if (existsSync(envFilePath)) {
  console.error(`${envFilePath} already exists. Refusing to overwrite an existing key.`);
  process.exit(1);
}

const testWallet = Wallet.createRandom();

const envFileContents = [
  `BSC_TESTNET_PRIVATE_KEY=${testWallet.privateKey}`,
  `BSC_TESTNET_RPC_URL=${BSC_TESTNET_PUBLIC_RPC_URL}`,
  `DEPLOYER_ADDRESS=${testWallet.address}`,
].join("\n");

writeFileSync(envFilePath, `${envFileContents}\n`, { mode: 0o600 });

console.log(`Wallet address: ${testWallet.address}`);
console.log(`Key, address and RPC URL saved to ${envFilePath} (never share or commit it).`);
console.log("Paste the wallet address into a BSC Testnet faucet to get test tBNB.");
