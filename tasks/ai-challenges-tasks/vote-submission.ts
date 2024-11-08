import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task('vote', 'Vote for a challenge submission')
  .addParam('id', 'Challenge ID')
  .addParam('submission', 'Submission index to vote for')
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

      const [signer] = await hre.ethers.getSigners();

      console.log('\n=== Vote Information ===');
      console.log('Voting as:', signer.address);
      console.log('Contract:', contractAddress);
      console.log('Challenge ID:', taskArgs.id);
      console.log('Submission Index:', taskArgs.submission);

      const challengesContract = (await hre.ethers.getContractAt(
        'ArtemisChallengesV2',
        contractAddress,
        signer
      )) as ArtemisChallengesV2;

      // Get challenge details
      const [
        ipfsUrl,
        duration,
        startTime,
        isActive,
        winner,
        prizeAmount,
        prizeType,
      ] = await challengesContract.getChallengeDetails(taskArgs.id);

      console.log('\n=== Challenge Details ===');
      console.log('Challenge URL:', ipfsUrl);
      console.log('Duration:', Number(duration) / 3600, 'hours');
      console.log(
        'Start Time:',
        new Date(Number(startTime) * 1000).toLocaleString()
      );
      console.log('Active:', isActive);
      console.log(
        'Winner:',
        winner === '0x0000000000000000000000000000000000000000'
          ? 'Not yet determined'
          : winner
      );
      console.log(
        'Prize:',
        prizeType === 1n
          ? `${Number(prizeAmount) / 1_000_000} USDC`
          : `${hre.ethers.formatEther(prizeAmount)} ETH`
      );

      if (!isActive) {
        throw new Error('Challenge is no longer active');
      }

      const endTime = Number(startTime) + Number(duration);
      if (Math.floor(Date.now() / 1000) >= endTime) {
        throw new Error(
          'Challenge has ended. End time: ' +
            new Date(endTime * 1000).toLocaleString()
        );
      }

      // Check if user has already voted
      const hasVoted = await challengesContract.hasUserVotedInChallenge(
        taskArgs.id,
        signer.address
      );
      if (hasVoted) {
        throw new Error('You have already voted for this challenge');
      }

      // Get submission details
      const [ipfsHash, submitter, voteCount] =
        await challengesContract.getSubmission(
          taskArgs.id,
          taskArgs.submission
        );

      console.log('\n=== Submission Details ===');
      console.log('IPFS Hash:', ipfsHash);
      console.log('Submitter:', submitter);
      console.log('Current Votes:', Number(voteCount));

      console.log('\nSubmitting vote...');
      const tx = await challengesContract.voteForSolution(
        taskArgs.id,
        taskArgs.submission
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
        .find((event) => event?.name === 'Voted');

      if (event && 'args' in event) {
        // Get updated submission details
        const [_, __, newVoteCount] = await challengesContract.getSubmission(
          taskArgs.id,
          taskArgs.submission
        );

        console.log('\n=== Vote Submitted Successfully! 🎉 ===');
        console.log('Challenge ID:', Number(event.args.challengeId));
        console.log('Voter:', event.args.voter);
        console.log('Submission Index:', Number(event.args.submissionIndex));
        console.log('New Vote Count:', Number(newVoteCount));

        // Time remaining calculation
        const timeRemaining = endTime - Math.floor(Date.now() / 1000);
        const hoursRemaining = Math.floor(timeRemaining / 3600);
        const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

        console.log(
          '\nChallenge ends in:',
          hoursRemaining,
          'hours,',
          minutesRemaining,
          'minutes'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error voting:', error.message);

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('Already voted')) {
          console.error('You have already voted for this challenge');
        } else if (error.message.includes('Invalid submission index')) {
          console.error('This submission index does not exist');
        } else if (error.message.includes('Challenge is not active')) {
          console.error('This challenge is no longer active');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });