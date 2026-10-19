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
const ANVIL_CHAIN_ID = 31337;

function envAddr(key: string, fallback: Address, chainId?: number): Address {
  // VITE_* overrides apply only on Anvil — never leak local addresses onto prod nets.
  if (chainId !== undefined && chainId !== ANVIL_CHAIN_ID) return fallback;
  const v = import.meta.env[key] as string | undefined;
  if (v && /^0x[a-fA-F0-9]{40}$/.test(v)) return v as Address;
  return fallback;
}

/** Anvil defaults — refreshed after `forge script DeploySupaDex` (CREATE order with roles/whitelist/feeCollector). */
const ANVIL_DEFAULTS: ProtocolAddresses = {
  timelock: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  roles: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  pluginWhitelist: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  circuitBreaker: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  vaultImplementation: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  vault: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  poolManager: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  clammEngine: '0x3B02fF1e626Ed7a8fd6eC5299e2C54e1421B626B',
  binEngine: '0xBA12646CC07ADBe43F8bD25D83FB628D29C8A762',
  stableEngine: '0x7ab4C4804197531f7ed6A6bc0f0781f706ff7953',
  oracle: '0x94099942864EA81cCF197E9D71ac53310b1468D8',
  lvrShieldPlugin: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  antiJITPlugin: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  positionManager: '0x0B306BF915C4d645ff596e518fAf3F9669b97016',
  router: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
  quoter: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE',
  claimsRouter: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
  feeCollector: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
};

function withEnvOverrides(base: ProtocolAddresses, chainId: number): ProtocolAddresses {
  return {
    timelock: envAddr('VITE_TIMELOCK_ADDRESS', base.timelock, chainId),
    roles: envAddr('VITE_ROLES_ADDRESS', base.roles, chainId),
    pluginWhitelist: envAddr('VITE_PLUGIN_WHITELIST_ADDRESS', base.pluginWhitelist, chainId),
    circuitBreaker: envAddr('VITE_CIRCUIT_BREAKER_ADDRESS', base.circuitBreaker, chainId),
    vault: envAddr('VITE_VAULT_ADDRESS', base.vault, chainId),
    vaultImplementation: envAddr(
      'VITE_VAULT_IMPLEMENTATION_ADDRESS',
      base.vaultImplementation,
      chainId
    ),
    poolManager: envAddr('VITE_POOL_MANAGER_ADDRESS', base.poolManager, chainId),
    clammEngine: envAddr('VITE_CLAMM_ENGINE_ADDRESS', base.clammEngine, chainId),
    binEngine: envAddr('VITE_BIN_ENGINE_ADDRESS', base.binEngine, chainId),
    stableEngine: envAddr('VITE_STABLE_ENGINE_ADDRESS', base.stableEngine, chainId),
    oracle: envAddr('VITE_ORACLE_ADDRESS', base.oracle, chainId),
    lvrShieldPlugin: envAddr('VITE_LVR_SHIELD_PLUGIN_ADDRESS', base.lvrShieldPlugin, chainId),
    antiJITPlugin: envAddr('VITE_ANTI_JIT_PLUGIN_ADDRESS', base.antiJITPlugin, chainId),
    positionManager: envAddr('VITE_POSITION_MANAGER_ADDRESS', base.positionManager, chainId),
    router: envAddr('VITE_ROUTER_ADDRESS', base.router, chainId),
    quoter: envAddr('VITE_QUOTER_ADDRESS', base.quoter, chainId),
    claimsRouter: envAddr('VITE_CLAIMS_ROUTER_ADDRESS', base.claimsRouter, chainId),
    feeCollector: envAddr('VITE_FEE_COLLECTOR_ADDRESS', base.feeCollector, chainId),
  };
}

/** Monad Testnet — DeploySupaDex broadcast 2026-10-18 (chain 10143) */
const MONAD_TESTNET: ProtocolAddresses = {
  timelock: '0x945FE953286F149A4A6b1C3B98920D798251ca14',
  roles: '0xbeA4c2ec85cACd865c8f4C8a36Ee7a6E536cf5bA',
  pluginWhitelist: '0x78c98fBB518551c7f31D932878901027F0B9cD29',
  circuitBreaker: '0xa35a5c00F8372e425b65BC21BA07A61EC210d0d0',
  vaultImplementation: '0x2005f6012468b48406dFc7bf47AcA176164cf0DC',
  vault: '0x2d9BcA3f7Fa23863944Fd611f4970Da6fB97Fe2D',
  poolManager: '0xC6B8Dc0AA5408C1e5C836794dD61F70Bd51A3A90',
  clammEngine: '0xbB55261463115159fE1B693f643Bb78762756Ab0',
  binEngine: '0x7CA57Db993e99bbA60c29a6e0c4d77D86cFa53B1',
  stableEngine: '0x5d521BcbCfeA758B0C25Cc150f01147cc172A48C',
  oracle: '0x9BEafEeC15A54643f0C5d95Cc6b6633De57F59CA',
  lvrShieldPlugin: '0x16c9d6e825CE8EAd431eB1E1443e18FcDbCE2623',
  antiJITPlugin: '0x60317687C9cBb3d31a75acc2bfBcD119b411ca52',
  positionManager: '0x6fe90e8111e0A18e6A8119dB82909E50B8A8400F',
  router: '0x677654F5eD18bD863dcfabFA69894A030010c1bc',
  quoter: '0xD44B281767F32E1fb72257223366E87378a7019d',
  claimsRouter: '0xc2F4605fdDC67F4a48e83dBfC945FEdeA42879a0',
  feeCollector: '0x484Ec3DC5fb027C2829ced71d3f7FBCb0A40049b',
};

/** Sepolia — DeploySupaDex broadcast 2026-10-19 */
const SEPOLIA: ProtocolAddresses = {
  timelock: '0x16c9d6e825CE8EAd431eB1E1443e18FcDbCE2623',
  roles: '0x506dCbd71D1df5499E52dB63aB092D68339CA5cD',
  pluginWhitelist: '0xA82f100207d0BE0F162b3f3b5E3048cA7ED5C88a',
  circuitBreaker: '0x60317687C9cBb3d31a75acc2bfBcD119b411ca52',
  vaultImplementation: '0x78c98fBB518551c7f31D932878901027F0B9cD29',
  vault: '0x5A7FaCaBAFBB70f2ABCF423A574B2A9D8014097e',
  poolManager: '0xD44B281767F32E1fb72257223366E87378a7019d',
  clammEngine: '0x1e595f461CC13426478963de3c9d5e65f8085004',
  binEngine: '0x6fe90e8111e0A18e6A8119dB82909E50B8A8400F',
  stableEngine: '0x677654F5eD18bD863dcfabFA69894A030010c1bc',
  oracle: '0x6E25d75CD6f7CB3187554EfD160E94FCdb06eFB2',
  lvrShieldPlugin: '0x484Ec3DC5fb027C2829ced71d3f7FBCb0A40049b',
  antiJITPlugin: '0x982f42ad054152CC5bF9390c39eeB0DFad0E847c',
  positionManager: '0xFc0bbF69664b6511Cc961F64C0948D82Bd45b707',
  router: '0x43DC1d6fE415524dbA0a359cdaFAf7d864EECC5f',
  quoter: '0x8CBEE7D91A24Fc74659856a55CF85c3F3622285b',
  claimsRouter: '0x543132b740C85F59AC3344CAEa8e81fb1514856d',
  feeCollector: '0x2F0b9d93623Fb512447BB69B088eeF19B0fd1860',
};

/** Base Sepolia — DeploySupaDex broadcast 2026-10-19 */
const BASE_SEPOLIA: ProtocolAddresses = {
  timelock: '0xC6B8Dc0AA5408C1e5C836794dD61F70Bd51A3A90',
  roles: '0x32cdf3909B513515e92f2a6122ec18084a417490',
  pluginWhitelist: '0x59fcd5F6BE8C552daDA47F0af0ae008CE99f45C4',
  circuitBreaker: '0x16c9d6e825CE8EAd431eB1E1443e18FcDbCE2623',
  vaultImplementation: '0x506dCbd71D1df5499E52dB63aB092D68339CA5cD',
  vault: '0x60317687C9cBb3d31a75acc2bfBcD119b411ca52',
  poolManager: '0x6fe90e8111e0A18e6A8119dB82909E50B8A8400F',
  clammEngine: '0x5A7FaCaBAFBB70f2ABCF423A574B2A9D8014097e',
  binEngine: '0x799ef027677effb9c98627A61Dd33e1733fBD3Ef',
  stableEngine: '0x1e595f461CC13426478963de3c9d5e65f8085004',
  oracle: '0x6BF36ba6A770c763c7179f87995522F8b2f16b15',
  lvrShieldPlugin: '0xD44B281767F32E1fb72257223366E87378a7019d',
  antiJITPlugin: '0x484Ec3DC5fb027C2829ced71d3f7FBCb0A40049b',
  positionManager: '0xD528B7cdb95dd607D381e0e554cB60fC54DE9f4a',
  router: '0xb66EE27Da7E975374D7252457f0bdACE729C5096',
  quoter: '0xFc0bbF69664b6511Cc961F64C0948D82Bd45b707',
  claimsRouter: '0x43DC1d6fE415524dbA0a359cdaFAf7d864EECC5f',
  feeCollector: '0x8CBEE7D91A24Fc74659856a55CF85c3F3622285b',
};

export const CONTRACT_ADDRESSES: Partial<Record<number, ProtocolAddresses>> = {
  31337: withEnvOverrides(ANVIL_DEFAULTS, ANVIL_CHAIN_ID),
  10143: MONAD_TESTNET,
  11155111: SEPOLIA,
  84532: BASE_SEPOLIA,
};

export const getAddressesForChain = (chainId?: number): ProtocolAddresses | null => {
  if (chainId && CONTRACT_ADDRESSES[chainId]) {
    return CONTRACT_ADDRESSES[chainId]!;
  }
  if (chainId === undefined) {
    return CONTRACT_ADDRESSES[10143] ?? CONTRACT_ADDRESSES[31337] ?? null;
  }
  return null;
};

export const isProtocolDeployed = (chainId?: number): boolean => {
  const addrs = getAddressesForChain(chainId);
  return !!addrs && addrs.poolManager !== ZERO;
};
