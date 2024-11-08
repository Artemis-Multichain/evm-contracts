import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AutomatedSedaPriceFeed } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task(
  'update-eth-price',
  'Triggers a new ETH price request from SEDA network'
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
      deployments['AutomatedSedaPriceFeedModule#AutomatedSedaPriceFeed'];

    if (!contractAddress) {
      throw new Error(
        'AutomatedSedaPriceFeed address not found in deployments'
      );
    }

    console.log('Using PriceFeed at:', contractAddress);

    const [signer] = await hre.ethers.getSigners();
    console.log('Requesting price update as:', signer.address);

    const priceFeed = (await hre.ethers.getContractAt(
      'AutomatedSedaPriceFeed',
      contractAddress,
      signer
    )) as unknown as AutomatedSedaPriceFeed;

    const oldRequestId = await priceFeed.getLatestRequestId();
    console.log('\nCurrent Request ID:', oldRequestId);

    const lastUpdateTime = await priceFeed.lastUpdateTime();
    const lastUpdate = new Date(Number(lastUpdateTime) * 1000);
    console.log('Last Update:', lastUpdate.toLocaleString());

    const automationEnabled = await priceFeed.automationEnabled();
    const isPaused = await priceFeed.paused();
    console.log('\nContract Status:');
    console.log('- Automation Enabled:', automationEnabled);
    console.log('- Contract Paused:', isPaused);

    console.log('\nSubmitting new price request...');
    const tx = await priceFeed.transmit();
    console.log('Transaction submitted:', tx.hash);

    const receipt = await tx.wait();

    const event = receipt?.logs
      .map((log) => {
        try {
          return priceFeed.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === 'RequestSubmitted');

    if (event && 'args' in event) {
      console.log('\nPrice request submitted successfully! 🎉');
      const timestamp = new Date(Number(event.args.timestamp) * 1000);
      console.log('Request ID:', event.args.requestId);
      console.log('Submitted at:', timestamp.toLocaleString());

      console.log('\nNote: Price update typically takes 30-60 seconds.');
      console.log('Use "get-eth-price" task to check the new price.');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error requesting price update:', error.message);

      if (error.message.includes('No deployments found')) {
        console.error(
          'Please deploy the contracts first using the deployment script'
        );
      } else if (error.message.includes('address not found in deployments')) {
        console.error(
          'The PriceFeed contract was not found in the deployment file'
        );
      } else if (error.message.includes('execution reverted')) {
        console.error(
          'Transaction reverted. Check if the contract is paused or if automation is disabled.'
        );
      } else if (error.message.includes('invalid address')) {
        console.error('Invalid contract address in deployment file');
      } else {
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify contracts are deployed correctly');
        console.log('2. Check if contract is paused or automation is disabled');
        console.log('3. Ensure your wallet has enough ETH for gas');
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
});
