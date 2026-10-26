// Minting website for the TokenizeArt42 contract (bonus part).
//
// Reading (collection info, gallery) uses a public RPC and works without a
// wallet. Minting is signed by the visitor's own wallet (MetaMask); this page
// never handles a private key. The contract only lets its owner mint, so the
// form is enabled only when the connected account is the owner.
"use strict";

const { ethers } = window;

// Only the contract functions, events and errors this page uses.
const TOKENIZE_ART_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function totalMinted() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function safeMint(address recipient, string metadataURI) returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "error EmptyMetadataURI()",
  "error OwnableUnauthorizedAccount(address account)",
  "error ERC721InvalidReceiver(address receiver)",
];

// Plain-language explanations for the contract's custom errors.
const CONTRACT_ERROR_MESSAGES = {
  EmptyMetadataURI: "The metadata URI is empty.",
  OwnableUnauthorizedAccount: "Only the contract owner can mint.",
  ERC721InvalidReceiver: "That recipient cannot receive NFTs (zero address or incompatible contract).",
};

const MAX_GALLERY_TOKENS = 60;

let siteConfig;
let readContract;
let contractOwnerAddress;
let connectedAddress = null;
let walletSigner = null;

const elements = {
  collectionName: document.getElementById("collection-name"),
  collectionSymbol: document.getElementById("collection-symbol"),
  networkName: document.getElementById("network-name"),
  connectButton: document.getElementById("connect-button"),
  contractLink: document.getElementById("contract-link"),
  contractOwner: document.getElementById("contract-owner"),
  totalMinted: document.getElementById("total-minted"),
  walletStatus: document.getElementById("wallet-status"),
  mintPermission: document.getElementById("mint-permission"),
  mintForm: document.getElementById("mint-form"),
  recipientInput: document.getElementById("recipient-input"),
  metadataInput: document.getElementById("metadata-input"),
  metadataPreview: document.getElementById("metadata-preview"),
  previewImage: document.getElementById("preview-image"),
  previewName: document.getElementById("preview-name"),
  previewArtist: document.getElementById("preview-artist"),
  mintButton: document.getElementById("mint-button"),
  mintStatus: document.getElementById("mint-status"),
  galleryStatus: document.getElementById("gallery-status"),
  gallery: document.getElementById("gallery"),
};

/** Shortens 0x1234…abcd for display. */
function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function sameAddress(first, second) {
  return Boolean(first && second) && first.toLowerCase() === second.toLowerCase();
}

/** Turns ipfs://CID into a gateway URL. Other schemes are refused. */
function ipfsToGatewayUrl(uri) {
  if (typeof uri !== "string" || !uri.startsWith("ipfs://")) {
    return null;
  }
  return `${siteConfig.ipfsGatewayUrl}/${uri.slice("ipfs://".length)}`;
}

async function fetchMetadata(metadataUri) {
  const gatewayUrl = ipfsToGatewayUrl(metadataUri);
  if (!gatewayUrl) {
    throw new Error("Metadata URI must start with ipfs://");
  }
  const response = await fetch(gatewayUrl);
  if (!response.ok) {
    throw new Error(`IPFS gateway returned HTTP ${response.status}`);
  }
  return response.json();
}

function setStatus(element, message, kind = "") {
  element.textContent = message;
  element.classList.toggle("is-success", kind === "success");
  element.classList.toggle("is-error", kind === "error");
}

/** Extracts a readable message from wallet, RPC and contract errors. */
function describeError(error) {
  if (error?.code === "ACTION_REJECTED" || error?.code === 4001) {
    return "You rejected the request in your wallet.";
  }
  const revertName = error?.revert?.name;
  if (revertName && CONTRACT_ERROR_MESSAGES[revertName]) {
    return CONTRACT_ERROR_MESSAGES[revertName];
  }
  return error?.shortMessage || error?.reason || error?.message || String(error);
}

function explorerAddressUrl(address) {
  return `${siteConfig.explorerUrl}/address/${address}`;
}

function explorerTransactionUrl(transactionHash) {
  return `${siteConfig.explorerUrl}/tx/${transactionHash}`;
}

// ---------------------------------------------------------------- reading

async function loadContractInfo() {
  const [collectionName, collectionSymbol, ownerAddress, mintedCount] = await Promise.all([
    readContract.name(),
    readContract.symbol(),
    readContract.owner(),
    readContract.totalMinted(),
  ]);
  contractOwnerAddress = ownerAddress;

  elements.collectionName.textContent = collectionName;
  elements.collectionSymbol.textContent = collectionSymbol;
  elements.contractOwner.textContent = ownerAddress;
  elements.totalMinted.textContent = mintedCount.toString();
  document.title = `${collectionName}: Mint`;
  return Number(mintedCount);
}

function buildTokenCard(tokenId, ownerAddress, metadata) {
  const card = document.createElement("li");
  card.className = "token-card";

  const image = document.createElement("img");
  image.loading = "lazy";
  image.alt = metadata?.name ?? `Token ${tokenId}`;
  const imageUrl = ipfsToGatewayUrl(metadata?.image);
  if (imageUrl) {
    image.src = imageUrl;
  }
  card.append(image);

  const body = document.createElement("div");
  body.className = "token-card-body";

  const title = document.createElement("span");
  title.className = "token-card-title";
  title.textContent = metadata?.name ?? "(metadata unavailable)";

  const tokenLine = document.createElement("span");
  tokenLine.className = "token-card-meta";
  tokenLine.textContent = `Token #${tokenId}${metadata?.artist ? ` · ${metadata.artist}` : ""}`;

  const ownerLine = document.createElement("span");
  ownerLine.className = "token-card-meta";
  ownerLine.textContent = `Owner ${shortenAddress(ownerAddress)}${sameAddress(ownerAddress, connectedAddress) ? " (you)" : ""}`;

  const explorerLink = document.createElement("a");
  explorerLink.href = `${siteConfig.explorerUrl}/token/${siteConfig.contractAddress}?a=${tokenId}`;
  explorerLink.target = "_blank";
  explorerLink.rel = "noopener";
  explorerLink.textContent = "View on explorer";

  body.append(title, tokenLine, ownerLine, explorerLink);
  card.append(body);
  return card;
}

async function loadGallery(mintedCount) {
  if (mintedCount === 0) {
    elements.gallery.replaceChildren();
    setStatus(elements.galleryStatus, "No tokens minted yet.");
    return;
  }

  const shownCount = Math.min(mintedCount, MAX_GALLERY_TOKENS);
  const cards = await Promise.all(
    Array.from({ length: shownCount }, async (_, tokenId) => {
      const [ownerAddress, metadataUri] = await Promise.all([
        readContract.ownerOf(tokenId),
        readContract.tokenURI(tokenId),
      ]);
      const metadata = await fetchMetadata(metadataUri).catch(() => null);
      return buildTokenCard(tokenId, ownerAddress, metadata);
    }),
  );

  elements.gallery.replaceChildren(...cards);
  const hiddenNote = mintedCount > shownCount ? ` (showing the first ${shownCount})` : "";
  setStatus(elements.galleryStatus, `${mintedCount} token${mintedCount === 1 ? "" : "s"} minted${hiddenNote}.`);
}

async function refreshFromChain() {
  try {
    const mintedCount = await loadContractInfo();
    updateMintPermission();
    await loadGallery(mintedCount);
  } catch (error) {
    setStatus(elements.galleryStatus, `Could not read the contract: ${describeError(error)}`, "error");
  }
}

// ----------------------------------------------------------------- wallet

async function switchWalletToSiteChain() {
  const chainIdHex = ethers.toQuantity(siteConfig.chainId);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (error) {
    // 4902: the wallet does not know this chain yet, so add it.
    if (error?.code !== 4902) {
      throw error;
    }
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chainIdHex,
        chainName: siteConfig.chainName,
        nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
        rpcUrls: [siteConfig.rpcUrl],
        blockExplorerUrls: [siteConfig.explorerUrl],
      }],
    });
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus(elements.mintStatus, "No wallet found. Install MetaMask, then reload this page.", "error");
    return;
  }
  try {
    elements.connectButton.disabled = true;
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await switchWalletToSiteChain();
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    walletSigner = await browserProvider.getSigner();
    connectedAddress = await walletSigner.getAddress();

    elements.walletStatus.textContent = connectedAddress;
    elements.connectButton.textContent = shortenAddress(connectedAddress);
    if (!elements.recipientInput.value) {
      elements.recipientInput.value = connectedAddress;
    }
    setStatus(elements.mintStatus, "");
    updateMintPermission();
    await refreshFromChain();
  } catch (error) {
    setStatus(elements.mintStatus, `Could not connect: ${describeError(error)}`, "error");
  } finally {
    elements.connectButton.disabled = false;
  }
}

function disconnectWalletState() {
  connectedAddress = null;
  walletSigner = null;
  elements.walletStatus.textContent = "Not connected";
  elements.connectButton.textContent = "Connect wallet";
  updateMintPermission();
}

/** Enables the mint form only for the contract owner, and explains why otherwise. */
function updateMintPermission() {
  const isOwner = sameAddress(connectedAddress, contractOwnerAddress);
  let permissionMessage;
  if (!connectedAddress) {
    permissionMessage = "Connect the owner wallet to mint.";
  } else if (!isOwner) {
    permissionMessage = `Only the contract owner (${shortenAddress(contractOwnerAddress ?? "0x")}) can mint. Your wallet ${shortenAddress(connectedAddress)} can still view and hold tokens.`;
  } else {
    permissionMessage = "You are the contract owner: you can mint.";
  }
  elements.mintPermission.textContent = permissionMessage;
  elements.recipientInput.disabled = !isOwner;
  elements.metadataInput.disabled = !isOwner;
  elements.mintButton.disabled = !isOwner;
}

// ---------------------------------------------------------------- minting

let previewRequestNumber = 0;

/** Shows the name and image of the metadata about to be minted. */
async function previewMetadata() {
  const requestNumber = ++previewRequestNumber;
  const metadataUri = elements.metadataInput.value.trim();
  if (!ipfsToGatewayUrl(metadataUri)) {
    elements.metadataPreview.hidden = true;
    return;
  }
  try {
    const metadata = await fetchMetadata(metadataUri);
    if (requestNumber !== previewRequestNumber) {
      return; // A newer preview request started meanwhile.
    }
    elements.previewName.textContent = metadata.name ?? "(no name)";
    elements.previewArtist.textContent = metadata.artist ? `by ${metadata.artist}` : "";
    const imageUrl = ipfsToGatewayUrl(metadata.image);
    elements.previewImage.alt = metadata.name ?? "";
    if (imageUrl) {
      elements.previewImage.src = imageUrl;
    } else {
      elements.previewImage.removeAttribute("src");
    }
    elements.metadataPreview.hidden = false;
  } catch {
    if (requestNumber === previewRequestNumber) {
      elements.metadataPreview.hidden = true;
    }
  }
}

async function mintToken(event) {
  event.preventDefault();
  const recipientAddress = elements.recipientInput.value.trim();
  const metadataUri = elements.metadataInput.value.trim();

  if (!ethers.isAddress(recipientAddress)) {
    setStatus(elements.mintStatus, "Enter a valid recipient address (0x followed by 40 hex characters).", "error");
    return;
  }
  if (!ipfsToGatewayUrl(metadataUri) || metadataUri.length <= "ipfs://".length) {
    setStatus(elements.mintStatus, "The metadata URI must be an IPFS link: ipfs://<CID>.", "error");
    return;
  }

  elements.mintButton.disabled = true;
  try {
    // Re-check the wallet network right before signing.
    const walletNetwork = await walletSigner.provider.getNetwork();
    if (walletNetwork.chainId !== BigInt(siteConfig.chainId)) {
      await switchWalletToSiteChain();
      walletSigner = await new ethers.BrowserProvider(window.ethereum).getSigner();
    }

    const writeContract = new ethers.Contract(siteConfig.contractAddress, TOKENIZE_ART_ABI, walletSigner);

    // Simulate first: a failing mint is reported without spending gas.
    setStatus(elements.mintStatus, "Checking the mint…");
    await writeContract.safeMint.staticCall(recipientAddress, metadataUri);

    setStatus(elements.mintStatus, "Confirm the transaction in your wallet…");
    const mintTransaction = await writeContract.safeMint(recipientAddress, metadataUri);

    setStatus(elements.mintStatus, `Transaction sent, waiting for confirmation: ${mintTransaction.hash}`);
    const mintReceipt = await mintTransaction.wait();

    const transferLog = mintReceipt.logs
      .map((log) => writeContract.interface.parseLog(log))
      .find((parsedLog) => parsedLog?.name === "Transfer");
    const mintedTokenId = transferLog ? transferLog.args.tokenId.toString() : "?";

    elements.mintStatus.replaceChildren();
    const successText = document.createTextNode(`Minted token #${mintedTokenId} to ${shortenAddress(recipientAddress)}. `);
    const transactionLink = document.createElement("a");
    transactionLink.href = explorerTransactionUrl(mintTransaction.hash);
    transactionLink.target = "_blank";
    transactionLink.rel = "noopener";
    transactionLink.textContent = "View transaction";
    elements.mintStatus.append(successText, transactionLink);
    elements.mintStatus.classList.remove("is-error");
    elements.mintStatus.classList.add("is-success");

    await refreshFromChain();
  } catch (error) {
    setStatus(elements.mintStatus, `Mint failed: ${describeError(error)}`, "error");
  } finally {
    updateMintPermission();
  }
}

// ------------------------------------------------------------------- start

async function initialize() {
  siteConfig = await (await fetch("/config.json")).json();
  const readProvider = new ethers.JsonRpcProvider(siteConfig.rpcUrl, siteConfig.chainId, { staticNetwork: true });
  readContract = new ethers.Contract(siteConfig.contractAddress, TOKENIZE_ART_ABI, readProvider);

  elements.networkName.textContent = siteConfig.chainName;
  elements.contractLink.textContent = siteConfig.contractAddress;
  elements.contractLink.href = explorerAddressUrl(siteConfig.contractAddress);
  elements.metadataInput.value = siteConfig.defaultMetadataUri;

  elements.connectButton.addEventListener("click", connectWallet);
  elements.mintForm.addEventListener("submit", mintToken);
  elements.metadataInput.addEventListener("input", previewMetadata);

  if (window.ethereum) {
    window.ethereum.on?.("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        disconnectWalletState();
      } else {
        connectWallet();
      }
    });
    window.ethereum.on?.("chainChanged", () => window.location.reload());
  }

  updateMintPermission();
  previewMetadata();
  await refreshFromChain();
}

initialize().catch((error) => {
  setStatus(elements.galleryStatus, `Could not start: ${describeError(error)}`, "error");
});
