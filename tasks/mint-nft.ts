import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTMarketplace } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task('mint-nft', 'Mints an NFT from the marketplace')
  .addParam('tokenId', 'The ID of the NFT to mint')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
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
      const contractAddress =
        deployments['NFTMarketplaceModule#NFTMarketplace'];

      if (!contractAddress) {
        throw new Error('NFTMarketplace address not found in deployments');
      }

      const [signer] = await hre.ethers.getSigners();
      console.log('Minting as:', signer.address);
      console.log('Using NFTMarketplace at:', contractAddress);

      const marketplace = (await hre.ethers.getContractAt(
        'NFTMarketplace',
        contractAddress,
        signer
      )) as unknown as NFTMarketplace;

      const isPaused = await marketplace.paused();
      if (isPaused) {
        throw new Error('Marketplace is currently paused');
      }

      const tokenData = await marketplace.getTokenData(taskArgs.tokenId);
      console.log('\n=== Token Details ===');
      console.log('- Token ID:', taskArgs.tokenId);
      console.log('- Creator:', tokenData.creator);
      console.log('- Available Supply:', Number(tokenData.supply));
      console.log(
        '- Price (USD):',
        Number(tokenData.priceUSD) / 1_000_000,
        'USD'
      );
      console.log('- Royalty:', Number(tokenData.royaltyPercentage) / 100, '%');

      // Get ETH price and validate
      const ethPrice = await marketplace.getEthPrice();
      if (ethPrice.toString() === '0') {
        console.log('\n⚠️ No valid ETH price available');
        console.log('Running update-eth-price task...');

        const priceFeedAddress =
          deployments['AutomatedSedaPriceFeedModule#AutomatedSedaPriceFeed'];
        if (!priceFeedAddress) {
          throw new Error('PriceFeed address not found in deployments');
        }

        const priceFeed = await hre.ethers.getContractAt(
          'AutomatedSedaPriceFeed',
          priceFeedAddress
        );
        const tx = await priceFeed.transmit();
        console.log('Price update requested:', tx.hash);
        await tx.wait();
        console.log('Please wait 30-60 seconds and try minting again');
        return;
      }

      console.log('\n=== Price Information ===');
      console.log('Current ETH Price:', Number(ethPrice) / 1_000_000, 'USD');

      const requiredETH = await marketplace.getCurrentPriceETH(
        taskArgs.tokenId
      );
      console.log(
        '\nRequired Payment:',
        hre.ethers.formatEther(requiredETH),
        'ETH'
      );

      const balance = await hre.ethers.provider.getBalance(signer.address);
      if (balance < requiredETH) {
        throw new Error(
          `Insufficient ETH balance. Need ${hre.ethers.formatEther(
            requiredETH
          )} ETH`
        );
      }

      const platformFee = await marketplace.platformFee();
      const platformFeeAmount =
        (requiredETH * BigInt(platformFee)) / BigInt(10000);
      const royaltyAmount =
        (requiredETH * BigInt(tokenData.royaltyPercentage)) / BigInt(10000);

      console.log('\n=== Fee Breakdown ===');
      console.log(
        '- Platform Fee:',
        hre.ethers.formatEther(platformFeeAmount),
        'ETH'
      );
      console.log('- Royalty:', hre.ethers.formatEther(royaltyAmount), 'ETH');
      console.log(
        '- To Creator:',
        hre.ethers.formatEther(requiredETH - platformFeeAmount - royaltyAmount),
        'ETH'
      );

      console.log('\nMinting NFT...');

      const tx = await marketplace.mint(taskArgs.tokenId, {
        value: requiredETH,
      });

      console.log('Transaction submitted:', tx.hash);

      console.log('Waiting for confirmation...');
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

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('InvalidToken')) {
          console.error('This token ID does not exist!');
        } else if (error.message.includes('InsufficientSupply')) {
          console.error('This NFT is sold out!');
        } else if (error.message.includes('InvalidPrice')) {
          console.error('No valid price available. Please wait and try again.');
        } else if (error.message.includes('InvalidPayment')) {
          console.error('Insufficient ETH sent for minting!');
        } else if (error.message.includes('insufficient funds')) {
          console.error('Your wallet does not have enough ETH!');
        } else if (error.message.includes('Marketplace is currently paused')) {
          console.error('The marketplace is paused. Please try again later.');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
