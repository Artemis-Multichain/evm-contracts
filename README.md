## Artemis AI Contracts

## 🔗 Table of Contents

- [📍 Overview](#-overview)
- [👾 Features](#-features)
- [📁 Project Structure](#-project-structure)
  - [📂 Project Index](#-project-index)
- [🚀 Getting Started](#-getting-started)
  - [☑️ Prerequisites](#-prerequisites)
  - [⚙️ Installation](#-installation)
  - [🤖 Usage](#🤖-usage)
  - [🧪 Testing](#🧪-testing)
- [📌 Project Roadmap](#-project-roadmap)
- [🔰 Contributing](#-contributing)
- [🎗 License](#-license)
- [🙌 Acknowledgments](#-acknowledgments)

---

## 📍 Overview

<code>❯ REPLACE-ME</code>

---

## 👾 Features

<code>❯ REPLACE-ME</code>

---

## 📁 Project Structure

```sh
└── evm-contracts/
    ├── LICENSE
    ├── README.md
    ├── cli.txt
    ├── contracts
    │   ├── AIPromptMarketplace.sol
    │   ├── ArtemisChallenges.sol
    │   ├── AutomatedSedaPriceFeed.sol
    │   └── mock
    ├── hardhat.config.ts
    ├── ignition
    │   ├── modules
    │   └── sedaUtils.ts
    ├── package-lock.json
    ├── package.json
    ├── seda.config.ts
    ├── tasks
    │   ├── ai-challenges-tasks
    │   ├── latestAnswer.ts
    │   ├── marketplace-tasks
    │   ├── scope.ts
    │   ├── seda-tasks
    │   ├── transmit.ts
    │   └── utils.ts
    ├── test
    │   └── PriceFeed.ts
    └── tsconfig.json
```


### 📂 Project Index
<details open>
	<summary><b><code>EVM-CONTRACTS/</code></b></summary>
	<details> <!-- __root__ Submodule -->
		<summary><b>__root__</b></summary>
		<blockquote>
			<table>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/cli.txt'>cli.txt</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/package-lock.json'>package-lock.json</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tsconfig.json'>tsconfig.json</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/hardhat.config.ts'>hardhat.config.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/package.json'>package.json</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/seda.config.ts'>seda.config.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			</table>
		</blockquote>
	</details>
	<details> <!-- tasks Submodule -->
		<summary><b>tasks</b></summary>
		<blockquote>
			<table>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/transmit.ts'>transmit.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/utils.ts'>utils.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/latestAnswer.ts'>latestAnswer.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/scope.ts'>scope.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			</table>
			<details>
				<summary><b>marketplace-tasks</b></summary>
				<blockquote>
					<table>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/marketplace-tasks/mint-nft.ts'>mint-nft.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/marketplace-tasks/create-nft.ts'>create-nft.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					</table>
				</blockquote>
			</details>
			<details>
				<summary><b>seda-tasks</b></summary>
				<blockquote>
					<table>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/update-eth-price.ts'>update-eth-price.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/request-tx.ts'>request-tx.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/get-eth-price.ts'>get-eth-price.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/get-prompt.ts'>get-prompt.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/request-prompt.ts'>request-prompt.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/seda-tasks/get-tx-result.ts'>get-tx-result.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					</table>
				</blockquote>
			</details>
			<details>
				<summary><b>ai-challenges-tasks</b></summary>
				<blockquote>
					<table>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/get-active-challenges.ts'>get-active-challenges.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/vote-submission.ts'>vote-submission.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/get-completed-challenges.ts'>get-completed-challenges.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/create-usdc-challenge.ts'>create-usdc-challenge.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/submit-solution.ts'>submit-solution.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/tasks/ai-challenges-tasks/get-challenge-submissions.ts'>get-challenge-submissions.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
	<details> <!-- test Submodule -->
		<summary><b>test</b></summary>
		<blockquote>
			<table>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/test/PriceFeed.ts'>PriceFeed.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			</table>
		</blockquote>
	</details>
	<details> <!-- ignition Submodule -->
		<summary><b>ignition</b></summary>
		<blockquote>
			<table>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/ignition/sedaUtils.ts'>sedaUtils.ts</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			</table>
			<details>
				<summary><b>modules</b></summary>
				<blockquote>
					<table>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/ignition/modules/AIPromptMarketplaceModule.ts'>AIPromptMarketplaceModule.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/ignition/modules/ArtemisChallengesModule.ts'>ArtemisChallengesModule.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/ignition/modules/AutomatedSedaPriceFeedModule.ts'>AutomatedSedaPriceFeedModule.ts</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
	<details> <!-- contracts Submodule -->
		<summary><b>contracts</b></summary>
		<blockquote>
			<table>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/contracts/AIPromptMarketplace.sol'>AIPromptMarketplace.sol</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/contracts/ArtemisChallenges.sol'>ArtemisChallenges.sol</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			<tr>
				<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/contracts/AutomatedSedaPriceFeed.sol'>AutomatedSedaPriceFeed.sol</a></b></td>
				<td><code>❯ REPLACE-ME</code></td>
			</tr>
			</table>
			<details>
				<summary><b>mock</b></summary>
				<blockquote>
					<table>
					<tr>
						<td><b><a href='https://github.com/Artemis-Multichain/evm-contracts/blob/master/contracts/mock/SedaProverMock.sol'>SedaProverMock.sol</a></b></td>
						<td><code>❯ REPLACE-ME</code></td>
					</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
</details>

---
## 🚀 Getting Started

### ☑️ Prerequisites

Before getting started with evm-contracts, ensure your runtime environment meets the following requirements:

- **Programming Language:** TypeScript
- **Package Manager:** Npm


### ⚙️ Installation

Install evm-contracts using one of the following methods:

**Build from source:**

1. Clone the evm-contracts repository:
```sh
❯ git clone https://github.com/Artemis-Multichain/evm-contracts
```

2. Navigate to the project directory:
```sh
❯ cd evm-contracts
```

3. Install the project dependencies:


**Using `npm`** &nbsp; [<img align="center" src="https://img.shields.io/badge/npm-CB3837.svg?style={badge_style}&logo=npm&logoColor=white" />](https://www.npmjs.com/)

```sh
❯ npm install
```




### 🤖 Usage
Run evm-contracts using the following command:
**Using `npm`** &nbsp; [<img align="center" src="https://img.shields.io/badge/npm-CB3837.svg?style={badge_style}&logo=npm&logoColor=white" />](https://www.npmjs.com/)

```sh
❯ npm start
```


### 🧪 Testing
Run the test suite using the following command:
**Using `npm`** &nbsp; [<img align="center" src="https://img.shields.io/badge/npm-CB3837.svg?style={badge_style}&logo=npm&logoColor=white" />](https://www.npmjs.com/)

```sh
❯ npm test
```


