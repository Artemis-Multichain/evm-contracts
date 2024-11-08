import { network } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

// USDC addresses for different networks
const USDC_ADDRESSES = {
  arbitrumSepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const ArtemisChallengesModule = buildModule('ArtemisChallengesModule', (m) => {
  const networkName = network.name as keyof typeof USDC_ADDRESSES;
  const usdcAddress = USDC_ADDRESSES[networkName];

  if (!usdcAddress) {
    throw new Error(
      `No USDC address configured for network ${
        network.name
      }. Supported networks: ${Object.keys(USDC_ADDRESSES).join(', ')}`
    );
  }

  console.log(`Deploying ArtemisChallenges with USDC address: ${usdcAddress}`);
  const artemisChallenge = m.contract('ArtemisChallengesV2', [usdcAddress]);

  return { artemisChallenge };
});

export default ArtemisChallengesModule;
