import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AIPromptMarketplace } from '../../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

task('create-nft', 'Creates a new NFT in the marketplace')
  .addParam('supply', 'Initial supply of tokens', '100')
  .addParam('uri', 'IPFS URI for the token metadata')
  .addOptionalParam('price', 'Price in USD (with 6 decimals)', '1000000') // $1 default
  .addOptionalParam('royalty', 'Royalty percentage (in basis points)', '250') // 2.5% default
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
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

      const SUPPLY = parseInt(taskArgs.supply);
      const URI = taskArgs.uri;
      const PRICE_USD = BigInt(taskArgs.price);
      const ROYALTY = parseInt(taskArgs.royalty);

      if (SUPPLY <= 0) throw new Error('Supply must be greater than 0');
      if (PRICE_USD <= 0) throw new Error('Price must be greater than 0');
      if (ROYALTY < 0 || ROYALTY > 2000)
        throw new Error('Royalty must be between 0 and 20%');

      const [signer] = await hre.ethers.getSigners();
      console.log('Creating NFT from address:', signer.address);
      console.log('Using AIPromptMarketplace at:', contractAddress);

      const marketplace = (await hre.ethers.getContractAt(
        'AIPromptMarketplace',
        contractAddress,
        signer
      )) as unknown as AIPromptMarketplace;

      // Get creation fee and check if paused
      const [creationFee, isPaused] = await Promise.all([
        marketplace.creationFee(),
        marketplace.paused(),
      ]);

      if (isPaused) {
        throw new Error('Marketplace is currently paused');
      }

      // Check if signer has enough ETH for creation fee
      const balance = await hre.ethers.provider.getBalance(signer.address);
      if (balance < creationFee) {
        throw new Error(
          `Insufficient ETH balance. Need ${hre.ethers.formatEther(
            creationFee
          )} ETH for creation fee`
        );
      }

      console.log('\nCreating NFT with parameters:');
      console.log('- Supply:', SUPPLY);
      console.log('- URI:', URI);
      console.log('- Price:', Number(PRICE_USD) / 1_000_000, 'USD');
      console.log('- Royalty:', ROYALTY / 100, '%');
      console.log(
        '- Creation Fee:',
        hre.ethers.formatEther(creationFee),
        'ETH'
      );

      console.log('\nSubmitting transaction...');
      const tx = await marketplace.createPromptNFT(
        SUPPLY,
        URI,
        PRICE_USD,
        ROYALTY,
        {
          value: creationFee,
        }
      );

      console.log('Transaction submitted:', tx.hash);

      console.log('Waiting for confirmation...');
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

        console.log('\nTo mint this NFT, use:');
        console.log(
          `npx hardhat mint-nft --token-id ${Number(
            event.args.tokenId
          )} --network ${hre.network.name}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('\n❌ Error creating NFT:', error.message);

        if (error.message.includes('No deployments found')) {
          console.error(
            'Please deploy the contracts first using the deployment script'
          );
        } else if (error.message.includes('invalid address')) {
          console.error('Invalid contract address in deployment file');
        } else if (error.message.includes('insufficient funds')) {
          console.error(
            'Make sure your account has enough ETH to pay the creation fee'
          );
        } else if (error.message.includes('Marketplace is currently paused')) {
          console.error('The marketplace is paused. Please try again later.');
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });
