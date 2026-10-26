// Builds the fully on-chain token URI for the "42 Genesis Blocks (On-chain)"
// token: metadata JSON and image packed into data: URIs, no IPFS.
import { readFileSync } from "node:fs";
import path from "node:path";

export const ON_CHAIN_SVG_PATH = path.join(import.meta.dirname, "..", "code", "art", "tokenize-art-42-onchain.svg");

/**
 * The SVG goes in as UTF-8 (only "#" needs escaping: it would otherwise
 * start a URL fragment), which is ~25% smaller than base64. The JSON is
 * base64-encoded, the format wallets expect.
 */
export function buildOnChainTokenUri(svgSource = readFileSync(ON_CHAIN_SVG_PATH, "utf8")): string {
  if (svgSource.includes("%") || svgSource.includes('"')) {
    throw new Error('The on-chain SVG must not contain "%" or double quotes.');
  }
  const imageDataUri = `data:image/svg+xml;utf8,${svgSource.replaceAll("#", "%23")}`;
  const metadata = {
    name: "42 Genesis Blocks (On-chain)",
    description: "The number 42 built from gold blocks. Metadata and image are stored entirely on BNB Smart Chain Testnet, with no IPFS. Artist: khbouych.",
    image: imageDataUri,
    artist: "khbouych",
    attributes: [
      { trait_type: "Artist", value: "khbouych" },
      { trait_type: "Number", value: "42" },
      { trait_type: "Style", value: "Block pixel" },
      { trait_type: "Storage", value: "On-chain" },
      { trait_type: "Network", value: "BSC Testnet" },
    ],
  };
  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
}
