// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@seda-protocol/contracts/src/SedaProver.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract NFTMarketplace is 
    ERC1155, 
    AutomationCompatibleInterface, 
    ReentrancyGuard, 
    Pausable 
{
    // Structs
    struct TokenData {
        uint256 supply;
        uint256 priceUSD;
        string tokenURI;
        bool exists;
        address creator;
        uint256 royaltyPercentage; // Creator royalty (in basis points, e.g., 250 = 2.5%)
    }

    // State variables
    uint256 private _currentTokenId = 1; // Start from ID 1
    string private _name;
    string private _symbol;
    
    // Token storage
    mapping(uint256 => TokenData) private _tokens;
    
    // Platform fee configuration
    uint256 public creationFee;      // Fee to create a new NFT collection
    uint256 public platformFee;      // Fee per sale (in basis points)
    address public feeRecipient;     // Address receiving platform fees
    
    // Oracle integration
    SedaProver public immutable sedaProverContract;
    bytes32 public immutable oracleProgramId;
    bytes32 public latestDataRequestId;
    
    // Constants
    uint256 public constant PRICE_DECIMALS = 6;
    uint256 public constant BASIS_POINTS = 10000; // For fee calculations
    
    // Automation variables
    uint256 public minUpdateInterval;
    uint256 public lastTimeStamp;
    bool public automationEnabled;
    
    // Events
    event TokenCreated(
        uint256 indexed tokenId, 
        address indexed creator, 
        uint256 supply, 
        uint256 priceUSD,
        uint256 royaltyPercentage
    );
    event TokenMinted(
        uint256 indexed tokenId, 
        address indexed buyer,
        address indexed creator,
        uint256 priceETH,
        uint256 platformFeeAmount,
        uint256 royaltyAmount
    );
    event PriceUpdated(uint256 timestamp, uint256 ethPrice);
    event FeesUpdated(uint256 creationFee, uint256 platformFee);
    event FeeRecipientUpdated(address newRecipient);

    // Errors
    error InvalidPrice();
    error InvalidPayment();
    error InvalidToken();
    error InsufficientSupply();
    error InvalidFeeConfiguration();
    error InvalidRoyaltyPercentage();
    error TransferFailed();

    constructor(
        string memory name_,
        string memory symbol_,
        address _sedaProverContract,
        bytes32 _oracleProgramId,
        uint256 _minUpdateInterval,
        uint256 _creationFee,
        uint256 _platformFee,
        address _feeRecipient
    ) ERC1155("") {
        _name = name_;
        _symbol = symbol_;
        sedaProverContract = SedaProver(_sedaProverContract);
        oracleProgramId = _oracleProgramId;
        minUpdateInterval = _minUpdateInterval;
        
        if (_platformFee > 1000) revert InvalidFeeConfiguration(); // Max 10%
        platformFee = _platformFee;
        creationFee = _creationFee;
        feeRecipient = _feeRecipient;
        
        lastTimeStamp = block.timestamp;
        automationEnabled = true;
    }

    // NFT Creation
    function createNFT(
        uint256 initialSupply,
        string memory tokenURI,
        uint256 priceUSD,
        uint256 royaltyPercentage
    ) external payable returns (uint256) {
        // Validate inputs
        if (msg.value < creationFee) revert InvalidPayment();
        if (royaltyPercentage > 2000) revert InvalidRoyaltyPercentage(); // Max 20% royalty
        
        uint256 tokenId = _currentTokenId++;
        
        _tokens[tokenId] = TokenData({
            supply: initialSupply,
            priceUSD: priceUSD,
            tokenURI: tokenURI,
            exists: true,
            creator: msg.sender,
            royaltyPercentage: royaltyPercentage
        });
        
        _mint(msg.sender, tokenId, initialSupply, "");
        
        // Transfer creation fee to fee recipient
        (bool success, ) = feeRecipient.call{value: creationFee}("");
        if (!success) revert TransferFailed();
        
        // Refund excess payment if any
        if (msg.value > creationFee) {
            (success, ) = msg.sender.call{value: msg.value - creationFee}("");
            if (!success) revert TransferFailed();
        }
        
        emit TokenCreated(tokenId, msg.sender, initialSupply, priceUSD, royaltyPercentage);
        return tokenId;
    }

    
    function mint(uint256 tokenId) external payable nonReentrant whenNotPaused {
        TokenData storage token = _tokens[tokenId];
        if (!token.exists) revert InvalidToken();
        if (token.supply == 0) revert InsufficientSupply();
        
        uint256 ethPrice = getEthPrice();
        if (ethPrice == 0) revert InvalidPrice();
        
        // Calculate required ETH amount: (priceUSD * 1e18) / ethPrice
        uint256 requiredETH = (token.priceUSD * 1e18) / ethPrice;
        if (msg.value < requiredETH) revert InvalidPayment();
        
        // Calculate fees
        uint256 platformFeeAmount = (requiredETH * platformFee) / BASIS_POINTS;
        uint256 royaltyAmount = (requiredETH * token.royaltyPercentage) / BASIS_POINTS;
        uint256 creatorAmount = requiredETH - platformFeeAmount - royaltyAmount;
        
        // Transfer platform fee
        (bool success, ) = feeRecipient.call{value: platformFeeAmount}("");
        if (!success) revert TransferFailed();
        
        // Transfer royalty to creator
        (success, ) = token.creator.call{value: royaltyAmount + creatorAmount}("");
        if (!success) revert TransferFailed();
        
        // Mint token
        _mint(msg.sender, tokenId, 1, "");
        token.supply -= 1;
        
        emit TokenMinted(
            tokenId, 
            msg.sender, 
            token.creator, 
            requiredETH, 
            platformFeeAmount, 
            royaltyAmount
        );
        
        // Refund excess payment
        if (msg.value > requiredETH) {
            (success, ) = msg.sender.call{value: msg.value - requiredETH}("");
            if (!success) revert TransferFailed();
        }
    }

    // Price management functions
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        upkeepNeeded = automationEnabled && 
                       (block.timestamp - lastTimeStamp) >= minUpdateInterval &&
                       !paused();
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        if ((block.timestamp - lastTimeStamp) >= minUpdateInterval) {
            lastTimeStamp = block.timestamp;
            updatePrice();
        }
    }

    function updatePrice() public returns (bytes32) {
        SedaDataTypes.DataRequestInputs memory inputs = SedaDataTypes.DataRequestInputs(
            oracleProgramId,
            "ethusdc",                    
            oracleProgramId,
            hex"00",
            1,
            hex"00",
            1,
            5000000,
            abi.encodePacked(block.number)
        );

        latestDataRequestId = sedaProverContract.postDataRequest(inputs);
        lastTimeStamp = block.timestamp;
        
        return latestDataRequestId;
    }

    function getEthPrice() public view returns (uint256) {
        if (latestDataRequestId == bytes32(0)) return 0;
        
        SedaDataTypes.DataResult memory dataResult = sedaProverContract.getDataResult(latestDataRequestId);
        
        if (dataResult.consensus) {
            // The result is a hex-encoded ASCII string representing the price
            // Convert it to a number
            string memory priceStr = string(dataResult.result);
            uint256 price = stringToUint(priceStr);
            
            // Validate the price is reasonable (greater than 0 and less than $100,000)
            if (price > 0 && price < 100_000_000_000) {  // $100,000 with 6 decimals
                return price;
            }
        }
        
        return 0;
    }

    function stringToUint(string memory s) internal pure returns (uint256) {
        bytes memory b = bytes(s);
        uint256 result = 0;
        for(uint i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }

    // Getter functions
    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function getTokenData(uint256 tokenId) external view returns (TokenData memory) {
        if (!_tokens[tokenId].exists) revert InvalidToken();
        return _tokens[tokenId];
    }

    function getCurrentPriceETH(uint256 tokenId) external view returns (uint256) {
        if (!_tokens[tokenId].exists) revert InvalidToken();
        
        uint256 ethPrice = getEthPrice();
        if (ethPrice == 0) revert InvalidPrice();
        
        // priceUSD has 6 decimals (USDC format)
        // ethPrice has 6 decimals
        // We want the result in wei (18 decimals)
        // Formula: (priceUSD * 1e18) / ethPrice
        
        uint256 priceUSD = _tokens[tokenId].priceUSD;
        
        // First multiply by 1e18 to maintain precision and get the result in wei
        uint256 numerator = priceUSD * 1e18;
        
        // Then divide by ETH price
        // Since ethPrice has 6 decimals, this gives us the correct wei amount
        return numerator / ethPrice;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        if (!_tokens[tokenId].exists) revert InvalidToken();
        return _tokens[tokenId].tokenURI;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}