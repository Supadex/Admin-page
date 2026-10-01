import { useEffect, useMemo, useState } from 'react';
import { parseAbiItem, type Hex, type Log } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { getAddressesForChain } from '../../contracts/addresses';
import { shortenAddress } from '../../utils/formatters';
import { StatCard } from '../data/StatCard';
import { JSONInspector } from '../data/JSONInspector';
import { AuditTable, type AuditColumn } from '../data/AuditTable';
import { Badge, Button, Input } from '../ui';
import {
  Terminal,
  Layers,
  Lock,
  Coins,
  Download,
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

const initializeEvent = parseAbiItem(
  'event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address plugin, uint160 sqrtPriceX96, int24 tick)'
);
const vaultPauseEvent = parseAbiItem('event VaultPauseUpdated(bool paused)');
const feeSplitEvent = parseAbiItem(
  'event FeeSplitUpdated(uint16 daoTreasuryShareBps, uint16 lpStakingShareBps, uint16 insuranceReserveShareBps)'
);
const pluginWlEvent = parseAbiItem('event PluginWhitelisted(address indexed plugin, bool whitelisted)');
const lvrParamsEvent = parseAbiItem(
  'event LVRParametersUpdated(bytes32 indexed poolId, uint32 decayHalfLife, uint24 volatilityAlpha, uint24 minFeeBps, uint24 maxFeeBps)'
);
const operatorEvent = parseAbiItem('event OperatorUpdated(address indexed account, bool active)');

export const AuditLogsConsole = () => {
  const { chain } = useAccount();
  const publicClient = usePublicClient({ chainId: chain?.id });
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<EventCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!publicClient || !addrs) return;
      setIsLoading(true);
      try {
        const entries: AuditLogEntry[] = [];
        const pushLogs = async (
          address: `0x${string}` | undefined,
          event: typeof initializeEvent,
          category: EventCategory,
          action: string,
          signature: string
        ) => {
          if (!address) return;
          try {
            const raw = (await publicClient.getLogs({
              address,
              event,
              fromBlock: 0n,
              toBlock: 'latest',
            })) as Log[];
            for (const log of raw) {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
              entries.push({
                id: `${log.transactionHash}-${log.logIndex}`,
                timestamp: Number(block.timestamp) * 1000,
                blockNumber: Number(log.blockNumber),
                txHash: log.transactionHash || '0x',
                category,
                caller: '—',
                targetContract: address,
                action,
                signature,
                status: 'CONFIRMED',
                gasUsed: 0,
                parameters: (log.args || {}) as Record<string, unknown>,
              });
            }
          } catch {
            /* skip missing contract / event */
          }
        };

        await pushLogs(
          addrs.poolManager,
          initializeEvent,
          'POOL',
          'PoolInitialized',
          'initialize(PoolKey,uint160,bytes)'
        );
        await pushLogs(
          addrs.circuitBreaker,
          vaultPauseEvent,
          'CIRCUIT_BREAKER',
          'VaultPauseUpdated',
          'pauseVault()/unpauseVault()'
        );
        await pushLogs(
          addrs.feeCollector,
          feeSplitEvent,
          'TREASURY',
          'FeeSplitUpdated',
          'setFeeSplit(uint16,uint16,uint16)'
        );
        await pushLogs(
          addrs.pluginWhitelist,
          pluginWlEvent,
          'GOVERNANCE',
          'PluginWhitelisted',
          'setPluginWhitelisted(address,bool)'
        );
        await pushLogs(
          addrs.lvrShieldPlugin,
          lvrParamsEvent,
          'GOVERNANCE',
          'LVRParametersUpdated',
          'setDecayParameters(...)'
        );
        await pushLogs(
          addrs.roles,
          operatorEvent,
          'GOVERNANCE',
          'OperatorUpdated',
          'setOperator(address,bool)'
        );

        entries.sort((a, b) => b.blockNumber - a.blockNumber);
        setLogs(entries);
        setSelectedLog(entries[0] || null);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [publicClient, addrs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesCategory = activeCategory === 'ALL' || log.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.signature.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [logs, activeCategory, searchQuery]);

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(filteredLogs, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
      );
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
          <div className="text-xs font-semibold text-primary-theme">{entry.action}</div>
          <div className="text-[10px] font-mono text-secondary-theme">{entry.signature}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (entry) => <Badge variant="info">{entry.category}</Badge>,
    },
    {
      key: 'blockNumber',
      header: 'Block',
      render: (entry) => (
        <span className="font-mono text-xs text-primary-theme">{entry.blockNumber}</span>
      ),
    },
    {
      key: 'txHash',
      header: 'Tx',
      render: (entry) => (
        <span className="font-mono text-xs text-secondary-theme">
          {shortenAddress(entry.txHash as Hex, 6)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => (
        <Badge variant={entry.status === 'CONFIRMED' ? 'success' : 'warning'}>{entry.status}</Badge>
      ),
    },
  ];

  const categories: EventCategory[] = ['ALL', 'GOVERNANCE', 'CIRCUIT_BREAKER', 'TREASURY', 'POOL'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Indexed Events"
          value={String(logs.length)}
          subValue={isLoading ? 'Scanning logs…' : 'from localnet RPC'}
          icon={<Terminal className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard
          label="Pool Inits"
          value={String(logs.filter((l) => l.category === 'POOL').length)}
          icon={<Layers className="w-4 h-4 text-blue-500" />}
        />
        <StatCard
          label="Circuit Events"
          value={String(logs.filter((l) => l.category === 'CIRCUIT_BREAKER').length)}
          icon={<Lock className="w-4 h-4 text-amber-500" />}
        />
        <StatCard
          label="Treasury Events"
          value={String(logs.filter((l) => l.category === 'TREASURY').length)}
          icon={<Coins className="w-4 h-4 text-purple-500" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border cursor-pointer ${
              activeCategory === c
                ? 'bg-accent-primary-theme text-accent-invert-theme border-transparent'
                : 'bg-surface-theme text-secondary-theme border-hairline-theme'
            }`}
          >
            {c}
          </button>
        ))}
        <div className="flex-1" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events…"
          className="max-w-xs text-xs"
        />
        <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AuditTable
            columns={columns}
            data={filteredLogs}
            onRowClick={setSelectedLog}
            searchFilter={() => true}
            searchPlaceholder=""
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            <Code2 className="w-3.5 h-3.5" />
            Event Parameters
          </div>
          {selectedLog ? (
            <JSONInspector title={selectedLog.action} data={selectedLog} />
          ) : (
            <div className="p-4 rounded-xl border border-hairline-theme text-xs text-secondary-theme">
              Select an event to inspect parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
