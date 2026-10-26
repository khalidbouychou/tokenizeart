// Small local server for the minting website (bonus).
//
// It serves the page, ethers from node_modules, and /config.json
// made from deployment/bscTestnet.json (so the site uses our real contract).
//
// No private key is sent to the browser, MetaMask signs the transactions.
//
// from code/: npm run website   → http://127.0.0.1:8042
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import deploymentRecord from "../deployment/bscTestnet.json" with { type: "json" };
import mintRecord from "../deployment/bscTestnet-mint.json" with { type: "json" };

const websiteDirectory = import.meta.dirname;
const repositoryRoot = path.join(websiteDirectory, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.SITE_PORT ?? 8042);

// public settings only. SITE_* are used to test with a local hardhat node
const siteConfig = {
  chainId: Number(process.env.SITE_CHAIN_ID ?? deploymentRecord.chainId),
  chainName: process.env.SITE_CHAIN_NAME ?? "BNB Smart Chain Testnet",
  rpcUrl: process.env.SITE_RPC_URL ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
  explorerUrl: "https://testnet.bscscan.com",
  ipfsGatewayUrl: "https://gateway.pinata.cloud/ipfs",
  contractAddress: process.env.SITE_CONTRACT_ADDRESS ?? deploymentRecord.contractAddress,
  defaultMetadataUri: mintRecord.metadataURI,
};

// only these files can be opened, nothing else
const routes: Record<string, { filePath: string; contentType: string }> = {
  "/": { filePath: path.join(websiteDirectory, "index.html"), contentType: "text/html; charset=utf-8" },
  "/app.js": { filePath: path.join(websiteDirectory, "app.js"), contentType: "text/javascript; charset=utf-8" },
  "/style.css": { filePath: path.join(websiteDirectory, "style.css"), contentType: "text/css; charset=utf-8" },
  "/vendor/ethers.umd.min.js": {
    filePath: path.join(repositoryRoot, "node_modules", "ethers", "dist", "ethers.umd.min.js"),
    contentType: "text/javascript; charset=utf-8",
  },
  "/favicon.png": {
    filePath: path.join(repositoryRoot, "code", "art", "tokenize-art-42.png"),
    contentType: "image/png",
  },
};

const server = createServer((request, response) => {
  const requestPath = new URL(request.url ?? "/", `http://${HOST}`).pathname;

  if (requestPath === "/config.json") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(siteConfig));
    return;
  }

  const route = routes[requestPath];
  if (!route) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": route.contentType, "Cache-Control": "no-store" });
  response.end(readFileSync(route.filePath));
});

server.listen(PORT, HOST, () => {
  console.log(`Minting website: http://${HOST}:${PORT}`);
  console.log(`Contract ${siteConfig.contractAddress} on chain ${siteConfig.chainId}`);
});
