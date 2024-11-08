import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AIPromptMarketplace } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

interface TxRequestArgs {
  chainId?: string;
  txHash: string;
}

task('request-tx', 'Requests transaction hash verification from SEDA network')
  .addParam('txHash', 'The transaction hash to verify')
  .addOptionalParam('chainId', 'The chain ID for the transaction', '84532')
  .setAction(
    async (taskArgs: TxRequestArgs, hre: HardhatRuntimeEnvironment) => {
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
          throw new Error(
            'AIPromptMarketplace address not found in deployments'
          );
        }

        console.log('Using AIPromptMarketplace at:', contractAddress);

        const [signer] = await hre.ethers.getSigners();
        console.log('Requesting TX verification as:', signer.address);

        const marketplace = (await hre.ethers.getContractAt(
          'AIPromptMarketplace',
          contractAddress,
          signer
        )) as unknown as AIPromptMarketplace;

        const isPaused = await marketplace.paused();
        if (isPaused) {
          throw new Error('Marketplace is currently paused');
        }

        // Format transaction data
        const chainId = taskArgs.chainId || '84532';
        const txData = `${chainId}-${taskArgs.txHash}`;

        const currentRequestId = await marketplace.latestTxRequestId();
        console.log('\nCurrent Request ID:', currentRequestId);

        try {
          const latestResult = await marketplace.latestTxResult();
          if (latestResult) {
            console.log('Latest TX Result:', latestResult);
          }
        } catch {
          console.log('No previous TX result available');
        }

        console.log('\nSubmitting new TX verification request...');
        console.log('Chain ID:', chainId);
        console.log('Transaction Hash:', taskArgs.txHash);
        console.log('Formatted Input:', txData);

        const tx = await marketplace.requestTxProcessing(txData);
        console.log('Transaction submitted:', tx.hash);

        const receipt = await tx.wait();

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
          .find((event) => event?.name === 'TxRequested');

        if (event && 'args' in event) {
          console.log(
            '\nTransaction verification request submitted successfully! 🎉'
          );
          console.log('Request ID:', event.args.requestId);
          console.log('TX Data:', event.args.txData);

          console.log(
            '\nNote: Transaction verification typically takes 30-60 seconds.'
          );
          console.log('\nTo check the verification result, use:');
          console.log(
            `npx hardhat get-tx-result --network ${hre.network.name}`
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            '\n❌ Error requesting TX verification:',
            error.message
          );

          if (error.message.includes('No deployments found')) {
            console.error(
              'Please deploy the contracts first using the deployment script'
            );
          } else if (
            error.message.includes('address not found in deployments')
          ) {
            console.error(
              'The AIPromptMarketplace contract was not found in the deployment file'
            );
          } else if (
            error.message.includes('Marketplace is currently paused')
          ) {
            console.error('The marketplace is paused. Please try again later.');
          } else if (error.message.includes('invalid address')) {
            console.error('Invalid contract address in deployment file');
          } else {
            console.log('\nTroubleshooting steps:');
            console.log('1. Verify contracts are deployed correctly');
            console.log('2. Check if contract is paused');
            console.log('3. Ensure your wallet has enough ETH for gas');
            console.log('4. Verify the SEDA prover is accessible');
            console.log('5. Confirm the transaction hash is valid');
          }
        } else {
          console.error('Unknown error occurred');
        }
        process.exit(1);
      }
    }
  );
