import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2, IERC20 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

// USDC addresses for different networks
const USDC_ADDRESSES = {
  arbitrumSepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

task('create-usdc-challenge', 'Creates a new challenge with 1 USDC as prize')
  .addParam('ipfs', 'IPFS URL for the challenge')
  .addOptionalParam('duration', 'Duration in hours', '24')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    try {
      // Load deployed contract address
      const deploymentPath = path.join(
        __dirname,
        `../../ignition/deployments/chain-${hre.network.config.chainId}/deployed_addresses.json`
      );

      if (!fs.existsSync(deploymentPath)) {
        throw new Error(
          `No deployments found for network ${hre.network.name} (chainId: ${hre.network.config.chainId})`
        );
      }

      const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      const contractAddress =
        deployments['ArtemisChallengesModule#ArtemisChallengesV2'];

      if (!contractAddress) {
        throw new Error('ArtemisChallengesV2 address not found in deployments');
      }

      const [signer] = await hre.ethers.getSigners();
      console.log('\n=== Challenge Creation Details ===');
      console.log('Creating challenge as:', signer.address);
      console.log('Using ArtemisChallengesV2 at:', contractAddress);

      const challengesContract = (await hre.ethers.getContractAt(
        'ArtemisChallengesV2',
        contractAddress,
        signer
      )) as ArtemisChallengesV2;

      // Get the correct USDC address for the network
      const networkName = hre.network.name as keyof typeof USDC_ADDRESSES;
      const usdcAddress = USDC_ADDRESSES[networkName];
      
      if (!usdcAddress) {
        throw new Error(
          `No USDC address configured for network ${hre.network.name}. Supported networks: ${Object.keys(
            USDC_ADDRESSES
          ).join(', ')}`
        );
      }

      console.log('USDC Token Address:', usdcAddress);

      const usdc = (await hre.ethers.getContractAt(
        'IERC20',
        usdcAddress,
        signer
      )) as IERC20;

      // Check USDC balance
      const balance = await usdc.balanceOf(signer.address);
      const PRIZE_AMOUNT = 1_000_000n; // 1 USDC (6 decimals)

      console.log('\n=== Current USDC Status ===');
      console.log('Your USDC Balance:', Number(balance) / 1_000_000, 'USDC');
      console.log('Required Amount:', Number(PRIZE_AMOUNT) / 1_000_000, 'USDC');

      if (balance < PRIZE_AMOUNT) {
        throw new Error(
          `Insufficient USDC balance. Need 1 USDC, have ${
            Number(balance) / 1_000_000
          } USDC\n\nTo get test USDC on ${
            hre.network.name
          }, you can:\n1. Visit a faucet\n2. Bridge from another testnet\n3. Purchase from a DEX`
        );
      }

      // Check USDC allowance
      const allowance = await usdc.allowance(signer.address, contractAddress);
      if (allowance < PRIZE_AMOUNT) {
        console.log('\nApproving USDC spend...');
        const approveTx = await usdc.approve(contractAddress, PRIZE_AMOUNT);
        console.log('Approval transaction:', approveTx.hash);
        await approveTx.wait();
        console.log('Approval confirmed');
      }

      const durationInSeconds = Number(taskArgs.duration) * 3600;

      console.log('\n=== Challenge Parameters ===');
      console.log('- IPFS URL:', taskArgs.ipfs);
      console.log('- Duration:', taskArgs.duration, 'hours');
      console.log('- Prize Amount: 1 USDC');

      console.log('\nCreating challenge...');
      const tx = await challengesContract.createChallengeWithUSDC(
        taskArgs.ipfs,
        durationInSeconds,
        PRIZE_AMOUNT
      );

      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();

      const event = receipt?.logs
        .map((log) => {
          try {
            return challengesContract.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
          } catch {
            return null;
          }
        })
        .find((event) => event?.name === 'ChallengeCreated');

      if (event && 'args' in event) {
        console.log('\n=== Challenge Created Successfully! 🎉 ===');
        console.log('Challenge ID:', Number(event.args.challengeId));
        console.log('IPFS URL:', event.args.ipfsUrl);
        console.log('Duration:', Number(event.args.duration) / 3600, 'hours');
        console.log(
          'Prize Amount:',
          Number(event.args.prizeAmount) / 1_000_000,
          'USDC'
        );
        console.log(
          'Prize Type:',
          ['ETH', 'USDC'][Number(event.args.prizeType)]
        );

        console.log('\n=== Next Steps ===');
        console.log('1. Share the IPFS URL with participants');
        console.log('2. Participants can submit solutions using:');
        console.log(
          `   npx hardhat submit-solution --id ${Number(
            event.args.challengeId
          )} --ipfs <solution-hash> --network ${hre.network.name}`
        );
        console.log('3. Vote on submissions using:');
        console.log(
          `   npx hardhat vote --id ${Number(
            event.args.challengeId
          )} --submission <index> --network ${hre.network.name}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error creating challenge:', error.message);

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('Insufficient USDC')) {
          console.error('Make sure you have at least 1 USDC in your wallet');
        } else if (error.message.includes('transfer failed')) {
          console.error(
            'USDC transfer failed. Check your balance and allowance'
          );
        } else if (error.message.includes('could not decode result data')) {
          console.error(
            'Failed to interact with USDC contract. This usually means:\n' +
            '1. The USDC contract address is incorrect\n' +
            '2. The network configuration is wrong\n' +
            '3. The RPC endpoint is not responding correctly'
          );
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });