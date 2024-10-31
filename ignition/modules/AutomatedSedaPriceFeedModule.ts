// ignition/modules/AutomatedSedaPriceFeedModule.ts

import { network } from 'hardhat';
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { getOracleProgramId, getSedaConfig } from '../sedaUtils';

export const AutomatedSedaPriceFeedModule = buildModule('AutomatedSedaPriceFeedModule', (m) => {
 
  let proverAddress;
  let oracleProgramId;

  
  if (network.name !== 'hardhat') {
    const sedaConfig = getSedaConfig(network.name);
    proverAddress = m.getParameter('sedaProverContract', sedaConfig.proverAddress);
    oracleProgramId = m.getParameter('binaryId', getOracleProgramId());
  } else {
    const sedaProverMock = m.contract('SedaProverMock', []);
    proverAddress = sedaProverMock;
    oracleProgramId = "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  const priceFeed = m.contract('AutomatedSedaPriceFeed', [
    proverAddress,
    oracleProgramId,
    3600 // 1 hour update interval
  ]);

  return { priceFeed };
});