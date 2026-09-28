import { useState, useMemo } from 'react';
import { APP_CONFIG } from '../../utils/constants';
import { shortenAddress } from '../../utils/formatters';
import { StatCard } from '../data/StatCard';
import { JSONInspector } from '../data/JSONInspector';
import { AuditTable, type AuditColumn } from '../data/AuditTable';
import { Badge, Button, Input } from '../ui';
import {
  Terminal,
  Activity,
  Layers,
  Lock,
  Coins,
  ExternalLink,
  Download,
  Clock,
  Code2,
} from 'lucide-react';

export type EventCategory = 'ALL' | 'GOVERNANCE' | 'CIRCUIT_BREAKER' | 'TREASURY' | 'POOL';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  blockNumber: number;
  txHash: string;
  category: EventCategory;
  caller: string;
  targetContract: string;
  action: string;
  signature: string;
  status: 'CONFIRMED' | 'TIMELOCKED' | 'FAILED';
  gasUsed: number;
  parameters: Record<string, unknown>;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: Date.now() - 1000 * 60 * 12,
    blockNumber: 6842109,
    txHash: '0x9a8f3b11e9a7c204918e7b301c2384a51e60f7e1b5d92a104c8e71b2390f4e1982',
    category: 'TREASURY',
    caller: APP_CONFIG.roles.OWNER,
    targetContract: APP_CONFIG.contracts.feeCollector,
    action: 'FeeSplitUpdated',
    signature: 'setFeeSplit(uint16,uint16,uint16)',
    status: 'CONFIRMED',
    gasUsed: 46210,
    parameters: {
      daoTreasuryBps: 6000,
      lpStakingBps: 3000,
      insuranceReserveBps: 1000,
      targetTreasury: APP_CONFIG.roles.OWNER,
    },
  },
  {
    id: 'log-2',
    timestamp: Date.now() - 1000 * 60 * 48,
    blockNumber: 6841982,
    txHash: '0x4c2e177a8809ff43a21908bc11293d047a2fb092c4b8109d949c81b94ea120aa',
    category: 'GOVERNANCE',
    caller: APP_CONFIG.roles.OWNER,
    targetContract: APP_CONFIG.contracts.volatilityOracle,
    action: 'DecayParameterCalibrated',
    signature: 'setDecayParameters(PoolId,uint32,uint32,uint16,uint16)',
    status: 'CONFIRMED',
    gasUsed: 52180,
    parameters: {
      poolId: '0x1a8f...90ab',
      volatilityAlpha: 840,
      decayRate: 4200,
      minSpreadBps: 5,
      maxSpreadBps: 250,
    },
  },
  {
    id: 'log-3',
    timestamp: Date.now() - 1000 * 60 * 180,
    blockNumber: 6841520,
    txHash: '0x10f7a2298bc1982a74c102948f92a104c8e71b2390f4e19827a8b3f11e9a7c20',
    category: 'CIRCUIT_BREAKER',
    caller: APP_CONFIG.roles.GUARDIAN,
    targetContract: APP_CONFIG.contracts.circuitBreaker,
    action: 'TimelockUnpauseQueued',
    signature: 'queueUnpause(uint8,address)',
    status: 'TIMELOCKED',
    gasUsed: 38900,
    parameters: {
      tier: 1,
      gracePeriodSeconds: 86400,
      executableAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    },
  },
  {
    id: 'log-4',
    timestamp: Date.now() - 1000 * 60 * 360,
    blockNumber: 6840890,
    txHash: '0x7e2a90f7102948f92a104c8e71b2390f4e19827a8b3f11e9a7c2098bc1982a74',
    category: 'POOL',
    caller: APP_CONFIG.roles.OPERATOR,
    targetContract: APP_CONFIG.contracts.supaPoolManager,
    action: 'PoolInitialized',
    signature: 'initialize(PoolKey,uint160,bytes)',
    status: 'CONFIRMED',
    gasUsed: 142800,
    parameters: {
      pair: 'USDC / USDT',
      curveType: 'StableAMM',
      feeTier: '0.01%',
      initialSqrtPriceX96: '79228162514264337593543950336',
    },
  },
];

export const AuditLogsConsole = () => {
  const [logs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [activeCategory, setActiveCategory] = useState<EventCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(INITIAL_AUDIT_LOGS[0]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesCategory = activeCategory === 'ALL' || log.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.caller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.signature.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [logs, activeCategory, searchQuery]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `supadex-audit-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const columns: AuditColumn<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Action / Event',
      render: (entry) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-primary-theme flex items-center gap-2">
            <span>{entry.action}</span>
            <Badge
              variant={
                entry.category === 'GOVERNANCE'
                  ? 'brand'
                  : entry.category === 'CIRCUIT_BREAKER'
                  ? 'danger'
                  : entry.category === 'TREASURY'
                  ? 'success'
                  : 'info'
              }
              size="sm"
            >
              {entry.category}
            </Badge>
          </div>
          <div className="text-[11px] font-mono text-secondary-theme truncate max-w-[200px]">
            {entry.signature}
          </div>
        </div>
      ),
    },
    {
      key: 'blockNumber',
      header: 'Block / Time',
      render: (entry) => (
        <div className="space-y-0.5 font-mono text-xs">
          <div className="text-primary-theme font-medium">#{entry.blockNumber}</div>
          <div className="text-[10px] text-secondary-theme">
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'caller',
      header: 'Authorized Caller',
      render: (entry) => (
        <span className="font-mono text-xs text-primary-theme">
          {shortenAddress(entry.caller, 4)}
        </span>
      ),
    },
    {
      key: 'gasUsed',
      header: 'Gas Used',
      render: (entry) => (
        <span className="font-mono text-xs text-secondary-theme">
          {entry.gasUsed.toLocaleString()} gas
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Execution Status',
      render: (entry) => (
        <Badge
          variant={
            entry.status === 'CONFIRMED'
              ? 'success'
              : entry.status === 'TIMELOCKED'
              ? 'warning'
              : 'danger'
          }
          size="sm"
        >
          {entry.status}
        </Badge>
      ),
    },
    {
      key: 'txHash',
      header: 'Tx Hash',
      render: (entry) => (
        <a
          href={`https://sepolia.etherscan.io/tx/${entry.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-secondary-theme hover:text-primary-theme"
          onClick={(e) => e.stopPropagation()}
        >
          <span>{shortenAddress(entry.txHash, 4)}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Telemetry Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Logged Events"
          value={logs.length.toString()}
          subValue="On-Chain Emitted"
          icon={<Terminal className="w-4 h-4 text-emerald-500" />}
          badgeText="Verified"
          badgeVariant="success"
        />
        <StatCard
          label="Governance Actions"
          value={logs.filter((l) => l.category === 'GOVERNANCE').length.toString()}
          subValue="Calibrations & Votes"
          icon={<Activity className="w-4 h-4 text-blue-500" />}
          badgeText="Active"
          badgeVariant="info"
        />
        <StatCard
          label="Circuit Breaker Events"
          value={logs.filter((l) => l.category === 'CIRCUIT_BREAKER').length.toString()}
          subValue="Isolation & Timelocks"
          icon={<Lock className="w-4 h-4 text-amber-500" />}
          badgeText="Protected"
          badgeVariant="warning"
        />
        <StatCard
          label="Treasury & Fee Sweeps"
          value={logs.filter((l) => l.category === 'TREASURY').length.toString()}
          subValue="Protocol Revenue"
          icon={<Coins className="w-4 h-4 text-purple-500" />}
          badgeText="Dual-Ledger"
          badgeVariant="default"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'GOVERNANCE', 'CIRCUIT_BREAKER', 'TREASURY', 'POOL'] as EventCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-accent-primary-theme text-accent-invert-theme font-semibold shadow-xs'
                  : 'bg-subtle-theme text-secondary-theme hover:text-primary-theme border border-hairline-theme'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Input
              type="text"
              placeholder="Search action, caller, hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs font-mono pr-8"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="text-xs font-mono gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Main Audit Logs Table & Calldata Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-theme" />
              <h3 className="text-sm font-semibold tracking-tight text-primary-theme">
                On-Chain Event Ledger
              </h3>
            </div>
            <span className="text-xs font-mono text-secondary-theme">
              {filteredLogs.length} events found
            </span>
          </div>

          <AuditTable
            columns={columns}
            data={filteredLogs}
            onRowClick={(entry: AuditLogEntry) => setSelectedLog(entry)}
            searchFilter={(entry, q) =>
              entry.action.toLowerCase().includes(q.toLowerCase()) ||
              entry.txHash.toLowerCase().includes(q.toLowerCase()) ||
              entry.caller.toLowerCase().includes(q.toLowerCase())
            }
            searchPlaceholder="Filter audit records..."
          />
        </div>

        {/* Selected Event Calldata & Raw State Inspector */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary-theme" />
              <h3 className="text-sm font-semibold tracking-tight text-primary-theme">
                Event Calldata & Parameter Tree
              </h3>
            </div>
            {selectedLog && (
              <Badge variant="brand" size="sm" className="font-mono text-[10px]">
                {selectedLog.action}
              </Badge>
            )}
          </div>

          {selectedLog ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-surface-theme border border-hairline-theme space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
                    <span className="text-[10px] font-mono uppercase text-secondary-theme">
                      Target Contract
                    </span>
                    <div className="font-mono font-medium text-primary-theme truncate">
                      {shortenAddress(selectedLog.targetContract, 6)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1">
                    <span className="text-[10px] font-mono uppercase text-secondary-theme">
                      Timestamp
                    </span>
                    <div className="font-mono font-medium text-primary-theme">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-subtle-theme border border-hairline-theme space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] uppercase text-secondary-theme">Function Signature</div>
                  <div className="text-emerald-500 break-all font-semibold">
                    {selectedLog.signature}
                  </div>
                </div>
              </div>

              <JSONInspector
                title={`Parameters: ${selectedLog.action}`}
                data={selectedLog.parameters}
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-surface-theme border border-hairline-theme text-center space-y-2">
              <Clock className="w-8 h-8 text-secondary-theme mx-auto opacity-50" />
              <p className="text-xs text-secondary-theme">
                Select an on-chain event from the ledger table to inspect raw ABI calldata parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
