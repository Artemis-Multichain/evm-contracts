import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTMarketplace } from '../typechain-types';

task(
  'update-eth-price',
  'Updates the ETH price in the marketplace contract'
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  try {
    // Hardcoded contract address - replace with your deployed contract
    const CONTRACT_ADDRESS = '0x81253985a66D3A479d3377f494a77033c078d462';

    // Get signer
    const [signer] = await hre.ethers.getSigners();
    console.log('Updating price as:', signer.address);

    // Get contract instance
    const marketplace = (await hre.ethers.getContractAt(
      'NFTMarketplace',
      CONTRACT_ADDRESS,
      signer
    )) as unknown as NFTMarketplace;

    const oldRequestId = await marketplace.latestDataRequestId();
    console.log('\nCurrent Data Request ID:', oldRequestId);

    // Update the price
    console.log('\nUpdating price...');
    const tx = await marketplace.updatePrice();
    console.log('Transaction submitted:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Parse the PriceUpdated event
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
      .find((event) => event?.name === 'PriceUpdated');

    if (event && 'args' in event) {
      console.log('\nPrice updated successfully! 🎉');
      const timestamp = new Date(Number(event.args.timestamp) * 1000);
      const price = Number(event.args.ethPrice) / 1_000_000;
      console.log('New Price:', price.toFixed(2), 'USD');
      console.log('Updated at:', timestamp.toLocaleString());
    }

    // Get and display new request ID
    const newRequestId = await marketplace.latestDataRequestId();
    console.log('\nNew Data Request ID:', newRequestId);
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Error updating price:', error.message);

      if (error.message.includes('execution reverted')) {
        console.error(
          'Transaction reverted. Check if the contract has proper permissions and is not paused.'
        );
      }
      if (error.message.includes('invalid address')) {
        console.error('Make sure the CONTRACT_ADDRESS is correct!');
      }
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
});
