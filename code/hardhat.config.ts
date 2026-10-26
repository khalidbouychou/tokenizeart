// Hardhat config: compiler, local test chain and BSC Testnet.
// No mainnet here on purpose, we never use real money.
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { existsSync } from "node:fs";
import path from "node:path";
import { configVariable, defineConfig } from "hardhat/config";

// load the private key, RPC url etc. from code/.env (not in git)
const envFilePath = path.join(import.meta.dirname, ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

// if the RPC url points to another chain (like mainnet = 56), hardhat stops
const BSC_TESTNET_CHAIN_ID = 97;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // local fake chain for the tests
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // the only real network we use (testnet, free tBNB)
    bscTestnet: {
      type: "http",
      chainType: "l1",
      chainId: BSC_TESTNET_CHAIN_ID,
      // read from .env, never written here
      url: configVariable("BSC_TESTNET_RPC_URL"),
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")],
    },
  },
});
