import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTMarketplace } from '../typechain-types';

task('create-nft', 'Creates a new NFT in the marketplace').setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    try {
      // Hardcoded values for testing
      const CONTRACT_ADDRESS = '0x81253985a66D3A479d3377f494a77033c078d462';
      const SUPPLY = 100;
      const URI = 'ipfs://QmXJN8ECeHgWJwKSwNrNhx7ZvxqCpZNjS1KQQ76MyCBKrN'; // Example IPFS URI
      const PRICE_USD = 1_000_000; // $1 with 6 decimals
      const ROYALTY = 250; // 2.5%

      // Get signer
      const [signer] = await hre.ethers.getSigners();
      console.log('Creating NFT from address:', signer.address);

      // Get contract instance
      const marketplace = (await hre.ethers.getContractAt(
        'NFTMarketplace',
        CONTRACT_ADDRESS,
        signer
      )) as unknown as NFTMarketplace;

      // Get creation fee
      const creationFee = await marketplace.creationFee();

      console.log('\nCreating NFT with parameters:');
      console.log('- Supply:', SUPPLY);
      console.log('- URI:', URI);
      console.log('- Price (USD):', PRICE_USD / 1_000_000, 'USD');
      console.log('- Royalty:', ROYALTY / 100, '%');
      console.log(
        '- Creation Fee:',
        hre.ethers.formatEther(creationFee),
        'ETH'
      );

      // Create NFT
      const tx = await marketplace.createNFT(SUPPLY, URI, PRICE_USD, ROYALTY, {
        value: creationFee,
      });

      console.log('\nTransaction submitted:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find TokenCreated event
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
        .find((event) => event?.name === 'TokenCreated');

      if (event && 'args' in event) {
        console.log('\nNFT created successfully! 🎉');
        console.log('- Token ID:', Number(event.args.tokenId));
        console.log('- Creator:', event.args.creator);
        console.log('- Supply:', Number(event.args.supply));
        console.log(
          '- Price (USD):',
          Number(event.args.priceUSD) / 1_000_000,
          'USD'
        );
        console.log(
          '- Royalty:',
          Number(event.args.royaltyPercentage) / 100,
          '%'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error creating NFT:', error.message);

        if (error.message.includes('invalid address')) {
          console.error(
            'Make sure to update the CONTRACT_ADDRESS in the task with your deployed contract address!'
          );
        }
        if (error.message.includes('insufficient funds')) {
          console.error(
            'Make sure your account has enough ETH to pay the creation fee!'
          );
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  }
);
