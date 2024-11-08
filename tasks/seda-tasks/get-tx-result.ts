import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AIPromptMarketplace } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task(
  'get-tx-result',
  'Gets the latest transaction verification result from SEDA network'
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
      deployments['AIPromptMarketplaceModule#AIPromptMarketplace'];

    if (!contractAddress) {
      throw new Error('AIPromptMarketplace address not found in deployments');
    }

    console.log('Using AIPromptMarketplace at:', contractAddress);

    const marketplace = (await hre.ethers.getContractAt(
      'AIPromptMarketplace',
      contractAddress
    )) as unknown as AIPromptMarketplace;

    // Get current request status
    const requestId = await marketplace.latestTxRequestId();
    console.log('\n=== Request Status ===');
    console.log('Latest Request ID:', requestId);

    if (
      requestId ===
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      console.log(
        '\n⚠️ No transaction verification requests have been made yet'
      );
      console.log('\nTo request verification, use:');
      console.log(
        `npx hardhat request-tx --tx-hash <YOUR_TX_HASH> --network ${hre.network.name}`
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
      console.log('\n⏳ Transaction verification result not yet available');
      console.log('Please wait 30-60 seconds and try again');
      return;
    }

    try {
      const txResult = await marketplace.getLatestTxResult();
      console.log('\n=== Transaction Verification Result ===');

      // Try to parse as JSON first
      try {
        const parsedResult = JSON.parse(txResult);
        if (parsedResult.error) {
          console.log('❌ Verification Failed');
          console.log('Error:', parsedResult.error);
        } else {
          console.log('✅ Verification Successful');
          console.log('\nTransaction Details:');
          if (parsedResult.hash) console.log('- Hash:', parsedResult.hash);
          if (parsedResult.chainId)
            console.log('- Chain ID:', parsedResult.chainId);
          if (parsedResult.status !== undefined)
            console.log(
              '- Status:',
              parsedResult.status === 1 ? 'Success' : 'Failed'
            );
          if (parsedResult.blockNumber)
            console.log('- Block Number:', parsedResult.blockNumber);
          if (parsedResult.timestamp)
            console.log(
              '- Timestamp:',
              new Date(parsedResult.timestamp * 1000).toLocaleString()
            );
          if (parsedResult.from) console.log('- From:', parsedResult.from);
          if (parsedResult.to) console.log('- To:', parsedResult.to);
          if (parsedResult.value)
            console.log(
              '- Value:',
              hre.ethers.formatEther(parsedResult.value),
              'ETH'
            );
        }
      } catch {
        // If not JSON, treat as simple string result
        if (txResult.toLowerCase().includes('successful')) {
          console.log('✅ Verification Successful');
          console.log('Result:', txResult);
        } else if (
          txResult.toLowerCase().includes('failed') ||
          txResult.toLowerCase().includes('error')
        ) {
          console.log('❌ Verification Failed');
          console.log('Result:', txResult);
        } else {
          console.log('ℹ️  Verification Result:');
          console.log(txResult);
        }
      }
    } catch (error) {
      const err = error as Error;

      if (err.message.includes('NoTxResultAvailable')) {
        console.log('\n⚠️ No transaction verification result available yet');
        console.log('\nTroubleshooting steps:');
        console.log(
          '1. Ensure you have requested verification using request-tx task'
        );
        console.log('2. Wait 30-60 seconds after requesting');
        console.log('3. Try this command again');
      } else if (err.message.includes('TxRequestFailed')) {
        console.log('\n❌ Transaction verification failed');
        console.log('The SEDA network was unable to verify the transaction');
        console.log('\nTry requesting verification again with:');
        console.log(
          `npx hardhat request-tx --tx-hash <YOUR_TX_HASH> --network ${hre.network.name}`
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error getting transaction result:', error.message);

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
        console.log('2. Check if you have made a verification request');
        console.log('3. Wait 30-60 seconds after request');
        console.log('4. Verify the SEDA prover is accessible');
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
});
