<p align="center">
  <img src="https://github.com/user-attachments/assets/82786249-35d9-4219-9438-aa9a74285058" alt="Artemis AI Banner" />
</p>
<h1 align="center">
  Artemis AI Smart Contracts
</h1>

## 📝 Overview

The Artemis AI Smart Contracts project is a suite of Solidity contracts that power an AI-driven marketplace and challenge platform on EVM-compatible blockchains. Built using Hardhat and integrating with the SEDA protocol, this project enables:

- Creation and trading of AI-generated prompt NFTs
- Community-driven AI challenges with prize pools
- Real-time ETH price feeds using SEDA oracles
- Cross-chain transaction verification

## 🌟 Key Features

### AI Prompt Marketplace (AIPromptMarketplace.sol)
- Create and mint ERC1155 tokens representing AI prompts
- Dynamic pricing in USD using SEDA price feeds
- Configurable royalties and platform fees
- Real-time prompt generation via **SEDA** network
- Transaction verification and validation via **SEDA** network

### AI Challenges Platform (ArtemisChallenges.sol)
- Create challenges with ETH or USDC prize pools
- Submit solutions with IPFS integration
- Community voting system for solutions
- Automated prize distribution
- Chainlink Automation integration

### Price Feed Oracle (AutomatedSedaPriceFeed.sol)
- Real-time ETH/USD price updates
- **SEDA** network integration
- Automated updates via Chainlink
- Configurable update intervals
- Price validation and safety checks

## 📦 Project Structure

```
├── contracts/                 # Smart contracts
│   ├── AIPromptMarketplace.sol   # AI prompt marketplace contract
│   ├── ArtemisChallenges.sol     # Challenges platform
│   ├── AutomatedSedaPriceFeed.sol # Price oracle
│   └── mock/                     # Mock contracts for testing
├── ignition/                 # Deployment modules
│   └── modules/              # Contract deployment configurations
├── tasks/                    # Hardhat tasks
│   ├── ai-challenges-tasks/  # Challenge-related tasks
│   ├── marketplace-tasks/    # NFT marketplace tasks
│   └── seda-tasks/          # SEDA integration tasks
└── test/                    # Contract tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js v20 or higher
- NPM v8 or higher
- An EVM wallet with testnet tokens
- API keys for block explorers (optional, for verification)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Artemis-Multichain/evm-contracts.git
cd evm-contracts
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```
ORACLE_PROGRAM_ID=YOUR_ORACLE_PROGRAM_ID
EVM_PRIVATE_KEY=YOUR_EVM_PRIVATE_KEY
BASE_SEPOLIA_ETHERSCAN_API_KEY=YOUR_BASESCAN_API_KEY
ARBITRUM_SEPOLIA_ETHERSCAN_API_KEY=YOUR_ARBITRUM_API_KEY
```

### Deployment

Deploy contracts using Hardhat Ignition:

```bash
# Deploy AI Prompt Marketplace
npx hardhat ignition deploy ./ignition/modules/AIPromptMarketplaceModule.ts --network baseSepolia --verify

# Deploy AI Challenges
npx hardhat ignition deploy ./ignition/modules/ArtemisChallengesModule.ts --network baseSepolia --verify
```

## 💫 Usage

### AI Prompt Marketplace

Create and mint NFTs:
```bash
# Create a new NFT
npx hardhat create-nft --network baseSepolia \
  --uri ipfs://YourIPFSHash \
  --supply 500 \
  --price 5000000 \
  --royalty 500

# Mint an existing NFT
npx hardhat mint-nft --network baseSepolia --token-id 1
```

Generate prompts:
```bash
# Request prompt generation
npx hardhat request-prompt --prompt "your prompt here" --network baseSepolia

# Get generated prompt
npx hardhat get-prompt --network baseSepolia
```

### AI Challenges

Create and participate in challenges:
```bash
# Create a USDC challenge
npx hardhat create-usdc-challenge --ipfs ipfs://YourIPFSHash --network baseSepolia

# Submit a solution
npx hardhat submit-solution --id 0 --ipfs ipfs://YourSolutionHash --network baseSepolia

# Vote on submissions
npx hardhat vote --id 0 --submission 0 --network baseSepolia
```

View challenge information:
```bash
# List active challenges
npx hardhat get-active-challenges --network baseSepolia

# View challenge submissions
npx hardhat get-challenge-submissions --id 0 --network baseSepolia

# List completed challenges
npx hardhat get-completed-challenges --network baseSepolia
```

### Price Feed

Manage ETH price updates:
```bash
# Update ETH price
npx hardhat update-eth-price --network baseSepolia

# Get current price
npx hardhat get-eth-price --network baseSepolia
```

## 🔧 Testing

Run the test suite:
```bash
npx hardhat test
```

## 🌐 Supported Networks

- Base Sepolia Testnet (Chain ID: 84532)
- Arbitrum Sepolia Testnet (Chain ID: 421614)
- Base Mainnet (Chain ID: 8453)
- Arbitrum One (Chain ID: 42161)

## 🙏 Acknowledgments

- [SEDA Protocol](https://seda.xyz/) for oracle infrastructure
- [OpenZeppelin](https://openzeppelin.com/) for secure contract implementations
- [Chainlink](https://chain.link/) for automation capabilities
