export interface SedaConfig {
  proverAddress: string;
}

export const networkConfigs: { [network: string]: SedaConfig } = {
  baseSepolia: {
    proverAddress: "0xCcB6ffE2b60e0827a5b566920Bdb8d20Cfc01864",
  },
  arbitrumSepolia: {
    proverAddress: "0xDaeC4a2C90AB29368E9bAea1eA71B22f14709d32",
  },
};
