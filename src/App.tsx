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
import { Button, Badge } from './components/ui';
import { APP_CONFIG } from './utils/constants';
import { shortenAddress, formatUSD } from './utils/formatters';
import { useAdminAuth } from './hooks/useAdminAuth';
import { CircuitBreakerControl } from './components/circuit-breaker';
import { LVRCalibrationConsole } from './components/lvr-oracle';
import { TreasuryClaimsConsole } from './components/treasury';
import { AuditLogsConsole } from './components/audit-logs';
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

interface MockPoolRecord {
  id: string;
  pair: string;
  symbol0?: string;
  symbol1?: string;
  curveType: 'CLAMM' | 'BinAMM' | 'StableAMM';
  feeTier: string;
  tvlUSD: number;
  volume24h: number;
  hookAddress: string;
  status: 'ACTIVE' | 'PAUSED';
}


const INITIAL_POOLS: MockPoolRecord[] = [
  {
    id: '0x1a8f...90ab',
    pair: 'ETH / USDC',
    curveType: 'CLAMM',
    feeTier: '0.05%',
    tvlUSD: 14250000,
    volume24h: 3820000,
    hookAddress: '0x3C44...93BC',
    status: 'ACTIVE',
  },
  {
    id: '0x4b7c...21de',
    pair: 'WBTC / ETH',
    curveType: 'CLAMM',
    feeTier: '0.30%',
    tvlUSD: 8940000,
    volume24h: 1950000,
    hookAddress: '0x90F7...b906',
    status: 'ACTIVE',
  },
  {
    id: '0x7e2a...55ff',
    pair: 'USDC / USDT',
    curveType: 'StableAMM',
    feeTier: '0.01%',
    tvlUSD: 24500000,
    volume24h: 8400000,
    hookAddress: '0x15d3...6A65',
    status: 'ACTIVE',
  },
  {
    id: '0x99dd...01cc',
    pair: 'ARB / ETH',
    curveType: 'BinAMM',
    feeTier: '0.20%',
    tvlUSD: 3120000,
    volume24h: 740000,
    hookAddress: '0x9965...A4dc',
    status: 'PAUSED',
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [circuitBreakerTier, setCircuitBreakerTier] = useState<number>(0);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [pools, setPools] = useState<MockPoolRecord[]>(INITIAL_POOLS);


  const { activeRole, activeRoleDef, hasPermission } = useAdminAuth();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const poolColumns: AuditColumn<MockPoolRecord>[] = [
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
          pool.curveType === 'CLAMM'
            ? 'info'
            : pool.curveType === 'BinAMM'
            ? 'curve'
            : 'warning';
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
      header: 'TVL',
      render: (pool) => (
        <span className="font-mono text-primary-theme">{formatUSD(pool.tvlUSD)}</span>
      ),
    },
    {
      key: 'volume24h',
      header: '24h Volume',
      render: (pool) => (
        <span className="font-mono text-secondary-theme">
          {formatUSD(pool.volume24h)}
        </span>
      ),
    },
    {
      key: 'hookAddress',
      header: 'Hook Attachment',
      render: (pool) => (
        <div className="flex items-center gap-1.5 font-mono text-secondary-theme">
          <span>{pool.hookAddress}</span>
          <ExternalLink className="w-3 h-3 text-secondary-theme hover:text-primary-theme" />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (pool) => (
        <Badge variant={pool.status === 'ACTIVE' ? 'success' : 'danger'}>
          {pool.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-base-theme text-primary-theme selection:bg-brand-purple/20 transition-colors duration-200">
      {/* Institutional Collapsible Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Admin Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          currentTabName={activeTab.replace('-', ' ')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Active Session & RBAC Privileges Banner */}
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
                <p className="text-xs text-secondary-theme">
                  {activeRoleDef.description}
                </p>
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

          {/* Access Warning Banner if not permitted for state actions */}
          {!hasPermission('admin.circuit_breaker.trigger') && (
            <AccessDeniedBanner
              requiredRole="GUARDIAN or OWNER"
              actionName="halt protocol swaps or escalate circuit breaker"
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          )}

          {/* View Tab Routing */}
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
          ) : activeTab === 'audit-logs' ? (
            <AuditLogsConsole />
          ) : activeTab === 'create-pool' ? (
            <CreatePoolPage
              onBack={() => setActiveTab('pools')}
              onPoolCreated={(newPool) => {
                const curveNames: Record<number, 'CLAMM' | 'BinAMM' | 'StableAMM'> = {
                  0: 'CLAMM',
                  1: 'BinAMM',
                  2: 'StableAMM',
                };
                const newEntry: MockPoolRecord = {
                  id: `${newPool.currency0.slice(0, 6)}...${newPool.currency1.slice(-4)}`,
                  pair: `WETH / USDC`,
                  symbol0: 'WETH',
                  symbol1: 'USDC',
                  curveType: curveNames[newPool.curveType] || 'CLAMM',
                  feeTier: `${(newPool.fee / 10000).toFixed(2)}%`,
                  tvlUSD: 50000,
                  volume24h: 0,
                  hookAddress:
                    newPool.plugin === '0x0000000000000000000000000000000000000000'
                      ? 'None'
                      : `${newPool.plugin.slice(0, 6)}...${newPool.plugin.slice(-4)}`,
                  status: 'ACTIVE',
                };
                setPools((prev) => [newEntry, ...prev]);
                setActiveTab('pools');
              }}
            />
          ) : activeTab === 'pools' ? (
            <div className="space-y-6">
              {/* Pools Header & Wizard Action */}
              <div className="p-6 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-base font-bold text-primary-theme">
                      Multi-Curve Pool Registry & Initializer
                    </h2>
                  </div>
                  <p className="text-xs text-secondary-theme">
                    Deploy concentrated (CLAMM), discretized bin (BinAMM), or amplified stableswap (StableAMM) pairs.
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

              {/* Pool Audit Table */}
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

            /* Overview Tab */
            <div className="space-y-6">
              {/* Top High-Density Metric Readouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Value Locked"
                  value="$50.81M"
                  subValue={`across ${pools.length} pools`}
                  change={{ value: '4.2%', positive: true, period: 'vs yesterday' }}
                  icon={<Coins className="w-4 h-4 text-emerald-500" />}
                  badgeText="Verified"
                  badgeVariant="success"
                />
                <StatCard
                  label="24h Protocol Volume"
                  value="$14.91M"
                  subValue="1,842 trades"
                  change={{ value: '12.8%', positive: true, period: 'vs last 24h' }}
                  icon={<Activity className="w-4 h-4 text-blue-500" />}
                  badgeText="Optimal"
                  badgeVariant="info"
                />
                <StatCard
                  label="Circuit Breaker Status"
                  value={`Tier ${circuitBreakerTier}`}
                  subValue={circuitBreakerTier === 0 ? 'All Systems Operational' : 'Emergency State Active'}
                  icon={<Lock className="w-4 h-4 text-amber-500" />}
                  badgeText={circuitBreakerTier === 0 ? 'Normal' : 'Engaged'}
                  badgeVariant={circuitBreakerTier === 0 ? 'success' : 'danger'}
                />
                <StatCard
                  label="Dynamic LVR Spread"
                  value="8.4 bps"
                  subValue="sigma = 0.42"
                  change={{ value: '-1.1 bps', positive: false, neutral: true, period: 'decay active' }}
                  icon={<SlidersHorizontal className="w-4 h-4 text-purple-500" />}
                  badgeText="Oracle v1"
                  badgeVariant="default"
                />
              </div>

              {/* Quick Actions & Safety Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Status & Quick Link */}
                <div className="p-5 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary-theme">
                          Circuit Breaker Control
                        </span>
                      </div>
                      <Badge variant={circuitBreakerTier === 0 ? 'success' : 'danger'}>
                        Level {circuitBreakerTier}
                      </Badge>
                    </div>
                    <p className="text-xs text-secondary-theme leading-relaxed">
                      Multi-tier emergency pause system: Global Vault (Tier 3), Curve Engine (Tier 2), and Pool-level (Tier 1).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-hairline-theme">
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
                </div>

                {/* Parameter Diff Preview */}
                <div className="lg:col-span-2">
                  <DiffViewer
                    label="LVR Volatility Decay Constant"
                    description="Pending governance calibration for high-volatility market conditions."
                    previousValue="0.00045"
                    nextValue="0.00075"
                    unit="lambda/sec"
                    isDestructive={false}
                  />
                </div>
              </div>

              {/* Live Registry & Telemetry Data Table */}
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

              {/* Raw State / Contract State Inspector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
                    On-Chain Contract State & Slot0 Telemetry
                  </span>
                  <span className="text-xs font-mono text-secondary-theme">
                    Manager: {shortenAddress(APP_CONFIG.contracts.supaPoolManager, 6)}
                  </span>
                </div>

                <JSONInspector
                  title="SupaPoolManager Slot0 & Circuit Breaker State"
                  data={{
                    manager: APP_CONFIG.contracts.supaPoolManager,
                    vault: APP_CONFIG.contracts.supaVault,
                    activeCircuitBreakerTier: circuitBreakerTier,
                    poolsCount: pools.length,
                    oracleConfig: {
                      volatilityAlpha: 840,
                      decayRate: 4200,
                      minSpreadBps: 5,
                      maxSpreadBps: 250,
                    },
                    governance: {
                      timelockDurationSeconds: 86400,
                      owner: APP_CONFIG.roles.OWNER,
                      guardian: APP_CONFIG.roles.GUARDIAN,
                    },
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Two-Step Administrative Action Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => {
          setCircuitBreakerTier(1);
          setIsConfirmModalOpen(false);
        }}
        title="Escalate Circuit Breaker to Tier 1"
        description="This action will instantly halt all pool swaps across the protocol. Only liquidity withdrawals and claims will be permitted."
        confirmText="Engage Circuit Breaker"
        variant="danger"
        requireTypedConfirmation={true}
        confirmationKeyword="HALT-SWAPS"
      >
        <DiffViewer
          label="Circuit Breaker Status"
          previousValue={`Tier ${circuitBreakerTier} (Normal)`}
          nextValue="Tier 1 (Swaps Halted)"
          isDestructive={true}
        />
      </ConfirmModal>

      {/* Account & Privileges Modal */}
      <AccountDetailsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
}

export default App;


