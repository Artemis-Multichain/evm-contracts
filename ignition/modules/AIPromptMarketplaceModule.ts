import { network } from 'hardhat';
import { ethers } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { AutomatedSedaPriceFeedModule } from './AutomatedSedaPriceFeedModule';
import { getSedaConfig } from '../sedaUtils';

const AIPromptMarketplaceModule = buildModule(
  'AIPromptMarketplaceModule',
  (m) => {
    const { priceFeed } = m.useModule(AutomatedSedaPriceFeedModule);

    const NAME = 'MyNFTMarketplace';
    const SYMBOL = 'MNFT';
    const CREATION_FEE = ethers.parseEther('0.0001');
    const PLATFORM_FEE = 250; // 2.5%
    const FEE_RECIPIENT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    const PROMPT_ORACLE_ID = process.env.PROMPT_ORACLE_ID || '0x';

    let proverAddress;
    if (network.name !== 'hardhat') {
      const sedaConfig = getSedaConfig(network.name);
      proverAddress = m.getParameter(
        'sedaProverContract',
        sedaConfig.proverAddress
      );
    } else {
      const sedaProverMock = m.contract('SedaProverMock', []);
      proverAddress = sedaProverMock;
    }

    const marketplace = m.contract('AIPromptMarketplace', [
      NAME,
      SYMBOL,
      priceFeed,
      proverAddress,
      PROMPT_ORACLE_ID,
      CREATION_FEE,
      PLATFORM_FEE,
      FEE_RECIPIENT,
    ]);

    return { marketplace, priceFeed };
  }
);

export default AIPromptMarketplaceModule;
