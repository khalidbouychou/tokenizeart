// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title TokenizeArt42
/// @notice BEP-721 (ERC-721 compatible) NFT collection for the 42 TokenizeArt
///         project, deployed on BSC Testnet only.
/// @dev Each token points to its own metadata JSON on IPFS (stored per token
///      by ERC721URIStorage). Only the contract owner can mint.
///
///      Security model:
///      - Minting is restricted to the owner (`onlyOwner`), so nobody else can
///        create tokens.
///      - Ownership transfers use Ownable2Step: the new owner must call
///        `acceptOwnership()`, so a typo in the address cannot hand the
///        contract to an unreachable account.
///      - Once minted, a token's metadata URI cannot be changed by anyone,
///        including the owner: there is no setter.
///      - Token holders keep full ERC-721 control of their own tokens; the
///        owner has no power to move or burn them.
contract TokenizeArt42 is ERC721URIStorage, Ownable2Step {
    /// @notice ID that the next minted token will receive. Starts at 0 and
    ///         only increases, so token IDs are never reused.
    uint256 private _nextTokenId;

    /// @notice Raised when minting with an empty metadata URI, which would
    ///         produce an NFT with no image or name.
    error EmptyMetadataURI();

    /// @param collectionName   ERC-721 collection name (should include "42").
    /// @param collectionSymbol ERC-721 ticker symbol.
    /// @param initialOwner     Account allowed to mint (normally the deployer).
    constructor(
        string memory collectionName,
        string memory collectionSymbol,
        address initialOwner
    ) ERC721(collectionName, collectionSymbol) Ownable(initialOwner) {}

    /// @notice Mints a new NFT to `recipient` with the given metadata.
    /// @dev Uses `_safeMint`, which reverts if `recipient` is a contract that
    ///      cannot receive ERC-721 tokens, so tokens cannot get stuck.
    /// @param recipient   Address that will own the new token.
    /// @param metadataURI IPFS URI of the token's metadata JSON
    ///                    (e.g. "ipfs://<CID>").
    /// @return mintedTokenId ID of the newly minted token.
    function safeMint(address recipient, string calldata metadataURI)
        external
        onlyOwner
        returns (uint256 mintedTokenId)
    {
        if (bytes(metadataURI).length == 0) {
            revert EmptyMetadataURI();
        }

        mintedTokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(recipient, mintedTokenId);
        _setTokenURI(mintedTokenId, metadataURI);
    }

    /// @notice Number of tokens minted so far (no burn function exists, so
    ///         this is also the current supply).
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
