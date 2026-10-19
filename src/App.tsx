import { useState } from 'react';
import { AdminSidebar, type AdminTab } from './components/layout/AdminSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import {
  StatCard,
  DiffViewer,
  JSONInspector,
  AuditTable,
  ConfirmModal,
  type AuditColumn,
} from './components/data';
import {
  PermissionGuard,
  AccessDeniedBanner,
  RoleBadge,
  AccountDetailsModal,
} from './components/auth';
import { CreatePoolPage } from './pages/CreatePoolPage';
import { Button, Badge, Input } from './components/ui';
import { APP_CONFIG } from './utils/constants';
import { shortenAddress, formatUSD } from './utils/formatters';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useAdminPools, type AdminPool } from './hooks/useAdminPools';
import { useCircuitBreaker } from './hooks/useCircuitBreaker';
import { CircuitBreakerControl } from './components/circuit-breaker';
import { LVRCalibrationConsole } from './components/lvr-oracle';
import { TreasuryClaimsConsole } from './components/treasury';
import { AuditLogsConsole } from './components/audit-logs';
import { RoleManagementConsole } from './components/roles';
import { getAddressesForChain } from './contracts/addresses';
import { PluginWhitelistABI, AntiJITVestingPluginABI } from './contracts/abis';
import { useAccount, useReadContract } from 'wagmi';
import { isAddress, type Address, zeroAddress } from 'viem';
import { useTimelockTx } from './hooks/useTimelockTx';
import { getKnownHooks } from './utils/poolMath';
import {
  Activity,
  Layers,
  Lock,
  Coins,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  Plus,
  KeyRound,
  Power,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [whitelistInput, setWhitelistInput] = useState('');
  const [whitelistBusy, setWhitelistBusy] = useState(false);
  const [delistTarget, setDelistTarget] = useState<Address | null>(null);
  const [allowDelta, setAllowDelta] = useState(false);

  const { activeRole, activeRoleDef, hasPermission, addresses } = useAdminAuth();
  const { chain } = useAccount();
  const { pools, isLoading: poolsLoading, refetch: refetchPools } = useAdminPools();
  const { currentTier, refetchAll: refetchCircuit } = useCircuitBreaker();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const { scheduleAndMaybeExecute } = useTimelockTx();
  const knownHooks = getKnownHooks(addrs);

  const { data: lvrWhitelisted, refetch: refetchLvrWl } = useReadContract({
    address: addrs?.pluginWhitelist,
    abi: PluginWhitelistABI,
    functionName: 'isPluginWhitelisted',
    args: addrs?.lvrShieldPlugin ? [addrs.lvrShieldPlugin] : undefined,
    query: { enabled: !!addrs?.pluginWhitelist && !!addrs?.lvrShieldPlugin },
  });

  const { data: antiJitWhitelisted, refetch: refetchJitWl } = useReadContract({
    address: addrs?.pluginWhitelist,
    abi: PluginWhitelistABI,
    functionName: 'isPluginWhitelisted',
    args: addrs?.antiJITPlugin ? [addrs.antiJITPlugin] : undefined,
    query: { enabled: !!addrs?.pluginWhitelist && !!addrs?.antiJITPlugin },
  });

  const { data: antiJitCanDelta, refetch: refetchJitDelta } = useReadContract({
    address: addrs?.pluginWhitelist,
    abi: PluginWhitelistABI,
    functionName: 'canPluginReturnDelta',
    args: addrs?.antiJITPlugin ? [addrs.antiJITPlugin] : undefined,
    query: { enabled: !!addrs?.pluginWhitelist && !!addrs?.antiJITPlugin },
  });

  const { data: minResidencyBlocks } = useReadContract({
    address: addrs?.antiJITPlugin,
    abi: AntiJITVestingPluginABI,
    functionName: 'minResidencyBlocks',
    query: { enabled: !!addrs?.antiJITPlugin },
  });

  const refetchWl = async () => {
    await Promise.all([refetchLvrWl(), refetchJitWl(), refetchJitDelta()]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchPools(), refetchCircuit(), refetchWl()]);
    setIsRefreshing(false);
  };

  const poolsUsingPlugin = (plugin: Address) =>
    pools.filter((p) => p.plugin?.toLowerCase() === plugin.toLowerCase());

  const handleWhitelistPlugin = async (plugin: Address, whitelisted: boolean, withDelta: boolean) => {
    if (!addrs?.pluginWhitelist || !isAddress(plugin) || plugin === zeroAddress) return;
    setWhitelistBusy(true);
    try {
      await scheduleAndMaybeExecute({
        target: addrs.pluginWhitelist,
        abi: PluginWhitelistABI,
        functionName: 'setPluginWhitelisted',
        args: [plugin, whitelisted],
      });
      if (whitelisted && withDelta) {
        await scheduleAndMaybeExecute({
          target: addrs.pluginWhitelist,
          abi: PluginWhitelistABI,
          functionName: 'setPluginCanReturnDelta',
          args: [plugin, true],
        });
      }
      await refetchWl();
      setWhitelistInput('');
      setAllowDelta(false);
      setDelistTarget(null);
    } finally {
      setWhitelistBusy(false);
    }
  };

  const poolColumns: AuditColumn<AdminPool>[] = [
    {
      key: 'pair',
      header: 'Pool Pair',
      render: (pool) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary-theme">{pool.pair}</span>
        </div>
      ),
    },
    {
      key: 'curveType',
      header: 'Curve Engine',
      render: (pool) => {
        const variant =
          pool.curveType === 'CLAMM' ? 'info' : pool.curveType === 'BinAMM' ? 'curve' : 'warning';
        return <Badge variant={variant}>{pool.curveType}</Badge>;
      },
    },
    {
      key: 'feeTier',
      header: 'Base Fee',
      render: (pool) => <span className="font-mono text-primary-theme">{pool.feeTier}</span>,
    },
    {
      key: 'tvlUSD',
      header: 'TVL (est.)',
      render: (pool) => (
        <span className="font-mono text-primary-theme">
          {pool.tvlUSD > 0 ? formatUSD(pool.tvlUSD) : '—'}
        </span>
      ),
    },
    {
      key: 'hookAddress',
      header: 'Hook Attachment',
      render: (pool) => (
        <div className="flex items-center gap-1.5 font-mono text-secondary-theme">
          <span>{pool.hookAddress}</span>
          <ExternalLink className="w-3 h-3 text-secondary-theme" />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (pool) => (
        <Badge variant={pool.status === 'ACTIVE' ? 'success' : 'danger'}>{pool.status}</Badge>
      ),
    },
  ];

  const totalTvl = pools.reduce((s, p) => s + p.tvlUSD, 0);

  return (
    <div className="flex min-h-screen bg-base-theme text-primary-theme selection:bg-brand-purple/20 transition-colors duration-200">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          currentTabName={activeTab.replace('-', ' ')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenRoles={() => setActiveTab('roles')}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {!addresses && (
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
              Protocol contracts are not deployed on this network. Switch to Anvil (31337) or sync
              addresses from a Forge broadcast.
            </div>
          )}

          {activeTab !== 'create-pool' && (
          <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-elevated-theme border border-hairline-theme">
                <KeyRound className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary-theme font-mono">
                    {activeRoleDef.title}
                  </span>
                  <RoleBadge role={activeRole} showIcon={false} size="sm" />
                </div>
                <p className="text-xs text-secondary-theme">{activeRoleDef.description}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAccountModalOpen(true)}
              className="text-xs gap-1.5 shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Privilege Matrix</span>
            </Button>
          </div>
          )}

          {activeTab !== 'create-pool' &&
            activeTab !== 'roles' &&
            !hasPermission('admin.circuit_breaker.trigger') && (
            <AccessDeniedBanner
              requiredRole="GUARDIAN or OWNER"
              actionName="halt protocol swaps or escalate circuit breaker"
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          )}

          {activeTab === 'circuit-breaker' ? (
            <CircuitBreakerControl
              pools={pools.map((p) => ({
                id: p.id,
                pair: p.pair,
                curveType: p.curveType,
                feeTier: p.feeTier,
                tvlUSD: p.tvlUSD,
                volume24h: p.volume24h,
                hookAddress: p.hookAddress,
              }))}
            />
          ) : activeTab === 'lvr-oracle' ? (
            <LVRCalibrationConsole />
          ) : activeTab === 'treasury' ? (
            <TreasuryClaimsConsole />
          ) : activeTab === 'roles' ? (
            <RoleManagementConsole
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          ) : activeTab === 'audit-logs' ? (
            <AuditLogsConsole />
          ) : activeTab === 'create-pool' ? (
            <CreatePoolPage
              onBack={() => setActiveTab('pools')}
              onPoolCreated={() => {
                void refetchPools();
                setActiveTab('pools');
              }}
            />
          ) : activeTab === 'pools' ? (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-base font-bold text-primary-theme">
                      Multi-Curve Pool Registry & Initializer
                    </h2>
                  </div>
                  <p className="text-xs text-secondary-theme">
                    Live pools from SupaPoolManager Initialize events
                    {poolsLoading ? ' (loading…)' : ` (${pools.length})`}.
                  </p>
                </div>

                <PermissionGuard permission="admin.pool.create" disableInsteadOfHide={true}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setActiveTab('create-pool')}
                    className="gap-1.5 text-xs shrink-0 font-mono"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Initialize New Pool</span>
                  </Button>
                </PermissionGuard>
              </div>

              <PermissionGuard permission="admin.hooks.whitelist" disableInsteadOfHide={true}>
                <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
                      Plugin Whitelist (Timelock)
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={lvrWhitelisted ? 'success' : 'warning'}>
                        LVR {lvrWhitelisted ? 'Listed' : 'Not Listed'}
                      </Badge>
                      <Badge variant={antiJitWhitelisted ? 'success' : 'warning'}>
                        AntiJIT {antiJitWhitelisted ? 'Listed' : 'Not Listed'}
                      </Badge>
                      {antiJitWhitelisted && (
                        <Badge variant={antiJitCanDelta ? 'success' : 'danger'}>
                          canReturnDelta {antiJitCanDelta ? 'ON' : 'OFF'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {addrs?.antiJITPlugin && (
                    <p className="text-[11px] text-secondary-theme font-mono">
                      AntiJIT minResidencyBlocks={String(minResidencyBlocks ?? '—')} · fee vesting
                      requires canReturnDelta. PoolKey.plugin is singular — LVR and AntiJIT cannot
                      share one pool.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {knownHooks
                      .filter((h) => h.type !== 'vanilla')
                      .map((h) => {
                        const listed =
                          h.type === 'lvr' ? !!lvrWhitelisted : h.type === 'anti-jit' ? !!antiJitWhitelisted : false;
                        return (
                          <div key={h.address} className="flex items-center gap-1.5">
                            {!listed ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={whitelistBusy}
                                onClick={() =>
                                  void handleWhitelistPlugin(
                                    h.address,
                                    true,
                                    !!h.needsCanReturnDelta || h.type === 'anti-jit'
                                  )
                                }
                              >
                                Whitelist {h.name.split(' ')[0]}
                                {h.needsCanReturnDelta ? ' +Δ' : ''}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={whitelistBusy}
                                onClick={() => setDelistTarget(h.address)}
                              >
                                Delist {h.name.split(' ')[0]}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex gap-2 items-start">
                    <Input
                      value={whitelistInput}
                      onChange={(e) => setWhitelistInput(e.target.value)}
                      placeholder="0x custom plugin"
                      className="font-mono text-xs"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-secondary-theme shrink-0 pt-2">
                      <input
                        type="checkbox"
                        checked={allowDelta}
                        onChange={(e) => setAllowDelta(e.target.checked)}
                      />
                      +canReturnDelta
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={whitelistBusy || !isAddress(whitelistInput)}
                      onClick={() =>
                        void handleWhitelistPlugin(whitelistInput as Address, true, allowDelta)
                      }
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </PermissionGuard>

              <ConfirmModal
                isOpen={!!delistTarget}
                onClose={() => setDelistTarget(null)}
                title="Delist plugin?"
                description={
                  delistTarget
                    ? `Delisting ${shortenAddress(delistTarget)} disables swap / modifyLiquidity / donate for ${
                        poolsUsingPlugin(delistTarget).length
                      } live pool(s) that use this plugin. This goes through the Timelock.`
                    : ''
                }
                confirmText="Schedule Delist"
                variant="danger"
                onConfirm={() => {
                  if (delistTarget) void handleWhitelistPlugin(delistTarget, false, false);
                }}
                isLoading={whitelistBusy}
              />

              <AuditTable
                columns={poolColumns}
                data={pools}
                searchFilter={(pool, q) =>
                  pool.pair.toLowerCase().includes(q.toLowerCase()) ||
                  pool.curveType.toLowerCase().includes(q.toLowerCase()) ||
                  pool.hookAddress.toLowerCase().includes(q.toLowerCase())
                }
                searchPlaceholder="Filter initialized pools by pair, curve, or hook..."
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Value Locked"
                  value={totalTvl > 0 ? formatUSD(totalTvl) : '—'}
                  subValue={`across ${pools.length} pools`}
                  icon={<Coins className="w-4 h-4 text-emerald-500" />}
                  badgeText="On-chain"
                  badgeVariant="success"
                />
                <StatCard
                  label="Initialized Pools"
                  value={String(pools.length)}
                  subValue={poolsLoading ? 'Refreshing…' : 'from Initialize logs'}
                  icon={<Activity className="w-4 h-4 text-blue-500" />}
                  badgeText="Live"
                  badgeVariant="info"
                />
                <StatCard
                  label="Circuit Breaker Status"
                  value={`Tier ${currentTier}`}
                  subValue={
                    currentTier === 0 ? 'All Systems Operational' : 'Emergency State Active'
                  }
                  icon={<Lock className="w-4 h-4 text-amber-500" />}
                  badgeText={currentTier === 0 ? 'Normal' : 'Engaged'}
                  badgeVariant={currentTier === 0 ? 'success' : 'danger'}
                />
                <StatCard
                  label="Network"
                  value={chain?.name || APP_CONFIG.network.name}
                  subValue={`chainId ${chain?.id ?? APP_CONFIG.network.chainId}`}
                  icon={<SlidersHorizontal className="w-4 h-4 text-purple-500" />}
                  badgeText={addresses ? 'Mapped' : 'Missing'}
                  badgeVariant={addresses ? 'success' : 'danger'}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary-theme">
                          Circuit Breaker Control
                        </span>
                      </div>
                      <Badge variant={currentTier === 0 ? 'success' : 'danger'}>
                        Level {currentTier}
                      </Badge>
                    </div>
                    <p className="text-xs text-secondary-theme leading-relaxed">
                      Multi-tier emergency pause: Global Vault (Tier 3), Curve Engine (Tier 2),
                      Pool-level (Tier 1).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('circuit-breaker')}
                    className="w-full gap-1.5 text-xs font-semibold font-mono"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Open Control Center</span>
                  </Button>
                </div>

                <div className="lg:col-span-2">
                  <DiffViewer
                    label="Deployment Source"
                    description="Addresses loaded from contracts/addresses.ts (Anvil 31337) with optional VITE_* overrides."
                    previousValue="Mock APP_CONFIG"
                    nextValue={shortenAddress(addrs?.poolManager || '0x0', 6)}
                    unit="poolManager"
                    isDestructive={false}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary-theme" />
                    <h2 className="text-sm font-semibold tracking-tight text-primary-theme">
                      Active Multi-Curve Pools
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Sort Pools</span>
                    </Button>
                    <PermissionGuard permission="admin.pool.create" disableInsteadOfHide={true}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveTab('create-pool')}
                        className="gap-1.5 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Initialize New Pool</span>
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>

                <AuditTable
                  columns={poolColumns}
                  data={pools}
                  searchFilter={(pool, q) =>
                    pool.pair.toLowerCase().includes(q.toLowerCase()) ||
                    pool.curveType.toLowerCase().includes(q.toLowerCase()) ||
                    pool.hookAddress.toLowerCase().includes(q.toLowerCase())
                  }
                  searchPlaceholder="Filter pools by pair, curve, or hook..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
                    On-Chain Contract Addresses
                  </span>
                  <span className="text-xs font-mono text-secondary-theme">
                    Manager: {shortenAddress(addrs?.poolManager || '0x0', 6)}
                  </span>
                </div>

                <JSONInspector
                  title="SupaDex Protocol Deployment Map"
                  data={{
                    chainId: chain?.id ?? 31337,
                    ...addrs,
                    activeCircuitBreakerTier: currentTier,
                    poolsCount: pools.length,
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => setIsConfirmModalOpen(false)}
        title="Escalate Circuit Breaker"
        description="Use the Circuit Breaker control center for live pause actions."
        confirmText="Close"
        variant="danger"
      />

      <AccountDetailsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onManageRoles={() => setActiveTab('roles')}
      />
    </div>
  );
}

export default App;
