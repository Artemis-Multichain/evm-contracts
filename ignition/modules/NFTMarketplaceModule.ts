import { network, ethers } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { getOracleProgramId, getSedaConfig } from '../sedaUtils';

const NFTMarketplaceModule = buildModule('NFTMarketplaceModule', (m) => {
  // NFTMarketplace contract parameters
  let proverAddress;
  let oracleProgramId;

  // Configuration
  const NAME = 'MyNFTMarketplace';
  const SYMBOL = 'MNFT';
  const MIN_UPDATE_INTERVAL = 3600; // 1 hour
  const CREATION_FEE = ethers.parseEther('0.0001');
  const PLATFORM_FEE = 250; // 2.5%
  const FEE_RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Fetch network-specific parameters if not on the local hardhat network
  if (network.name !== 'hardhat') {
    // Ensure required parameters are available
    const sedaConfig = getSedaConfig(network.name);
    proverAddress = m.getParameter(
      'sedaProverContract',
      sedaConfig.proverAddress
    );
    // Get oracle program ID from environment variable
    oracleProgramId = getOracleProgramId();
    console.log('Using Oracle Program ID:', oracleProgramId);
  } else {
    // For local deployments, deploy the SedaProverMock contract
    const sedaProverMock = m.contract('SedaProverMock', []);
    proverAddress = sedaProverMock;
    oracleProgramId =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  // Deploy the NFTMarketplace contract with the required parameters
  const marketplace = m.contract('NFTMarketplace', [
    NAME,
    SYMBOL,
    proverAddress,
    oracleProgramId, // Now using the value from environment variables
    MIN_UPDATE_INTERVAL,
    CREATION_FEE,
    PLATFORM_FEE,
    FEE_RECIPIENT,
  ]);

  return { marketplace };
});

export default NFTMarketplaceModule;
