import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface SubmissionInfo {
  index: number;
  ipfsHash: string;
  submitter: string;
  voteCount: number;
  hasVoted?: boolean;
}

interface ChallengeInfo {
  ipfsUrl: string;
  duration: number;
  startTime: number;
  isActive: boolean;
  winner: string;
  prizeAmount: bigint;
  prizeType: 'ETH' | 'USDC';
  endTime: number;
  timeRemaining: number;
}

task(
  'get-challenge-submissions',
  'Lists all submissions for a specific challenge'
)
  .addParam('id', 'Challenge ID to fetch submissions for')
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

      const [signer] = await hre.ethers.getSigners();
      console.log('Connected as:', signer.address);

      const challengesContract = (await hre.ethers.getContractAt(
        'ArtemisChallengesV2',
        contractAddress
      )) as ArtemisChallengesV2;

      // Get challenge details first
      const [
        ipfsUrl,
        duration,
        startTime,
        isActive,
        winner,
        prizeAmount,
        prizeType,
      ] = await challengesContract.getChallengeDetails(taskArgs.id);

      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = Number(startTime) + Number(duration);
      const timeRemaining = endTime - currentTime;

      const challengeInfo: ChallengeInfo = {
        ipfsUrl,
        duration: Number(duration),
        startTime: Number(startTime),
        isActive,
        winner,
        prizeAmount,
        prizeType: prizeType === 1n ? 'USDC' : 'ETH',
        endTime,
        timeRemaining,
      };

      // Get number of submissions
      const submissionCount = await challengesContract.getNumberOfSubmissions(
        taskArgs.id
      );

      console.log('\n=== Challenge Details ===');
      console.log('Challenge ID:', taskArgs.id);
      console.log('IPFS URL:', challengeInfo.ipfsUrl);
      console.log(
        'Prize:',
        challengeInfo.prizeType === 'USDC'
          ? `${Number(challengeInfo.prizeAmount) / 1_000_000} USDC`
          : `${hre.ethers.formatEther(challengeInfo.prizeAmount)} ETH`
      );
      console.log('Status:', challengeInfo.isActive ? 'Active' : 'Completed');
      if (
        !challengeInfo.isActive &&
        challengeInfo.winner !== '0x0000000000000000000000000000000000000000'
      ) {
        console.log('Winner:', challengeInfo.winner);
      }
      console.log('Total Submissions:', submissionCount.toString());

      if (challengeInfo.isActive) {
        const hoursRemaining = Math.floor(challengeInfo.timeRemaining / 3600);
        const minutesRemaining = Math.floor(
          (challengeInfo.timeRemaining % 3600) / 60
        );
        console.log(
          'Time Remaining:',
          `${hoursRemaining}h ${minutesRemaining}m`
        );
      }

      if (Number(submissionCount) === 0) {
        console.log('\nNo submissions yet for this challenge.');
        if (challengeInfo.isActive) {
          console.log('\nTo submit a solution:');
          console.log(
            `npx hardhat submit-solution --id ${taskArgs.id} --ipfs YOUR_SOLUTION_HASH --network ${hre.network.name}`
          );
        }
        return;
      }

      // Fetch all submissions
      const submissions: SubmissionInfo[] = await Promise.all(
        Array.from({ length: Number(submissionCount) }, async (_, index) => {
          const [ipfsHash, submitter, voteCount] =
            await challengesContract.getSubmission(taskArgs.id, index);

          // Check if current user has voted for this submission
          const hasVoted = await challengesContract.hasUserVotedInChallenge(
            taskArgs.id,
            signer.address
          );

          return {
            index,
            ipfsHash,
            submitter,
            voteCount: Number(voteCount),
            hasVoted,
          };
        })
      );

      // Sort submissions by vote count
      const sortedSubmissions = [...submissions].sort(
        (a, b) => b.voteCount - a.voteCount
      );

      console.log('\n=== Submissions ===\n');
      sortedSubmissions.forEach((submission, rank) => {
        console.log(`Rank #${rank + 1}`);
        console.log(`Submission Index: ${submission.index}`);
        console.log(`IPFS Hash: ${submission.ipfsHash}`);
        console.log(`Submitter: ${submission.submitter}`);
        console.log(`Votes: ${submission.voteCount}`);
        if (submission.submitter === signer.address) {
          console.log('⭐ Your submission');
        }
        console.log('---');
      });

      // Display voting status and instructions
      if (challengeInfo.isActive) {
        const hasVoted = await challengesContract.hasUserVotedInChallenge(
          taskArgs.id,
          signer.address
        );

        console.log('\n=== Voting Status ===');
        if (hasVoted) {
          console.log('You have already voted in this challenge');
        } else {
          console.log('You have not voted yet');
          console.log('\nTo vote for a submission:');
          console.log(
            `npx hardhat vote --id ${taskArgs.id} --submission <submission-index> --network ${hre.network.name}`
          );
        }
      }

      // Display some analytics
      console.log('\n=== Submission Analytics ===');
      const uniqueSubmitters = new Set(submissions.map((s) => s.submitter))
        .size;
      console.log('Unique Submitters:', uniqueSubmitters);

      const topSubmission = sortedSubmissions[0];
      if (topSubmission) {
        console.log(
          'Leading Submission:',
          `Index #${topSubmission.index} with ${topSubmission.voteCount} votes`
        );
      }

      const averageVotes =
        submissions.reduce((sum, s) => sum + s.voteCount, 0) /
        submissions.length;
      console.log('Average Votes per Submission:', averageVotes.toFixed(2));
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          '\n❌ Error getting challenge submissions:',
          error.message
        );

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('invalid argument')) {
          console.error('Invalid challenge ID provided');
        } else if (error.message.includes('out of bounds')) {
          console.error('Challenge ID does not exist');
        } else {
          console.log('\nTroubleshooting steps:');
          console.log('1. Verify the challenge ID exists');
          console.log('2. Check if contracts are deployed correctly');
          console.log('3. Verify your network connection');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
