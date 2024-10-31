import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTMarketplace } from '../typechain-types';

task(
  'get-eth-price',
  'Gets the current ETH price from the marketplace contract'
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  try {
    const CONTRACT_ADDRESS = '0x81253985a66D3A479d3377f494a77033c078d462';

    // Get contract instance
    const marketplace = (await hre.ethers.getContractAt(
      'NFTMarketplace',
      CONTRACT_ADDRESS
    )) as unknown as NFTMarketplace;

    console.log('\n=== Price Update Status ===');
    const requestId = await marketplace.latestDataRequestId();
    console.log('Latest Request ID:', requestId);

    const lastTimestamp = await marketplace.lastTimeStamp();
    const lastUpdate = new Date(Number(lastTimestamp) * 1000);
    console.log('Last Update Request:', lastUpdate.toLocaleString());

    const timeSinceUpdate =
      Math.floor(Date.now() / 1000) - Number(lastTimestamp);
    console.log('Time Since Request:', timeSinceUpdate, 'seconds');

    // Try to get the price, handling potential errors gracefully
    console.log('\n=== Price Information ===');
    try {
      // First try to get the raw data to check consensus
      const proverContract = await marketplace.sedaProverContract();
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
        // If we can't get the result, it likely means the data isn't available yet
        console.log('\n⏳ Price data not yet available');
        console.log('Please wait 30-60 seconds and try again');
        return;
      }

      // If we get here, try to get the formatted price
      const ethPrice = await marketplace.getEthPrice();

      if (ethPrice.toString() === '0') {
        console.log('\n⚠️ No valid price available yet');
        console.log('\nTroubleshooting steps:');
        console.log('1. Wait longer for oracle consensus (30-60 seconds)');
        console.log('2. Run update-eth-price again if needed');
        console.log('3. Try this command again');
      } else {
        const priceInUSD = Number(ethPrice) / 1_000_000;
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

      if (error.message.includes('invalid address')) {
        console.error('Make sure the CONTRACT_ADDRESS is correct!');
      } else {
        console.log('\nTroubleshooting steps:');
        console.log('1. Check if you have run update-eth-price');
        console.log('2. Wait 30-60 seconds after update-eth-price');
        console.log('3. Verify the contract address is correct');
        console.log('4. Try again after waiting');
      }
    } else {
      console.error('Unknown error occurred');
    }
  }
});
