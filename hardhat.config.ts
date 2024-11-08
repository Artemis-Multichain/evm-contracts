import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

// Tasks
import './tasks/transmit';
import './tasks/latestAnswer';
import './tasks/marketplace-tasks/create-nft';
import './tasks/seda-tasks/update-eth-price';
import './tasks/seda-tasks/get-eth-price';
import './tasks/marketplace-tasks/mint-nft';
import './tasks/seda-tasks/request-prompt';
import './tasks/seda-tasks/get-prompt';
import './tasks/seda-tasks/request-tx';
import './tasks/seda-tasks/get-tx-result';
import './tasks/ai-challenges-tasks/create-usdc-challenge';
import './tasks/ai-challenges-tasks/submit-solution';
import './tasks/ai-challenges-tasks/vote-submission';
import './tasks/ai-challenges-tasks/get-active-challenges';
import './tasks/ai-challenges-tasks/get-completed-challenges';
import './tasks/ai-challenges-tasks/get-challenge-submissions';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.8.25',
  networks: {
    arbitrum: {
      accounts: [process.env.EVM_PRIVATE_KEY || ''],
      url: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
    },
    base: {
      accounts: [process.env.EVM_PRIVATE_KEY || ''],
      url: 'https://mainnet.base.org',
      chainId: 8453,
    },
    baseSepolia: {
      accounts: [process.env.EVM_PRIVATE_KEY || ''],
      url: 'https://sepolia.base.org',
      chainId: 84532,
    },
    arbitrumSepolia: {
      accounts: [process.env.EVM_PRIVATE_KEY || ''],
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614,
    },
  },
  etherscan: {
    apiKey: {
      arbitrum: process.env.ARBITRUM_ETHERSCAN_API_KEY || '',
      base: process.env.BASE_ETHERSCAN_API_KEY || '',
      baseSepolia: process.env.BASE_SEPOLIA_ETHERSCAN_API_KEY || '',
      arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_ETHERSCAN_API_KEY || '',
    },
    customChains: [
      {
        chainId: 42161,
        network: 'arbitrum',
        urls: {
          apiURL: 'https://api.arbiscan.io/api',
          browserURL: 'https://arbiscan.io',
        },
      },
      {
        chainId: 8453,
        network: 'base',
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        chainId: 84532,
        network: 'baseSepolia',
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        chainId: 421614,
        network: 'arbitrumSepolia',
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
    ],
  },
};

export default config;
