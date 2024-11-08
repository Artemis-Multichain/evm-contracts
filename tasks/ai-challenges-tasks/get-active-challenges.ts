import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface ChallengeInfo {
  id: number;
  ipfsUrl: string;
  duration: number;
  startTime: number;
  isActive: boolean;
  winner: string;
  prizeAmount: bigint;
  prizeType: 'ETH' | 'USDC';
  numSubmissions: number;
  endTime: number;
  timeRemaining: number;
}

task(
  'get-active-challenges',
  'Lists all active challenges with their details'
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  try {
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

    console.log('Using ArtemisChallengesV2 at:', contractAddress);

    const challengesContract = (await hre.ethers.getContractAt(
      'ArtemisChallengesV2',
      contractAddress
    )) as ArtemisChallengesV2;

    // Get active challenge IDs
    const activeChallenges = await challengesContract.getActiveChallenges();
    console.log('\nFound', activeChallenges.length, 'active challenges');

    if (activeChallenges.length === 0) {
      console.log('No active challenges found.');
      return;
    }

    // Fetch details for each active challenge
    const challengeDetails: ChallengeInfo[] = await Promise.all(
      activeChallenges.map(async (id) => {
        const [
          ipfsUrl,
          duration,
          startTime,
          isActive,
          winner,
          prizeAmount,
          prizeType,
        ] = await challengesContract.getChallengeDetails(id);

        const numSubmissions = await challengesContract.getNumberOfSubmissions(
          id
        );
        const currentTime = Math.floor(Date.now() / 1000);
        const endTime = Number(startTime) + Number(duration);
        const timeRemaining = endTime - currentTime;

        return {
          id: Number(id),
          ipfsUrl,
          duration: Number(duration),
          startTime: Number(startTime),
          isActive,
          winner,
          prizeAmount,
          prizeType: prizeType === 1n ? 'USDC' : 'ETH',
          numSubmissions: Number(numSubmissions),
          endTime,
          timeRemaining,
        };
      })
    );

    // Display challenge details
    console.log('\n=== Active Challenges ===\n');
    challengeDetails.forEach((challenge) => {
      console.log(`Challenge ID: ${challenge.id}`);
      console.log(`IPFS URL: ${challenge.ipfsUrl}`);
      console.log(
        'Prize:',
        challenge.prizeType === 'USDC'
          ? `${Number(challenge.prizeAmount) / 1_000_000} USDC`
          : `${hre.ethers.formatEther(challenge.prizeAmount)} ETH`
      );
      console.log(
        'Start Time:',
        new Date(challenge.startTime * 1000).toLocaleString()
      );
      console.log(
        'End Time:',
        new Date(challenge.endTime * 1000).toLocaleString()
      );

      const hoursRemaining = Math.floor(challenge.timeRemaining / 3600);
      const minutesRemaining = Math.floor(
        (challenge.timeRemaining % 3600) / 60
      );
      console.log('Time Remaining:', `${hoursRemaining}h ${minutesRemaining}m`);
      console.log('Current Submissions:', challenge.numSubmissions);

      // Add submission instructions
      console.log('\nTo submit a solution:');
      console.log(
        `npx hardhat submit-solution --id ${challenge.id} --ipfs YOUR_SOLUTION_HASH --network ${hre.network.name}`
      );
      console.log('\n---\n');
    });

    // Sort and display some analytics
    const sortedByEndTime = [...challengeDetails].sort(
      (a, b) => a.endTime - b.endTime
    );
    const sortedBySubmissions = [...challengeDetails].sort(
      (a, b) => b.numSubmissions - a.numSubmissions
    );

    console.log('=== Challenge Analytics ===');
    console.log(
      '\nEnding Soonest:',
      `Challenge #${sortedByEndTime[0].id} (${Math.floor(
        sortedByEndTime[0].timeRemaining / 3600
      )}h ${Math.floor(
        (sortedByEndTime[0].timeRemaining % 3600) / 60
      )}m remaining)`
    );
    console.log(
      'Most Active:',
      `Challenge #${sortedBySubmissions[0].id} (${sortedBySubmissions[0].numSubmissions} submissions)`
    );

    const totalPrizeValue = challengeDetails.reduce(
      (acc, challenge) => {
        if (challenge.prizeType === 'USDC') {
          acc.usdc += challenge.prizeAmount;
        } else {
          acc.eth += challenge.prizeAmount;
        }
        return acc;
      },
      { usdc: 0n, eth: 0n }
    );

    console.log('\nTotal Prize Pool:');
    if (totalPrizeValue.eth > 0n) {
      console.log(`- ${hre.ethers.formatEther(totalPrizeValue.eth)} ETH`);
    }
    if (totalPrizeValue.usdc > 0n) {
      console.log(`- ${Number(totalPrizeValue.usdc) / 1_000_000} USDC`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error getting active challenges:', error.message);

      if (error.message.includes('No deployments found')) {
        console.error(
          'Please deploy the contracts first using the deployment script'
        );
      } else if (error.message.includes('address not found in deployments')) {
        console.error(
          'The ArtemisChallenges contract was not found in the deployment file'
        );
      } else if (error.message.includes('invalid address')) {
        console.error('Invalid contract address in deployment file');
      } else {
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify contracts are deployed correctly');
        console.log('2. Check if you have network connectivity');
        console.log('3. Verify the contract is accessible');
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
});
