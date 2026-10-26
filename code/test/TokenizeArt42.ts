import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.getOrCreate();

const COLLECTION_NAME = "TokenizeArt 42";
const COLLECTION_SYMBOL = "TA42";
const SAMPLE_METADATA_URI = "ipfs://bafkreisamplemetadatacid";

async function deployFixture() {
  const [owner, otherAccount, recipient] = await ethers.getSigners();
  const tokenizeArt = await ethers.deployContract("TokenizeArt42", [
    COLLECTION_NAME,
    COLLECTION_SYMBOL,
    owner.address,
  ]);
  return { tokenizeArt, owner, otherAccount, recipient };
}

describe("TokenizeArt42", function () {
  describe("deployment", function () {
    it("sets the collection name and symbol", async function () {
      const { tokenizeArt } = await deployFixture();
      expect(await tokenizeArt.name()).to.equal(COLLECTION_NAME);
      expect(await tokenizeArt.symbol()).to.equal(COLLECTION_SYMBOL);
    });

    it("sets the initial owner", async function () {
      const { tokenizeArt, owner } = await deployFixture();
      expect(await tokenizeArt.owner()).to.equal(owner.address);
    });

    it("supports the ERC-721 and ERC-721 Metadata interfaces", async function () {
      const { tokenizeArt } = await deployFixture();
      expect(await tokenizeArt.supportsInterface("0x80ac58cd")).to.equal(true); // ERC-721
      expect(await tokenizeArt.supportsInterface("0x5b5e139f")).to.equal(true); // ERC-721 Metadata
    });
  });

  describe("minting", function () {
    it("lets the owner mint, then ownerOf returns the recipient", async function () {
      const { tokenizeArt, recipient } = await deployFixture();
      await tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI);
      expect(await tokenizeArt.ownerOf(0)).to.equal(recipient.address);
      expect(await tokenizeArt.balanceOf(recipient.address)).to.equal(1n);
    });

    it("stores the metadata URI returned by tokenURI", async function () {
      const { tokenizeArt, recipient } = await deployFixture();
      await tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI);
      expect(await tokenizeArt.tokenURI(0)).to.equal(SAMPLE_METADATA_URI);
    });

    it("emits a Transfer event from the zero address", async function () {
      const { tokenizeArt, recipient } = await deployFixture();
      await expect(tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI))
        .to.emit(tokenizeArt, "Transfer")
        .withArgs(ethers.ZeroAddress, recipient.address, 0n);
    });

    it("assigns increasing token IDs and counts them", async function () {
      const { tokenizeArt, recipient } = await deployFixture();
      await tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI);
      await tokenizeArt.safeMint(recipient.address, "ipfs://second");
      expect(await tokenizeArt.ownerOf(1)).to.equal(recipient.address);
      expect(await tokenizeArt.tokenURI(1)).to.equal("ipfs://second");
      expect(await tokenizeArt.totalMinted()).to.equal(2n);
    });

    it("rejects minting by an account that is not the owner", async function () {
      const { tokenizeArt, otherAccount } = await deployFixture();
      await expect(
        tokenizeArt.connect(otherAccount).safeMint(otherAccount.address, SAMPLE_METADATA_URI),
      )
        .to.be.revertedWithCustomError(tokenizeArt, "OwnableUnauthorizedAccount")
        .withArgs(otherAccount.address);
    });

    it("rejects an empty metadata URI", async function () {
      const { tokenizeArt, recipient } = await deployFixture();
      await expect(tokenizeArt.safeMint(recipient.address, "")).to.be.revertedWithCustomError(
        tokenizeArt,
        "EmptyMetadataURI",
      );
    });

    it("rejects minting to the zero address", async function () {
      const { tokenizeArt } = await deployFixture();
      await expect(tokenizeArt.safeMint(ethers.ZeroAddress, SAMPLE_METADATA_URI))
        .to.be.revertedWithCustomError(tokenizeArt, "ERC721InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });

    it("rejects ownerOf and tokenURI for a token that was never minted", async function () {
      const { tokenizeArt } = await deployFixture();
      await expect(tokenizeArt.ownerOf(0)).to.be.revertedWithCustomError(
        tokenizeArt,
        "ERC721NonexistentToken",
      );
      await expect(tokenizeArt.tokenURI(0)).to.be.revertedWithCustomError(
        tokenizeArt,
        "ERC721NonexistentToken",
      );
    });
  });

  describe("ownership and privileges", function () {
    it("requires the new owner to accept a transfer (two-step)", async function () {
      const { tokenizeArt, owner, otherAccount } = await deployFixture();
      await tokenizeArt.transferOwnership(otherAccount.address);
      expect(await tokenizeArt.owner()).to.equal(owner.address);
      expect(await tokenizeArt.pendingOwner()).to.equal(otherAccount.address);

      await tokenizeArt.connect(otherAccount).acceptOwnership();
      expect(await tokenizeArt.owner()).to.equal(otherAccount.address);
    });

    it("prevents a non-owner from starting an ownership transfer", async function () {
      const { tokenizeArt, otherAccount } = await deployFixture();
      await expect(tokenizeArt.connect(otherAccount).transferOwnership(otherAccount.address))
        .to.be.revertedWithCustomError(tokenizeArt, "OwnableUnauthorizedAccount")
        .withArgs(otherAccount.address);
    });

    it("does not let the contract owner move a holder's token", async function () {
      const { tokenizeArt, owner, recipient } = await deployFixture();
      await tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI);
      await expect(tokenizeArt.transferFrom(recipient.address, owner.address, 0))
        .to.be.revertedWithCustomError(tokenizeArt, "ERC721InsufficientApproval")
        .withArgs(owner.address, 0n);
    });

    it("lets a holder transfer their own token", async function () {
      const { tokenizeArt, owner, recipient } = await deployFixture();
      await tokenizeArt.safeMint(recipient.address, SAMPLE_METADATA_URI);
      await tokenizeArt.connect(recipient).transferFrom(recipient.address, owner.address, 0);
      expect(await tokenizeArt.ownerOf(0)).to.equal(owner.address);
    });
  });
});
