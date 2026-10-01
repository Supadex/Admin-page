import type { Address } from 'viem';

export interface ProtocolAddresses {
  timelock: Address;
  roles: Address;
  pluginWhitelist: Address;
  circuitBreaker: Address;
  vault: Address;
  vaultImplementation: Address;
  poolManager: Address;
  clammEngine: Address;
  binEngine: Address;
  stableEngine: Address;
  oracle: Address;
  lvrShieldPlugin: Address;
  antiJITPlugin: Address;
  positionManager: Address;
  router: Address;
  quoter: Address;
  claimsRouter: Address;
  feeCollector: Address;
}

const ZERO = '0x0000000000000000000000000000000000000000' as Address;

function envAddr(key: string, fallback: Address): Address {
  const v = import.meta.env[key] as string | undefined;
  if (v && /^0x[a-fA-F0-9]{40}$/.test(v)) return v as Address;
  return fallback;
}

/** Anvil defaults — refreshed after `forge script DeploySupaDex` (CREATE order with roles/whitelist/feeCollector). */
const ANVIL_DEFAULTS: ProtocolAddresses = {
  timelock: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  roles: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  pluginWhitelist: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  circuitBreaker: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  vaultImplementation: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  vault: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  poolManager: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  clammEngine: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  binEngine: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  stableEngine: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  oracle: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  lvrShieldPlugin: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
  antiJITPlugin: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  positionManager: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
  router: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
  quoter: '0x59b670e9fA9D0A427751Af201D676719a970857b',
  claimsRouter: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
  feeCollector: '0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44',
};

function withEnvOverrides(base: ProtocolAddresses): ProtocolAddresses {
  return {
    timelock: envAddr('VITE_TIMELOCK_ADDRESS', base.timelock),
    roles: envAddr('VITE_ROLES_ADDRESS', base.roles),
    pluginWhitelist: envAddr('VITE_PLUGIN_WHITELIST_ADDRESS', base.pluginWhitelist),
    circuitBreaker: envAddr('VITE_CIRCUIT_BREAKER_ADDRESS', base.circuitBreaker),
    vault: envAddr('VITE_VAULT_ADDRESS', base.vault),
    vaultImplementation: envAddr('VITE_VAULT_IMPLEMENTATION_ADDRESS', base.vaultImplementation),
    poolManager: envAddr('VITE_POOL_MANAGER_ADDRESS', base.poolManager),
    clammEngine: envAddr('VITE_CLAMM_ENGINE_ADDRESS', base.clammEngine),
    binEngine: envAddr('VITE_BIN_ENGINE_ADDRESS', base.binEngine),
    stableEngine: envAddr('VITE_STABLE_ENGINE_ADDRESS', base.stableEngine),
    oracle: envAddr('VITE_ORACLE_ADDRESS', base.oracle),
    lvrShieldPlugin: envAddr('VITE_LVR_SHIELD_PLUGIN_ADDRESS', base.lvrShieldPlugin),
    antiJITPlugin: envAddr('VITE_ANTI_JIT_PLUGIN_ADDRESS', base.antiJITPlugin),
    positionManager: envAddr('VITE_POSITION_MANAGER_ADDRESS', base.positionManager),
    router: envAddr('VITE_ROUTER_ADDRESS', base.router),
    quoter: envAddr('VITE_QUOTER_ADDRESS', base.quoter),
    claimsRouter: envAddr('VITE_CLAIMS_ROUTER_ADDRESS', base.claimsRouter),
    feeCollector: envAddr('VITE_FEE_COLLECTOR_ADDRESS', base.feeCollector),
  };
}

/**
 * Chain registry. Sepolia/mainnet omit until real broadcasts exist (no Anvil clones).
 */
export const CONTRACT_ADDRESSES: Partial<Record<number, ProtocolAddresses>> = {
  31337: withEnvOverrides(ANVIL_DEFAULTS),
};

export const getAddressesForChain = (chainId?: number): ProtocolAddresses | null => {
  if (chainId && CONTRACT_ADDRESSES[chainId]) {
    return CONTRACT_ADDRESSES[chainId]!;
  }
  if (chainId === undefined) {
    return CONTRACT_ADDRESSES[31337] ?? null;
  }
  return null;
};

export const isProtocolDeployed = (chainId?: number): boolean => {
  const addrs = getAddressesForChain(chainId);
  return !!addrs && addrs.poolManager !== ZERO;
};
