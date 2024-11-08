import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface CompletedChallengeInfo {
  id: number;
  ipfsUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  winner: string;
  prizeAmount: bigint;
  prizeType: 'ETH' | 'USDC';
  totalSubmissions: number;
  winningSubmission?: {
    ipfsHash: string;
    voteCount: number;
  };
}

task(
  'get-completed-challenges',
  'Lists all completed challenges with their details'
)
  .addOptionalParam('limit', 'Number of most recent challenges to show', '10')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
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

      // Get completed challenge IDs
      const completedChallenges =
        await challengesContract.getCompletedChallenges();
      const limit = Math.min(
        Number(taskArgs.limit),
        completedChallenges.length
      );

      console.log(
        '\nFound',
        completedChallenges.length,
        'completed challenges'
      );
      console.log('Showing most recent', limit, 'challenges\n');

      if (completedChallenges.length === 0) {
        console.log('No completed challenges found.');
        return;
      }

      // Sort challenges by most recent first and apply limit
      const recentChallenges = completedChallenges.slice(-limit);

      // Fetch details for each completed challenge
      const challengeDetails: CompletedChallengeInfo[] = await Promise.all(
        recentChallenges.map(async (id) => {
          const [
            ipfsUrl,
            duration,
            startTime,
            isActive,
            winner,
            prizeAmount,
            prizeType,
          ] = await challengesContract.getChallengeDetails(id);

          const totalSubmissions =
            await challengesContract.getNumberOfSubmissions(id);
          const endTime = Number(startTime) + Number(duration);

          // Find winning submission
          let winningSubmission;
          if (totalSubmissions > 0) {
            let highestVotes = 0n;
            let winningIndex = 0;

            for (let i = 0; i < totalSubmissions; i++) {
              const [ipfsHash, submitter, voteCount] =
                await challengesContract.getSubmission(id, i);
              if (submitter === winner) {
                winningSubmission = {
                  ipfsHash,
                  voteCount: Number(voteCount),
                };
                break;
              }
            }
          }

          return {
            id: Number(id),
            ipfsUrl,
            duration: Number(duration),
            startTime: Number(startTime),
            endTime,
            winner,
            prizeAmount,
            prizeType: prizeType === 1n ? 'USDC' : 'ETH',
            totalSubmissions: Number(totalSubmissions),
            winningSubmission,
          };
        })
      );

      // Sort by end time (most recent first)
      const sortedChallenges = challengeDetails.sort(
        (a, b) => b.endTime - a.endTime
      );

      // Display challenge details
      console.log('=== Completed Challenges ===\n');
      sortedChallenges.forEach((challenge) => {
        console.log(`Challenge ID: ${challenge.id}`);
        console.log(`IPFS URL: ${challenge.ipfsUrl}`);
        console.log(
          'Prize Awarded:',
          challenge.prizeType === 'USDC'
            ? `${Number(challenge.prizeAmount) / 1_000_000} USDC`
            : `${hre.ethers.formatEther(challenge.prizeAmount)} ETH`
        );
        console.log('Total Submissions:', challenge.totalSubmissions);
        console.log(
          'Started:',
          new Date(challenge.startTime * 1000).toLocaleString()
        );
        console.log(
          'Completed:',
          new Date(challenge.endTime * 1000).toLocaleString()
        );
        console.log('Duration:', challenge.duration / 3600, 'hours');

        if (challenge.winner === '0x0000000000000000000000000000000000000000') {
          console.log('Status: No winner (possibly no valid submissions)');
        } else {
          console.log('Winner:', challenge.winner);
          if (challenge.winningSubmission) {
            console.log(
              'Winning Solution:',
              challenge.winningSubmission.ipfsHash
            );
            console.log('Vote Count:', challenge.winningSubmission.voteCount);
          }
        }
        console.log('\n---\n');
      });

      // Display analytics
      console.log('=== Challenge Analytics ===');

      // Calculate total prize distribution
      const totalPrizes = sortedChallenges.reduce(
        (acc, challenge) => {
          if (
            challenge.winner !== '0x0000000000000000000000000000000000000000'
          ) {
            if (challenge.prizeType === 'USDC') {
              acc.usdc += challenge.prizeAmount;
            } else {
              acc.eth += challenge.prizeAmount;
            }
          }
          return acc;
        },
        { usdc: 0n, eth: 0n }
      );

      // Calculate average submissions per challenge
      const avgSubmissions =
        sortedChallenges.reduce((sum, c) => sum + c.totalSubmissions, 0) /
        sortedChallenges.length;

      // Find most participated challenge
      const mostParticipated = sortedChallenges.reduce((prev, curr) =>
        prev.totalSubmissions > curr.totalSubmissions ? prev : curr
      );

      console.log('\nTotal Prizes Distributed:');
      if (totalPrizes.eth > 0n) {
        console.log(`- ${hre.ethers.formatEther(totalPrizes.eth)} ETH`);
      }
      if (totalPrizes.usdc > 0n) {
        console.log(`- ${Number(totalPrizes.usdc) / 1_000_000} USDC`);
      }

      console.log(
        `\nAverage Submissions per Challenge: ${avgSubmissions.toFixed(1)}`
      );
      console.log(
        `Most Participated: Challenge #${mostParticipated.id} (${mostParticipated.totalSubmissions} submissions)`
      );

      // List top winners if there are multiple challenges
      if (sortedChallenges.length > 1) {
        const winnerStats = sortedChallenges.reduce((stats, challenge) => {
          if (
            challenge.winner !== '0x0000000000000000000000000000000000000000'
          ) {
            stats[challenge.winner] = (stats[challenge.winner] || 0) + 1;
          }
          return stats;
        }, {} as { [key: string]: number });

        const topWinners = Object.entries(winnerStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);

        if (topWinners.length > 0) {
          console.log('\nTop Winners:');
          topWinners.forEach(([address, wins]) => {
            console.log(
              `${address}: ${wins} challenge${wins > 1 ? 's' : ''} won`
            );
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          '\n❌ Error getting completed challenges:',
          error.message
        );

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
