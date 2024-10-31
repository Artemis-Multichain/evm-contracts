// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@seda-protocol/contracts/src/SedaProver.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AutomatedSedaPriceFeed
 * @notice Price feed contract that fetches ETH/USD prices from SEDA network and uses Chainlink Automation for periodic updates
 */
contract AutomatedSedaPriceFeed is AutomationCompatibleInterface, Pausable {
    // State variables
    bytes32 public latestDataRequestId;
    bytes32 public immutable oracleProgramId;
    SedaProver public immutable sedaProverContract;
    
    // Price tracking
    uint256 public lastUpdatedTimestamp;
    uint256 public latestPrice;
    
    // Automation configuration
    uint256 public minUpdateInterval;
    uint256 public lastTimeStamp;
    bool public automationEnabled;
    
    // Events
    event PriceUpdated(bytes32 indexed requestId, uint256 price, uint256 timestamp);
    event RequestSubmitted(bytes32 indexed requestId, uint256 timestamp);
    event AutomationConfigUpdated(uint256 interval, bool enabled);
    
    // Errors
    error InvalidPrice();
    error RequestPending();
    error NoPriceAvailable();
    error InvalidInterval();

    constructor(
        address _sedaProverContract,
        bytes32 _oracleProgramId,
        uint256 _minUpdateInterval
    ) {
        sedaProverContract = SedaProver(_sedaProverContract);
        oracleProgramId = _oracleProgramId;
        
        if (_minUpdateInterval == 0) revert InvalidInterval();
        minUpdateInterval = _minUpdateInterval;
        
        lastTimeStamp = block.timestamp;
        lastUpdatedTimestamp = block.timestamp;
        automationEnabled = true;
    }

    /**
     * @notice Chainlink Automation check function
     * @return upkeepNeeded Boolean indicating if upkeep is needed
     * @return performData Bytes data to be used in performUpkeep (unused)
     */
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

    /**
     * @notice Chainlink Automation perform function - triggers price update
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        if ((block.timestamp - lastTimeStamp) >= minUpdateInterval) {
            lastTimeStamp = block.timestamp;
            transmit();
        }
    }

    /**
     * @notice Submits a new price update request to SEDA network
     * @return requestId The ID of the submitted request
     */
    function transmit() public returns (bytes32) {
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
        emit RequestSubmitted(latestDataRequestId, block.timestamp);
        
        // Try to update price immediately if result is available
        // _updatePrice();
        
        return latestDataRequestId;
    }
    

    /**
     * @notice Gets the latest price from SEDA network
     * @return price The latest ETH/USD price with 6 decimals
     */
    function latestAnswer() public view returns (uint128) {
        if (latestPrice > 0) {
            return uint128(latestPrice);
        }
        
        // If no cached price, try to get latest from SEDA
        if (latestDataRequestId == bytes32(0)) {
            return 0;
        }
        
        SedaDataTypes.DataResult memory dataResult = sedaProverContract.getDataResult(latestDataRequestId);
        
        if (dataResult.consensus) {
            string memory priceStr = string(dataResult.result);
            uint256 price = stringToUint(priceStr);
            
            // Validate price is reasonable
            if (price > 0 && price < 100_000_000_000) { // $100,000 with 6 decimals
                return uint128(price);
            }
        }
        
        return 0;
    }

    /**
     * @notice Internal function to update price from SEDA
     */
    function _updatePrice() internal {
        if (latestDataRequestId == bytes32(0)) {
            return;
        }

        SedaDataTypes.DataResult memory dataResult = sedaProverContract.getDataResult(latestDataRequestId);
        
        if (dataResult.consensus) {
            string memory priceStr = string(dataResult.result);
            uint256 newPrice = stringToUint(priceStr);
            
            // Validate price is reasonable
            if (newPrice > 0 && newPrice < 100_000_000_000) { // $100,000 with 6 decimals
                latestPrice = newPrice;
                lastUpdatedTimestamp = block.timestamp;
                emit PriceUpdated(latestDataRequestId, newPrice, block.timestamp);
            }
        }
    }

    /**
     * @notice Converts a string to uint
     * @param s The string to convert
     * @return The converted uint value
     */
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

    // Admin functions

    /**
     * @notice Updates the minimum interval between price updates
     * @param newInterval New minimum interval in seconds
     */
    function setMinUpdateInterval(uint256 newInterval) external {
        if (newInterval == 0) revert InvalidInterval();
        minUpdateInterval = newInterval;
        emit AutomationConfigUpdated(newInterval, automationEnabled);
    }

    /**
     * @notice Enables or disables Chainlink Automation
     * @param enabled Whether automation should be enabled
     */
    function setAutomationEnabled(bool enabled) external {
        automationEnabled = enabled;
        emit AutomationConfigUpdated(minUpdateInterval, enabled);
    }


    function pause() external {
        _pause();
    }

    function unpause() external {
        _unpause();
    }

    // View functions

    /**
     * @notice Gets the timestamp of the latest price update
     * @return The timestamp of the last price update
     */
    function lastUpdateTime() external view returns (uint256) {
        return lastUpdatedTimestamp;
    }

    /**
     * @notice Gets the latest request ID
     * @return The ID of the latest SEDA request
     */
    function getLatestRequestId() external view returns (bytes32) {
        return latestDataRequestId;
    }
}