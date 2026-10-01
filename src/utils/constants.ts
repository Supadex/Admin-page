import { getAddressesForChain } from '../contracts/addresses';

const addrs = getAddressesForChain(31337);

export const APP_CONFIG = {
  appName: 'SupaDex Governance & Admin',
  appVersion: 'v0.2.0-localnet',
  network: {
    name: 'Anvil Localnet',
    chainId: 31337,
    blockTime: '1.0s',
    rpcLatency: '—',
  },
  contracts: {
    supaPoolManager: addrs?.poolManager ?? '0x0000000000000000000000000000000000000000',
    supaVault: addrs?.vault ?? '0x0000000000000000000000000000000000000000',
    supaRouter: addrs?.router ?? '0x0000000000000000000000000000000000000000',
    supaQuoter: addrs?.quoter ?? '0x0000000000000000000000000000000000000000',
    volatilityOracle: addrs?.oracle ?? '0x0000000000000000000000000000000000000000',
    circuitBreaker: addrs?.circuitBreaker ?? '0x0000000000000000000000000000000000000000',
    feeCollector: addrs?.feeCollector ?? '0x0000000000000000000000000000000000000000',
    timelock: addrs?.timelock ?? '0x0000000000000000000000000000000000000000',
    roles: addrs?.roles ?? '0x0000000000000000000000000000000000000000',
    pluginWhitelist: addrs?.pluginWhitelist ?? '0x0000000000000000000000000000000000000000',
    lvrShieldPlugin: addrs?.lvrShieldPlugin ?? '0x0000000000000000000000000000000000000000',
  },
  roles: {
    // On-chain via CircuitBreaker / SupaRoles / Timelock — placeholders for display only
    OWNER: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    GUARDIAN: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    OPERATOR: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
};
