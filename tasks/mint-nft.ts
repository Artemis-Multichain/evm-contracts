import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTMarketplace } from '../typechain-types';

task('mint-nft', 'Mints an NFT from the marketplace')
  .addParam('tokenId', 'The ID of the NFT to mint')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    try {
      const CONTRACT_ADDRESS = '0x81253985a66D3A479d3377f494a77033c078d462';

      // Get signer
      const [signer] = await hre.ethers.getSigners();
      console.log('Minting as:', signer.address);

      // Get contract instance
      const marketplace = (await hre.ethers.getContractAt(
        'NFTMarketplace',
        CONTRACT_ADDRESS,
        signer
      )) as unknown as NFTMarketplace;

      // Get token data
      const tokenData = await marketplace.getTokenData(taskArgs.tokenId);
      console.log('\nToken Details:');
      console.log('- Token ID:', taskArgs.tokenId);
      console.log('- Creator:', tokenData.creator);
      console.log('- Available Supply:', Number(tokenData.supply));
      console.log('- Price (USD):', Number(tokenData.priceUSD) / 1_000_000, 'USD');
      console.log('- Price (USD Raw):', tokenData.priceUSD.toString());
      console.log('- Royalty:', Number(tokenData.royaltyPercentage) / 100, '%');

      // Get ETH price
      const ethPrice = await marketplace.getEthPrice();
      if (ethPrice.toString() === '0') {
        throw new Error('No valid ETH price available. Run update-eth-price first.');
      }
      
      console.log('\nPrice Debug Info:');
      console.log('Raw ETH Price:', ethPrice.toString());
      console.log('ETH Price in USD:', Number(ethPrice) / 1_000_000);
      
      // Calculate required ETH manually
      const priceUSD = tokenData.priceUSD;
      const calculatedETH = (priceUSD * BigInt(1e18)) / ethPrice;
      
      console.log('\nCalculation Debug:');
      console.log('Price USD * 1e18:', (priceUSD * BigInt(1e18)).toString());
      console.log('Divided by ETH price:', calculatedETH.toString());

      // Get contract's calculation
      const requiredETH = await marketplace.getCurrentPriceETH(taskArgs.tokenId);
      console.log('\nRequired ETH (contract):', hre.ethers.formatEther(requiredETH), 'ETH');
      console.log('Required ETH (calculated):', hre.ethers.formatEther(calculatedETH), 'ETH');

      console.log('\nWould you like to continue with the mint? (Price might be incorrect)');
    //   process.exit(0);
      console.log('Required ETH:', hre.ethers.formatEther(requiredETH), 'ETH');

      console.log('\nMinting NFT...');

      // Mint NFT
      const tx = await marketplace.mint(taskArgs.tokenId, {
        value: requiredETH,
      });

      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Find TokenMinted event
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
        .find((event) => event?.name === 'TokenMinted');

      if (event && 'args' in event) {
        console.log('\nNFT minted successfully! 🎉');
        console.log('- Token ID:', Number(event.args.tokenId));
        console.log('- Buyer:', event.args.buyer);
        console.log('- Creator:', event.args.creator);
        console.log(
          '- Price Paid:',
          hre.ethers.formatEther(event.args.priceETH),
          'ETH'
        );
        console.log(
          '- Platform Fee:',
          hre.ethers.formatEther(event.args.platformFeeAmount),
          'ETH'
        );
        console.log(
          '- Royalty Paid:',
          hre.ethers.formatEther(event.args.royaltyAmount),
          'ETH'
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error minting NFT:', error.message);

        if (error.message.includes('InvalidToken')) {
          console.error('This token ID does not exist!');
        }
        if (error.message.includes('InsufficientSupply')) {
          console.error('This NFT is sold out!');
        }
        if (error.message.includes('InvalidPrice')) {
          console.error(
            'No valid price available. Try running update-eth-price first.'
          );
        }
        if (error.message.includes('InvalidPayment')) {
          console.error('Insufficient ETH sent for minting!');
        }
        if (error.message.includes('insufficient funds')) {
          console.error('Your wallet does not have enough ETH!');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
