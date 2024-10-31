import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AutomatedSedaPriceFeed } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task(
  'get-eth-price',
  'Gets the current ETH price from the SEDA oracle'
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  try {
    // Get contract address from deployment file
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
    const CONTRACT_ADDRESS =
      deployments['AutomatedSedaPriceFeedModule#AutomatedSedaPriceFeed'];

    if (!CONTRACT_ADDRESS) {
      throw new Error(
        'AutomatedSedaPriceFeed address not found in deployments'
      );
    }

    console.log('Using PriceFeed at:', CONTRACT_ADDRESS);

    // Get contract instance
    const priceFeed = (await hre.ethers.getContractAt(
      'AutomatedSedaPriceFeed',
      CONTRACT_ADDRESS
    )) as unknown as AutomatedSedaPriceFeed;

    console.log('\n=== Price Update Status ===');
    const requestId = await priceFeed.getLatestRequestId();
    console.log('Latest Request ID:', requestId);

    const lastTimestamp = await priceFeed.lastUpdateTime();
    const lastUpdate = new Date(Number(lastTimestamp) * 1000);
    console.log('Last Price Update:', lastUpdate.toLocaleString());

    const automationLastTimestamp = await priceFeed.lastTimeStamp();
    const lastAutomationUpdate = new Date(
      Number(automationLastTimestamp) * 1000
    );
    console.log(
      'Last Automation Check:',
      lastAutomationUpdate.toLocaleString()
    );

    const timeSinceUpdate =
      Math.floor(Date.now() / 1000) - Number(lastTimestamp);
    console.log('Time Since Update:', timeSinceUpdate, 'seconds');

    // Get automation status
    const automationEnabled = await priceFeed.automationEnabled();
    const isPaused = await priceFeed.paused();
    console.log('\n=== Automation Status ===');
    console.log('Automation Enabled:', automationEnabled);
    console.log('Contract Paused:', isPaused);

    // Try to get the price
    console.log('\n=== Price Information ===');
    try {
      // First try to get the raw data to check consensus
      const proverContract = await priceFeed.sedaProverContract();
      const sedaProver = await hre.ethers.getContractAt(
        'SedaProver',
        proverContract
      );

      try {
        const result = await sedaProver.getDataResult(requestId);
        if (!result.consensus) {
          console.log('\n⏳ Oracle consensus not yet reached');
          console.log('Please wait 30-60 seconds and try again');
          return;
        }
      } catch (error) {
        console.log('\n⏳ Price data not yet available');
        console.log('Please wait 30-60 seconds and try again');
        return;
      }

      // Get the latest price
      const latestPrice = await priceFeed.latestAnswer();

      if (latestPrice.toString() === '0') {
        console.log('\n⚠️ No valid price available yet');
        console.log('\nTroubleshooting steps:');
        console.log('1. Wait longer for oracle consensus (30-60 seconds)');
        console.log('2. Run update-eth-price to request new price');
        console.log('3. Try this command again');
      } else {
        const priceInUSD = Number(latestPrice) / 1_000_000;
        console.log('\nCurrent ETH Price:', priceInUSD.toFixed(2), 'USD');
        console.log('Price Last Updated:', lastUpdate.toLocaleString());
      }
    } catch (error) {
      console.log('\n⚠️ Could not fetch price data');
      console.log('This usually means:');
      console.log('1. Oracle consensus has not been reached yet');
      console.log('2. The price update is still pending');
      console.log('\nPlease wait 30-60 seconds and try again');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error:', error.message);

      if (error.message.includes('No deployments found')) {
        console.error(
          'Please deploy the contracts first using the deployment script'
        );
      } else if (error.message.includes('address not found in deployments')) {
        console.error(
          'The PriceFeed contract was not found in the deployment file'
        );
      } else if (error.message.includes('invalid address')) {
        console.error('Invalid contract address in deployment file');
      } else {
        console.log('\nTroubleshooting steps:');
        console.log('1. Check if you have deployed the contracts');
        console.log('2. Run update-eth-price to request new price');
        console.log('3. Wait 30-60 seconds after update-eth-price');
        console.log('4. Try again after waiting');
      }
    } else {
      console.error('Unknown error occurred');
    }
  }
});
