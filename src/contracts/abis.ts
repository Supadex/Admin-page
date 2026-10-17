import { parseAbi } from 'viem';

export const SupaPoolManagerABI = parseAbi([
  'function getSlot0(bytes32 id) external view returns (bytes32)',
  'function getLiquidity(bytes32 id) external view returns (uint128)',
  'function protocolFeesAccrued(address currency) external view returns (uint256)',
  'function owner() external view returns (address)',
  'function protocolFeeController() external view returns (address)',
  'function pluginWhitelist() external view returns (address)',
  'function circuitBreaker() external view returns (address)',
  'function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)',
  'function setProtocolFee((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint24 protocolFee) external',
  'function collectProtocolFees(address currency, address recipient, uint256 amount) external returns (uint256 collected)',
  'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address plugin, uint160 sqrtPriceX96, int24 tick)',
  'event ProtocolFeeUpdated(bytes32 indexed id, uint24 protocolFee)',
  'event ProtocolFeesCollected(address indexed currency, address indexed recipient, uint256 amount)',
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)',
] as const);

export const CircuitBreakerABI = parseAbi([
  'function owner() external view returns (address)',
  'function isVaultPaused() external view returns (bool)',
  'function isPoolPaused(bytes32 poolId) external view returns (bool)',
  'function isCurvePaused(uint8 curveType) external view returns (bool)',
  'function isGuardian(address account) external view returns (bool)',
  'function pauseVault() external',
  'function unpauseVault() external',
  'function pausePool(bytes32 poolId) external',
  'function unpausePool(bytes32 poolId) external',
  'function pauseCurve(uint8 curveType) external',
  'function unpauseCurve(uint8 curveType) external',
  'function setGuardian(address guardian, bool active) external',
  'event VaultPauseUpdated(bool paused)',
  'event PoolPauseUpdated(bytes32 indexed poolId, bool paused)',
  'event CurvePauseUpdated(uint8 indexed curveType, bool paused)',
  'event GuardianUpdated(address indexed guardian, bool active)',
] as const);

export const SupaTimelockABI = parseAbi([
  'function minDelay() external view returns (uint256)',
  'function admin() external view returns (address)',
  'function isProposer(address account) external view returns (bool)',
  'function isExecutor(address account) external view returns (bool)',
  'function isCanceller(address account) external view returns (bool)',
  'function getTimestamp(bytes32 id) external view returns (uint256)',
  'function isOperationReady(bytes32 id) external view returns (bool)',
  'function isOperationDone(bytes32 id) external view returns (bool)',
  'function getOperationState(bytes32 id) external view returns (uint8)',
  'function hashOperation(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt) external pure returns (bytes32)',
  'function schedule(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay) external',
  'function execute(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt) external payable',
  'function cancel(bytes32 id) external',
  'function setProposer(address account, bool status) external',
  'function setExecutor(address account, bool status) external',
  'function setCanceller(address account, bool status) external',
  'event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)',
  'event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)',
  'event Cancelled(bytes32 indexed id)',
] as const);

export const SupaRolesABI = parseAbi([
  'function owner() external view returns (address)',
  'function isOperator(address account) external view returns (bool)',
  'function setOperator(address account, bool active) external',
  'function transferOwnership(address newOwner) external',
  'event OperatorUpdated(address indexed account, bool active)',
] as const);

export const PluginWhitelistABI = parseAbi([
  'function owner() external view returns (address)',
  'function isPluginWhitelisted(address plugin) external view returns (bool)',
  'function setPluginWhitelisted(address plugin, bool whitelisted) external',
  'function transferOwnership(address newOwner) external',
  'event PluginWhitelisted(address indexed plugin, bool whitelisted)',
] as const);

export const LVRShieldPluginABI = parseAbi([
  'function roles() external view returns (address)',
  'function poolLVRStates(bytes32 poolId) external view returns (uint24 baseFee, uint24 lastFee, uint32 lastSwapTimestamp, int24 lastTick, uint32 decayHalfLife, uint24 volatilityAlpha, uint24 minFeeBps, uint24 maxFeeBps, bool isInitialized)',
  'function setDecayHalfLife((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint32 newDecayHalfLife) external',
  'function setVolatilityAlpha((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint24 newAlpha) external',
  'function setMinFeeBps((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint24 newMin) external',
  'function setMaxFeeBps((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint24 newMax) external',
  'function setDecayParameters((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) key, uint32 newDecayHalfLife, uint24 newAlpha, uint24 newMin, uint24 newMax) external',
  'event LVRParametersUpdated(bytes32 indexed poolId, uint32 decayHalfLife, uint24 volatilityAlpha, uint24 minFeeBps, uint24 maxFeeBps)',
] as const);

export const VolatilityTWAPOracleABI = parseAbi([
  'function grow(bytes32 poolId, uint16 newCardinalityNext) external returns (uint16 cardinalityNextUpdated)',
  'function observe(bytes32 poolId, uint32[] secondsAgos) external view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
  'function getInstantaneousVolatility(bytes32 poolId, uint32 windowSeconds) external view returns (uint256)',
] as const);

export const SupaFeeCollectorABI = parseAbi([
  'function owner() external view returns (address)',
  'function roles() external view returns (address)',
  'function daoTreasuryShareBps() external view returns (uint16)',
  'function lpStakingShareBps() external view returns (uint16)',
  'function insuranceReserveShareBps() external view returns (uint16)',
  'function daoTreasury() external view returns (address)',
  'function lpStaking() external view returns (address)',
  'function insuranceReserve() external view returns (address)',
  'function setFeeSplit(uint16 daoBps, uint16 stakingBps, uint16 insuranceBps) external',
  'function setFeeRecipients(address dao, address staking, address insurance) external',
  'function sweepProtocolFees(address[] currencies, bool asClaims) external',
  'event FeeSplitUpdated(uint16 daoTreasuryShareBps, uint16 lpStakingShareBps, uint16 insuranceReserveShareBps)',
  'event ProtocolFeesSwept(address indexed caller, address indexed currency, uint256 totalAmount, uint256 daoAmount, uint256 stakingAmount, uint256 insuranceAmount, bool asClaims)',
] as const);

export const SupaVaultABI = parseAbi([
  'function reservesOf(address currency) external view returns (uint256)',
  'function balanceOf(address owner, uint256 id) external view returns (uint256)',
  'function owner() external view returns (address)',
  'function isOperator(address owner, address operator) external view returns (bool)',
  'function setOperator(address operator, bool approved) external',
] as const);

export const SupaPositionManagerABI = parseAbi([
  'function mint(((address currency0, address currency1, uint24 fee, int24 tickSpacing, address plugin, uint8 curveType) poolKey, int24 tickLower, int24 tickUpper, uint128 liquidity, uint128 amount0Max, uint128 amount1Max, address recipient, uint256 deadline, bytes hookData, bool payWithClaims) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
] as const);

export const ERC20ABI = parseAbi([
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
] as const);
