PRD.md — TokenizeArt: Build Your Own NFT
1. Project Overview
Project Name: TokenizeArt
Type: Web3 Exercise (42 × BNB Chain partnership)
Version: 1.00
Reference: toknizer-art.pdf

TokenizeArt is a Web3 project in which the participant creates, deploys, and mints their own Non-Fungible Token (NFT) on a public blockchain. The project is designed around BNB Chain (BSC) as the recommended ecosystem, while the subject explicitly allows any compatible blockchain platform and language, provided the relevant token standard is respected.

Summary: This document is a Web3 related exercise.

2. Objectives
Participants must demonstrate:

Proficiency in multiple programming languages (e.g., Solidity, JavaScript/TypeScript).

Familiarity with public blockchain technology and the deployment/minting lifecycle of an NFT.

Critical and creative thinking while navigating blockchain complexity.

The ability to produce a fully functional, verifiable digital asset on a public blockchain.

No strong cryptography background is required. The project must push the participant out of their comfort zone but must never require the use of real money or real coins.

3. Mandatory Requirements
All mandatory requirements must be fully completed and working flawlessly for the project to be considered valid. The bonus part is only evaluated if the mandatory part is perfect.

3.1 Creating the Image of the NFT
Requirement	Detail
Constraint	The image must include the number 42.
Validity	The 42 must be correctly and legibly displayed. Images where the 42 is incorrectly displayed are invalid.
Content	Insulting terms or images are strictly forbidden (subject to punishment).
Storage	The image must be stored using distributed registry technology (e.g., IPFS).
Format	Free choice of representation, within the constraints above.
⚠️ The subject explicitly flags an example of an invalid image (where the 42 is incorrectly displayed) versus valid examples. The image must be unambiguous.

3.2 Deploying the Contract
Requirement	Detail
README.md	Must exist at the root of the repository, explaining the choices made and the reasons behind them.
Language	Free choice, but must respect the standards of the chosen blockchain (e.g., ERC-721 for ETH, BEP-721 for BSC).
Platform	Must choose a blockchain platform supporting NFT creation.
Metadata	Must be managed. The artist's name must be your login, and the name must include 42 and a title.
Tooling	Must become proficient with the platform's language and tools (e.g., IDE, Truffle, Remix, Hardhat).
Safety	Never use real money or real coins. Use test chains only (e.g., BSC Testnet).
Code location	Code used to create the NFT must be in a code folder at the root of the repository.
Code quality	Code must be commented, with readable and explicit variable/function names.
Review	A code review will take place during evaluation.
Demonstration	Must be able to perform minimalist actions to demonstrate operation.
Security	Must consider all aspects of security, including ownership and privileges.
3.3 Mint Your NFT
Requirement	Detail
Deployment folder	All necessary files for deployment must be placed in a second folder with a name of your choice.
Public minting	NFT must be minted on a public blockchain.
Public address	The public address and the network used must be mentioned in the Git repository.
Display	Must be able to display the NFT.
Ownership verification	Must be able to confirm the owner of an NFT (e.g., using the ownerOf function in Solidity).
Documentation	A documentation folder must exist at the root of the repository. It must be possible to understand how it works and what is needed to use the NFT.
Clarity	Documentation must be clear and explicit; it will be reviewed during evaluation.
Whitepaper	Consider developing a whitepaper or other documentation outlining features and functionality of the NFT.
Demo video	Optional. A simple link suffices; the video must not be pushed to the repository. Creating a video is not required and does not improve the grade.
3.4 Required Directory Structure
The subject provides the following expected directory structure as an example:

text
$> ls -al
total XX
drwxr-xr-x 3 eagle eagle 4096 avril 42 20:42 .
drwxr-xrwt 17 eagle eagle 4096 avril 42 20:42 ..
-rw-r--r-- 1 eagle eagle XXXX avril 42 20:42 README.md
drwxr-xr-x 3 eagle eagle 4096 avril 42 20:42 code
drwxr-xr-x 3 eagle eagle 4096 avril 42 20:42 deployment
drwxr-xr-x 3 eagle eagle 4096 avril 42 20:42 mint
drwxr-xr-x 3 eagle eagle 4096 avril 42 20:42 documentation
Required root-level items:

README.md

code/ (contract creation code)

A second folder (name of your choice) for deployment files — the example uses deployment/

documentation/

(Example also shows mint/ — the exact second-folder name is your choice)

4. Bonus Part (Optional, Conditionally Evaluated)
The bonus part is only assessed if the mandatory part is PERFECT (fully completed and working flawlessly). If any mandatory requirement is not met, the bonus part is not evaluated at all.

Possible bonuses:

A beautiful NFT.

A website where you can mint your NFT with a graphical interface.

Managing NFT Inscriptions — storing metadata and image storage directly on-chain.

5. Submission & Peer-Evaluation
Requirement	Detail
Submission	Turn in the assignment in your Git repository as usual.
Evaluation scope	Only the work inside the repository will be evaluated during the defense.
Verification	Double-check the names of folders and files to ensure they are correct.
Sharing	Exceptionally, it is recommended to share the project via your personal Git account once valid.
Hashtags	Free to use different hashtags depending on the programming language used, plus web3-related tags.
6. Constraints & Prohibitions (Non-Negotiable)
The following rules must be respected to avoid breaking the subject:

✅ The NFT image must contain the number 42, correctly and legibly displayed.

❌ No insulting terms or images (punishable).

✅ The image must be stored on distributed registry technology (e.g., IPFS).

✅ The token standard of the chosen blockchain must be respected (ERC-721 / BEP-721, etc.).

✅ The artist name in metadata must be your login.

✅ The NFT name must include 42 and a title.

❌ Never use real money or real coins — use test chains only (e.g., BSC Testnet).

✅ Code must live in a code folder at the repository root and be commented with explicit names.

✅ A README.md must be at the repository root explaining choices and reasons.

✅ A documentation folder must be at the repository root.

✅ Deployment files must be in a second folder with a name of your choice.

✅ The public address and network used must be mentioned in the Git repository.

✅ The NFT must be displayable, and ownership must be verifiable (e.g., ownerOf).

✅ A code review will occur during evaluation — be ready to demonstrate minimalist actions and explain security (ownership, privileges).

⚠️ Bonus parts are only evaluated if the mandatory part is perfect.

7. Recommended Tech Stack (Subject-Aligned)
Layer	Recommendation
Blockchain	BNB Chain (BSC) — recommended by subject; any compatible chain allowed
Network	BSC Testnet (mandatory safety: no real funds)
Standard	BEP-721 (BSC) / ERC-721 (ETH)
Language	Solidity (free choice, must respect chain standard)
Tooling	Remix, Hardhat, or Truffle
Image storage	IPFS (distributed registry technology)
Faucet	BNB Chain Faucet (free Tbnb, no minimum coins)
8. Deliverables Checklist
□ NFT image containing a correct, legible 42 — stored on IPFS
□ Smart contract respecting the chain's NFT standard
□ README.md at root (choices + reasons)
□ code/ folder at root (commented, explicit names)
□ Second folder (deployment files)
□ documentation/ folder at root (clear and explicit)
□ NFT minted on a public blockchain (testnet)
□ Public address + network mentioned in the Git repository
□ NFT displayable
□ Ownership verifiable (e.g., ownerOf)
□ Metadata: artist name = login; name includes 42 + a title
□ Security reviewed (ownership, privileges)
□ Ready for code review / defense
□ (Optional) Bonus: beautiful NFT, minting website, on-chain inscriptions
9. Evaluation Criteria Summary
Area	Weight / Condition
Mandatory part	Must be perfect for project validity
Code review	Performed during defense
Documentation review	Performed during evaluation
Bonus	Evaluated only if mandatory is perfect
Demo video	Optional, no grade impact
End of PRD — TokenizeArt v1.00


BSC_TESTNET_PRIVATE_KEY = 0xE78786D199CCE50f441760E69c82c9A216e06372