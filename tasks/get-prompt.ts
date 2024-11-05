// tasks/get-prompt.ts

import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AIPromptMarketplace } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task(
  'get-prompt',
  'Gets the latest generated prompt from SEDA network'
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  try {
    const deploymentPath = path.join(
      __dirname,
      `../ignition/deployments/chain-${hre.network.config.chainId}/deployed_addresses.json`
    );

    if (!fs.existsSync(deploymentPath)) {
      throw new Error(
        `No deployments found for network ${hre.network.name} (chainId: ${hre.network.config.chainId})`
      );
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const contractAddress = deployments['AIPromptMarketplaceModule#AIPromptMarketplace'];

    if (!contractAddress) {
      throw new Error('AIPromptMarketplace address not found in deployments');
    }

    console.log('Using AIPromptMarketplace at:', contractAddress);

    const marketplace = (await hre.ethers.getContractAt(
      'AIPromptMarketplace',
      contractAddress
    )) as unknown as AIPromptMarketplace;

    // Get current request status
    const requestId = await marketplace.latestPromptRequestId();
    console.log('\n=== Request Status ===');
    console.log('Latest Request ID:', requestId);

    if (
      requestId ===
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      console.log('\n⚠️ No prompt requests have been made yet');
      console.log('\nTo request a prompt, use:');
      console.log(
        `npx hardhat request-prompt --prompt "Your prompt here" --network ${hre.network.name}`
      );
      return;
    }

    try {
      const sedaProver = await marketplace.sedaProverContract();
      const prover = await hre.ethers.getContractAt('SedaProver', sedaProver);
      const result = await prover.getDataResult(requestId);

      console.log('\n=== SEDA Result Status ===');
      console.log('Consensus Reached:', result.consensus);

      if (!result.consensus) {
        console.log('\n⏳ Oracle consensus not yet reached');
        console.log('Please wait 30-60 seconds and try again');
        return;
      }
    } catch (error) {
      console.log('\n⏳ Prompt data not yet available');
      console.log('Please wait 30-60 seconds and try again');
      return;
    }

    try {
      const prompt = await marketplace.getLatestPrompt();
      console.log('\n=== Generated Prompt ===');
      console.log(prompt);

      const storedPrompt = await marketplace.latestGeneratedPrompt();
      if (storedPrompt !== prompt) {
        console.log('\nStored Latest Prompt:', storedPrompt || '(none)');
      }
    } catch (error) {
      const err = error as Error;

      if (err.message.includes('NoPromptAvailable')) {
        console.log('\n⚠️ No prompt available yet');
        console.log('\nTroubleshooting steps:');
        console.log(
          '1. Ensure you have requested a prompt using request-prompt task'
        );
        console.log('2. Wait 30-60 seconds after requesting');
        console.log('3. Try this command again');
      } else if (err.message.includes('PromptGenerationFailed')) {
        console.log('\n❌ Prompt generation failed');
        console.log('The SEDA network was unable to generate a prompt');
        console.log('\nTry requesting a new prompt with:');
        console.log(
          `npx hardhat request-prompt --prompt "Your prompt here" --network ${hre.network.name}`
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error getting prompt:', error.message);

      if (error.message.includes('No deployments found')) {
        console.error(
          'Please deploy the contracts first using the deployment script'
        );
      } else if (error.message.includes('address not found in deployments')) {
        console.error(
          'The AIPromptMarketplace contract was not found in the deployment file'
        );
      } else if (error.message.includes('invalid address')) {
        console.error('Invalid contract address in deployment file');
      } else {
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify contracts are deployed correctly');
        console.log('2. Check if you have made a prompt request');
        console.log('3. Wait 30-60 seconds after request');
        console.log('4. Verify the SEDA prover is accessible');
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
});
