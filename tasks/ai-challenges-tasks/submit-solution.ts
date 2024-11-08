import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ArtemisChallengesV2 } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task('submit-solution', 'Submit a solution to a challenge')
  .addParam('id', 'Challenge ID')
  .addParam('ipfs', 'IPFS hash of the solution')
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

      console.log('\n=== Submission Information ===');
      console.log('Submitting as:', signer.address);
      console.log('Contract Address:', contractAddress);
      console.log('Challenge ID:', taskArgs.id);
      console.log('Solution IPFS:', taskArgs.ipfs);

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
        'Prize Amount:',
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

      console.log('\nSubmitting solution...');
      const tx = await challengesContract.submitSolution(
        taskArgs.id,
        taskArgs.ipfs
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
        .find((event) => event?.name === 'SolutionSubmitted');

      if (event && 'args' in event) {
        console.log('\n=== Solution Submitted Successfully! 🎉 ===');
        console.log('Challenge ID:', Number(event.args.challengeId));
        console.log('Submitter:', event.args.submitter);
        console.log('Solution IPFS:', event.args.ipfsHash);

        // Get submission count
        const submissionCount = await challengesContract.getNumberOfSubmissions(
          taskArgs.id
        );
        console.log('\nTotal Submissions:', Number(submissionCount));

        console.log('\nTo vote for solutions:');
        console.log(
          `npx hardhat vote --id ${taskArgs.id} --submission <submission-index> --network ${hre.network.name}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error submitting solution:', error.message);

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('Challenge is not active')) {
          console.error('This challenge has already been completed');
        } else if (error.message.includes('revert')) {
          console.error(
            'Transaction reverted. The challenge might be inactive or completed.'
          );
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
