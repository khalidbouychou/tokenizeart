// Uploads a file to IPFS with Pinata, then downloads it again
// to check that anyone can get it.
//
// You need PINATA_JWT in code/.env
//
// npm run upload-to-ipfs -- art/tokenize-art-42.png
import { existsSync, openAsBlob, readFileSync } from "node:fs";
import path from "node:path";

const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";
// we try more than one gateway because they often block us (HTTP 429)
const PUBLIC_GATEWAY_URLS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://dweb.link/ipfs",
];

const envFilePath = path.join(import.meta.dirname, "..", ".env");
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const pinataJwt = process.env.PINATA_JWT;
if (!pinataJwt) {
  console.error("PINATA_JWT is missing from code/.env. See code/.env.example.");
  process.exit(1);
}

const filePathArgument = process.argv[2];
if (!filePathArgument || !existsSync(filePathArgument)) {
  console.error("Usage: npm run upload-to-ipfs -- <path/to/file>");
  process.exit(1);
}

const fileName = path.basename(filePathArgument);
const uploadForm = new FormData();
uploadForm.append("file", await openAsBlob(filePathArgument), fileName);
uploadForm.append("name", fileName);
// without this, pinata keeps the file private
uploadForm.append("network", "public");

const uploadResponse = await fetch(PINATA_UPLOAD_URL, {
  method: "POST",
  headers: { Authorization: `Bearer ${pinataJwt}` },
  body: uploadForm,
});

if (!uploadResponse.ok) {
  console.error(`Pinata upload failed: HTTP ${uploadResponse.status}`);
  console.error(await uploadResponse.text());
  process.exit(1);
}

const uploadResult = (await uploadResponse.json()) as { data: { cid: string } };
const contentId = uploadResult.data.cid;
console.log(`File:        ${fileName}`);
console.log(`CID:         ${contentId}`);
console.log(`IPFS URI:    ipfs://${contentId}`);
console.log(`Gateway URL: ${PUBLIC_GATEWAY_URLS[0]}/${contentId}`);

// a new file can take some time to show up, so we retry a few times
const localFileBytes = readFileSync(filePathArgument);
const MAX_GATEWAY_ROUNDS = 3;
const SECONDS_BETWEEN_ROUNDS = 10;

for (let round = 1; round <= MAX_GATEWAY_ROUNDS; round++) {
  for (const gatewayBaseUrl of PUBLIC_GATEWAY_URLS) {
    const gatewayUrl = `${gatewayBaseUrl}/${contentId}`;
    try {
      const gatewayResponse = await fetch(gatewayUrl, { signal: AbortSignal.timeout(30_000) });
      if (gatewayResponse.ok) {
        const gatewayBytes = Buffer.from(await gatewayResponse.arrayBuffer());
        if (gatewayBytes.equals(localFileBytes)) {
          console.log(`Verified: ${gatewayBaseUrl} returns exactly this file.`);
          process.exit(0);
        }
        console.error(`${gatewayBaseUrl} returned different content than the local file.`);
        process.exit(1);
      }
      console.log(`Round ${round}, ${gatewayBaseUrl}: HTTP ${gatewayResponse.status}`);
    } catch (error) {
      console.log(`Round ${round}, ${gatewayBaseUrl}: ${(error as Error).message}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, SECONDS_BETWEEN_ROUNDS * 1000));
}

console.error("Uploaded, but not yet retrievable from any public gateway. Open the Gateway URL later to check.");
process.exit(1);
