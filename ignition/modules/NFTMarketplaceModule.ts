// ignition/modules/NFTMarketplaceModule.ts

import { ethers } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { AutomatedSedaPriceFeedModule } from './AutomatedSedaPriceFeedModule';

const NFTMarketplaceModule = buildModule('NFTMarketplaceModule', (m) => {
  // Import the PriceFeed module
  const { priceFeed } = m.useModule(AutomatedSedaPriceFeedModule);

  // Configuration
  const NAME = 'MyNFTMarketplace';
  const SYMBOL = 'MNFT';
  const CREATION_FEE = ethers.parseEther('0.0001');
  const PLATFORM_FEE = 250; // 2.5%
  const FEE_RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  // Deploy the NFTMarketplace contract using the imported priceFeed
  const marketplace = m.contract('NFTMarketplace', [
    NAME,
    SYMBOL,
    priceFeed, // Use the imported priceFeed contract
    CREATION_FEE,
    PLATFORM_FEE,
    FEE_RECIPIENT,
  ]);

  return { marketplace, priceFeed };
});

export default NFTMarketplaceModule;
