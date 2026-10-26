// Hardhat configuration: Solidity compiler settings, the local test chain,
// and BSC Testnet (the only live network; BSC mainnet is deliberately absent
// so real funds can never be used).
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { existsSync } from "node:fs";
import path from "node:path";
import { configVariable, defineConfig } from "hardhat/config";

// Load secrets and account-specific values (key, RPC URL, address) from the
// git-ignored code/.env into process.env. See .env.example for the list.
const envFilePath = path.join(import.meta.dirname, ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

// Pinning the chain ID makes Hardhat refuse to send transactions if the RPC
// URL in .env ever points at a different network (e.g. BSC mainnet, ID 56).
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
    // Local simulated chain used by `npm test`.
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // Test network only: the PRD forbids real funds, so BSC mainnet is
    // deliberately not configured.
    bscTestnet: {
      type: "http",
      chainType: "l1",
      chainId: BSC_TESTNET_CHAIN_ID,
      // Both resolved at run time from code/.env (git-ignored) or the
      // environment. Never written to this file.
      url: configVariable("BSC_TESTNET_RPC_URL"),
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")],
    },
  },
});
