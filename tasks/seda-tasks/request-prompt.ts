import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AIPromptMarketplace } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task('request-prompt', 'Requests a new prompt generation from SEDA network')
  .addParam('prompt', 'The base prompt to use for generation')
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
        deployments['AIPromptMarketplaceModule#AIPromptMarketplace'];

      if (!contractAddress) {
        throw new Error('AIPromptMarketplace address not found in deployments');
      }

      console.log('Using AIPromptMarketplace at:', contractAddress);

      const [signer] = await hre.ethers.getSigners();
      console.log('Requesting prompt as:', signer.address);

      const marketplace = (await hre.ethers.getContractAt(
        'AIPromptMarketplace',
        contractAddress,
        signer
      )) as unknown as AIPromptMarketplace;

      // Check if contract is paused
      const isPaused = await marketplace.paused();
      if (isPaused) {
        throw new Error('Marketplace is currently paused');
      }

      // Get current prompt request ID (if any)
      const currentRequestId = await marketplace.latestPromptRequestId();
      console.log('\nCurrent Request ID:', currentRequestId);

      // Get the latest generated prompt (if any)
      try {
        const latestPrompt = await marketplace.latestGeneratedPrompt();
        if (latestPrompt) {
          console.log('Latest Generated Prompt:', latestPrompt);
        }
      } catch {
        console.log('No previous prompt available');
      }

      console.log('\nSubmitting new prompt request...');
      console.log('Base Prompt:', taskArgs.prompt);

      const tx = await marketplace.requestPromptGeneration(taskArgs.prompt);
      console.log('Transaction submitted:', tx.hash);

      const receipt = await tx.wait();

      // Find PromptRequested event
      const event = receipt?.logs
        .map((log) => {
          try {
            return marketplace.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
          } catch {
            return null;
          }
        })
        .find((event) => event?.name === 'PromptRequested');

      if (event && 'args' in event) {
        console.log('\nPrompt request submitted successfully! 🎉');
        console.log('Request ID:', event.args.requestId);
        console.log('Base Prompt:', event.args.basePrompt);

        console.log('\nNote: Prompt generation typically takes 30-60 seconds.');
        console.log('\nTo check the generated prompt, you can:');
        console.log('1. Call getLatestPrompt() on the contract');
        console.log('2. Watch for the PromptGenerated event');
        console.log('3. Query latestGeneratedPrompt from the contract');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error requesting prompt:', error.message);

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('address not found in deployments')) {
          console.error(
            'The AIPromptMarketplace contract was not found in the deployment file'
          );
        } else if (error.message.includes('execution reverted')) {
          console.error(
            'Transaction reverted. Check if the contract is paused.'
          );
        } else if (error.message.includes('invalid address')) {
          console.error('Invalid contract address in deployment file');
        } else {
          console.log('\nTroubleshooting steps:');
          console.log('1. Verify contracts are deployed correctly');
          console.log('2. Check if contract is paused');
          console.log('3. Ensure your wallet has enough ETH for gas');
          console.log('4. Verify the SEDA prover is accessible');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
