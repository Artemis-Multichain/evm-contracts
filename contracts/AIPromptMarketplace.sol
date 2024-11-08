// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@seda-protocol/contracts/src/SedaProver.sol";

interface IPriceFeed {
    function latestAnswer() external view returns (uint128);
}

contract AIPromptMarketplace is ERC1155, ReentrancyGuard, Pausable, Ownable {
    struct TokenData {
        uint256 supply;
        uint256 priceUSD;
        string tokenURI;
        bool exists;
        address creator;
        uint256 royaltyPercentage;
    }

    uint256 private _currentTokenId = 1;
    string private _name;
    string private _symbol;
    
    mapping(uint256 => TokenData) private _tokens;
    
    // Platform fee configuration
    uint256 public creationFee;
    uint256 public platformFee;
    address public feeRecipient;
    
    // Price feed
    IPriceFeed public immutable priceFeed;

    // SEDA integration for prompts
    SedaProver public immutable sedaProverContract;
    bytes32 public immutable promptOracleProgramId;
    bytes32 public immutable txOracleProgramId;
    bytes32 public latestPromptRequestId;
    bytes32 public latestTxRequestId;
    string public latestGeneratedPrompt;
    string public latestTxResult;
    
    // Constants
    uint256 public constant PRICE_DECIMALS = 6;
    uint256 public constant BASIS_POINTS = 10000;
    
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
    event FeesUpdated(uint256 creationFee, uint256 platformFee);
    event FeeRecipientUpdated(address newRecipient);
    event PromptRequested(bytes32 indexed requestId, string basePrompt);
    event PromptGenerated(bytes32 indexed requestId, string generatedPrompt);
    event TxRequested(bytes32 indexed requestId, string txData);
    event TxResultGenerated(bytes32 indexed requestId, string result);
    event TokenPriceUpdated(uint256 indexed tokenId, uint256 newPriceUSD);
    event TokenSupplyIncreased(uint256 indexed tokenId, uint256 additionalSupply);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);
    event EmergencyWithdraw(address indexed recipient, uint256 amount);
    event BatchMint(uint256 indexed tokenId, address indexed buyer, uint256 quantity);


    // Errors
    error InvalidPrice();
    error InvalidPayment();
    error InvalidToken();
    error InsufficientSupply();
    error InvalidFeeConfiguration();
    error InvalidRoyaltyPercentage();
    error TransferFailed();
    error PromptGenerationFailed();
    error NoPromptAvailable();
    error NoTxResultAvailable();
    error TxRequestFailed();
    error RequestPending();
    error OnlyTokenCreator();
    error InvalidSupplyIncrease();
    error BatchMintExceedsSupply();
    error WithdrawalFailed();

    constructor(
        string memory name_,
        string memory symbol_,
        address _priceFeed,
        address _sedaProver,
        bytes32 _promptOracleProgramId,
        bytes32 _txOracleProgramId,
        uint256 _creationFee,
        uint256 _platformFee,
        address _feeRecipient
   ) ERC1155("") Ownable(msg.sender) { 
        _name = name_;
        _symbol = symbol_;
        priceFeed = IPriceFeed(_priceFeed);
        sedaProverContract = SedaProver(_sedaProver);
        promptOracleProgramId = _promptOracleProgramId;
        txOracleProgramId = _txOracleProgramId;
        
        if (_platformFee > 1000) revert InvalidFeeConfiguration(); // Max 10%
        platformFee = _platformFee;
        creationFee = _creationFee;
        feeRecipient = _feeRecipient;
    }

    function createPromptNFT(
        uint256 initialSupply,
        string memory tokenURI,
        uint256 priceUSD,
        uint256 royaltyPercentage
    ) external payable returns (uint256) {
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

    /**
     * @notice Requests prompt generation from SEDA network
     * @param basePrompt The base prompt to use for generation
     * @return requestId The ID of the submitted request
     */
    function requestPromptGeneration(
    string calldata basePrompt
    ) external returns (bytes32) {
        bytes memory promptBytes = abi.encodePacked(basePrompt);
        
        SedaDataTypes.DataRequestInputs memory inputs = SedaDataTypes.DataRequestInputs(
            promptOracleProgramId,     // Program ID
            promptBytes,               // The prompt we want to use, converted to bytes
            promptOracleProgramId,     // Binary ID
            hex"00",                   // Version
            1,                         // Min responses
            hex"00",                   // Max responses threshold
            1,                         // Max gas
            5000000,                   // Gas limit
            abi.encodePacked(block.number)
        );

        latestPromptRequestId = sedaProverContract.postDataRequest(inputs);
        emit PromptRequested(latestPromptRequestId, basePrompt);
        return latestPromptRequestId;
    }

    /**
     * @notice Requests TX data processing from SEDA network
     * @param txData The transaction data to process
     * @return requestId The ID of the submitted request
     */
    function requestTxProcessing(
        string calldata txData
    ) external returns (bytes32) {
        bytes memory txBytes = abi.encodePacked(txData);
        
        SedaDataTypes.DataRequestInputs memory inputs = SedaDataTypes.DataRequestInputs(
            txOracleProgramId,      // Program ID for TX processing
            txBytes,                // The TX data we want to process
            txOracleProgramId,      // Binary ID
            hex"00",                // Version
            1,                      // Min responses
            hex"00",                // Max responses threshold
            1,                      // Max gas
            5000000,                // Gas limit
            abi.encodePacked(block.number)
        );

        latestTxRequestId = sedaProverContract.postDataRequest(inputs);
        emit TxRequested(latestTxRequestId, txData);
        return latestTxRequestId;
    }

    /**
     * @notice Gets the latest TX processing result from SEDA network
     * @return The latest TX processing result string
     */
    function getLatestTxResult() public view returns (string memory) {
        if (latestTxRequestId == bytes32(0)) {
            revert NoTxResultAvailable();
        }
        
        SedaDataTypes.DataResult memory dataResult = sedaProverContract.getDataResult(latestTxRequestId);
        
        if (dataResult.consensus) {
            return string(dataResult.result);
        }
        
        revert TxRequestFailed();
    }

    /**
     * @notice Gets the latest generated prompt from SEDA network
     * @return The latest prompt string
     */
    function getLatestPrompt() public view returns (string memory) {
        // If no request has been made yet
        if (latestPromptRequestId == bytes32(0)) {
            revert NoPromptAvailable();
        }
        
        // Get result from SEDA
        SedaDataTypes.DataResult memory dataResult = sedaProverContract.getDataResult(latestPromptRequestId);
        
        // Check if we have consensus
        if (dataResult.consensus) {
            return string(dataResult.result);
        }
        
        // If no consensus yet, revert
        revert PromptGenerationFailed();
    }

    /**
     * @notice Allows token creator to update the price of their token
     * @param tokenId The ID of the token to update
     * @param newPriceUSD The new price in USD (with PRICE_DECIMALS decimals)
     */
    function updateTokenPrice(uint256 tokenId, uint256 newPriceUSD) external {
        TokenData storage token = _tokens[tokenId];
        if (!token.exists) revert InvalidToken();
        if (token.creator != msg.sender) revert OnlyTokenCreator();
        
        token.priceUSD = newPriceUSD;
        emit TokenPriceUpdated(tokenId, newPriceUSD);
    }

    /**
     * @notice Allows token creator to increase the supply of their token
     * @param tokenId The ID of the token
     * @param additionalSupply Amount to increase the supply by
     */
    function increaseTokenSupply(uint256 tokenId, uint256 additionalSupply) external {
        TokenData storage token = _tokens[tokenId];
        if (!token.exists) revert InvalidToken();
        if (token.creator != msg.sender) revert OnlyTokenCreator();
        if (additionalSupply == 0) revert InvalidSupplyIncrease();

        token.supply += additionalSupply;
        _mint(msg.sender, tokenId, additionalSupply, "");
        
        emit TokenSupplyIncreased(tokenId, additionalSupply);
    }

    /**
     * @notice Allows token creator to update the token's URI
     * @param tokenId The ID of the token
     * @param newURI The new URI for the token
     */
    function updateTokenURI(uint256 tokenId, string memory newURI) external {
        TokenData storage token = _tokens[tokenId];
        if (!token.exists) revert InvalidToken();
        if (token.creator != msg.sender) revert OnlyTokenCreator();
        
        token.tokenURI = newURI;
        emit TokenURIUpdated(tokenId, newURI);
    }

    // Price helper function
    function getEthPrice() public view returns (uint256) {
        uint256 price = uint256(priceFeed.latestAnswer());
        
        // Validate the price is reasonable (greater than 0 and less than $100,000)
        if (price > 0 && price < 100_000_000_000) {  // $100,000 with 6 decimals
            return price;
        }
        
        return 0;
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
        
        uint256 priceUSD = _tokens[tokenId].priceUSD;
        uint256 numerator = priceUSD * 1e18;
        return numerator / ethPrice;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        if (!_tokens[tokenId].exists) revert InvalidToken();
        return _tokens[tokenId].tokenURI;
    }

    /**
     * @notice Pause contract functionality
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract functionality
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update platform fees
     * @param newCreationFee New fee for creating tokens
     * @param newPlatformFee New fee percentage for transactions (in basis points)
     */
    function updateFees(uint256 newCreationFee, uint256 newPlatformFee) external onlyOwner {
        if (newPlatformFee > 1000) revert InvalidFeeConfiguration(); // Max 10%
        
        creationFee = newCreationFee;
        platformFee = newPlatformFee;
        
        emit FeesUpdated(newCreationFee, newPlatformFee);
    }

    /**
     * @notice Update fee recipient address
     * @param newRecipient New address to receive fees
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidFeeConfiguration();
        
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Emergency withdraw function for stuck ETH
     * @param recipient Address to receive the withdrawn ETH
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert WithdrawalFailed();
        
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert WithdrawalFailed();
        
        emit EmergencyWithdraw(recipient, balance);
    }

    /**
     * @notice Check if an address is the creator of a token
     * @param tokenId The ID of the token to check
     * @param account The address to check
     * @return bool True if the address is the token creator
     */
    function isTokenCreator(uint256 tokenId, address account) external view returns (bool) {
        if (!_tokens[tokenId].exists) revert InvalidToken();
        return _tokens[tokenId].creator == account;
    }

    receive() external payable {}
}