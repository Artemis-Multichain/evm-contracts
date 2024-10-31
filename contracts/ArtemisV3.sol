// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ArtemisV3 is ERC1155 {
    string private _name;
    string private _symbol;
    uint256 private _currentTokenId;

    mapping(uint256 => uint256) private _tokenSupply;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) private _tokenPrices;

    constructor(string memory name_, string memory symbol_) ERC1155("") {
        _name = name_;
        _symbol = symbol_;
        _currentTokenId = 1;  // Start from 1 instead of 0
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function createNFT(
        uint256 initialSupply,
        string memory tokenURI,
        uint256 price
    ) external returns (uint256) {
        uint256 tokenId = _currentTokenId;
        _currentTokenId += 1;

        _mint(msg.sender, tokenId, initialSupply, "");

        _tokenSupply[tokenId] = initialSupply;
        _tokenURIs[tokenId] = tokenURI;
        _tokenPrices[tokenId] = price;

        return tokenId;
    }

    function mint(uint256 tokenId) external payable {
        require(_tokenSupply[tokenId] > 0, "Invalid token ID");
        require(msg.value == _tokenPrices[tokenId], "Incorrect payment amount");

        _mint(msg.sender, tokenId, 1, "");

        _tokenSupply[tokenId] -= 1;

        if (_tokenSupply[tokenId] == 0) {
            delete _tokenURIs[tokenId];
            delete _tokenPrices[tokenId];
        }
    }

    function setMaxSupply(uint256 tokenId, uint256 maxSupply) external {
        require(
            maxSupply >= _tokenSupply[tokenId],
            "Max supply must be greater than or equal to current supply"
        );

        _tokenSupply[tokenId] = maxSupply;
    }

    function setTokenURI(uint256 tokenId, string memory tokenURI) external {
        _tokenURIs[tokenId] = tokenURI;
    }

    function setTokenPrice(uint256 tokenId, uint256 price) external {
        _tokenPrices[tokenId] = price;
    }

    function getMaxSupply(uint256 tokenId) external view returns (uint256) {
        return _tokenSupply[tokenId];
    }

    function getTokenURI(
        uint256 tokenId
    ) external view returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function getPrice(uint256 tokenId) external view returns (uint256) {
        return _tokenPrices[tokenId];
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }
}