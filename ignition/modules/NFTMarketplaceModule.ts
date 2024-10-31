// ignition/modules/NFTMarketplaceModule.ts

import { network } from 'hardhat';
import { ethers } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { AutomatedSedaPriceFeedModule } from './AutomatedSedaPriceFeedModule';
import { getSedaConfig } from '../sedaUtils';

const NFTMarketplaceModule = buildModule('NFTMarketplaceModule', (m) => {
  // Import the PriceFeed module
  const { priceFeed } = m.useModule(AutomatedSedaPriceFeedModule);

  // Configuration
  const NAME = 'MyNFTMarketplace';
  const SYMBOL = 'MNFT';
  const CREATION_FEE = ethers.parseEther('0.0001');
  const PLATFORM_FEE = 250; // 2.5%
  const FEE_RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Hardcoded oracle program ID
  const PROMPT_ORACLE_ID =
    '0xa6c74061fc1cce193dcc60ce995c987cdc93416da5bd4fa9e1881ed5b1ca77a6';

  // Get SEDA prover address based on network
  let proverAddress;
  if (network.name !== 'hardhat') {
    const sedaConfig = getSedaConfig(network.name);
    proverAddress = m.getParameter(
      'sedaProverContract',
      sedaConfig.proverAddress
    );
  } else {
    // For local testing, deploy a mock SEDA prover
    const sedaProverMock = m.contract('SedaProverMock', []);
    proverAddress = sedaProverMock;
  }

  // Deploy the NFTMarketplace contract with all required parameters
  const marketplace = m.contract('NFTMarketplace', [
    NAME, // name_
    SYMBOL, // symbol_
    priceFeed, // _priceFeed
    proverAddress, // _sedaProver
    PROMPT_ORACLE_ID, // _promptOracleProgramId
    CREATION_FEE, // _creationFee
    PLATFORM_FEE, // _platformFee
    FEE_RECIPIENT, // _feeRecipient
  ]);

  return { marketplace, priceFeed };
});

export default NFTMarketplaceModule;
