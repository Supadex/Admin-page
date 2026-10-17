import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  padHex,
  parseAbiItem,
  toHex,
  zeroHash,
  type Address,
  type Hex,
  type Log,
} from 'viem';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { useAdminAuth } from './useAdminAuth';
import { isUserRejectedError } from './useCircuitBreaker';
import { getAddressesForChain } from '../contracts/addresses';
import {
  CircuitBreakerABI,
  SupaRolesABI,
  SupaTimelockABI,
} from '../contracts/abis';
import type { AdminRole } from '../config/roles';

const operatorEvent = parseAbiItem(
  'event OperatorUpdated(address indexed account, bool active)'
);
const guardianEvent = parseAbiItem(
  'event GuardianUpdated(address indexed guardian, bool active)'
);

function nextSalt(): Hex {
  return padHex(toHex(Date.now()), { size: 32 });
}

export type ManageableRole = Extract<AdminRole, 'OWNER' | 'GUARDIAN' | 'OPERATOR'>;

export interface RoleRosterEntry {
  address: Address;
  role: ManageableRole;
  active: boolean;
  lastUpdatedBlock?: number;
}

export interface RoleTimelockAction {
  id: Hex;
  role: ManageableRole;
  account: Address;
  active: boolean;
  targetContract: Address;
  proposer: string;
  eta: number;
  executed: boolean;
  canceled: boolean;
  callData: Hex;
  salt: Hex;
}

export interface RoleChangeDraft {
  address: Address;
  role: ManageableRole;
  active: boolean;
  currentlyActive: boolean;
  targetContract: Address;
  targetLabel: string;
  delaySeconds: number;
  functionName: string;
  callData: Hex;
}

export function useRoleManagement() {
  const { address, chain } = useAccount();
  const { hasPermission } = useAdminAuth();
  const addrs = getAddressesForChain(chain?.id ?? 31337);
  const publicClient = usePublicClient({ chainId: chain?.id });
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const [roster, setRoster] = useState<RoleRosterEntry[]>([]);
  const [queue, setQueue] = useState<RoleTimelockAction[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [lookupResult, setLookupResult] = useState<RoleRosterEntry[] | null>(null);

  const { data: minDelay } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'minDelay',
    query: { enabled: !!addrs?.timelock },
  });

  const { data: timelockAdmin } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'admin',
    query: { enabled: !!addrs?.timelock },
  });

  const refreshRoster = useCallback(async () => {
    if (!publicClient || !addrs) return;
    setIsLoadingRoster(true);
    try {
      const entries: RoleRosterEntry[] = [];
      const seen = new Set<string>();

      const pushActive = (
        account: Address,
        role: ManageableRole,
        active: boolean,
        block?: number
      ) => {
        const key = `${role}:${account.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({
          address: account,
          role,
          active,
          lastUpdatedBlock: block,
        });
      };

      const loadOperatorLogs = async () => {
        try {
          const raw = (await publicClient.getLogs({
            address: addrs.roles,
            event: operatorEvent,
            fromBlock: 0n,
            toBlock: 'latest',
          })) as Log[];
          const latest = new Map<string, { active: boolean; block: number }>();
          for (const log of raw) {
            const account = (log.args as { account?: Address })?.account;
            const active = (log.args as { active?: boolean })?.active;
            if (!account || active === undefined) continue;
            const key = account.toLowerCase();
            const block = Number(log.blockNumber ?? 0);
            const prev = latest.get(key);
            if (!prev || block >= prev.block) {
              latest.set(key, { active, block });
            }
          }
          for (const [addr, meta] of latest) {
            if (!meta.active) continue;
            const live = (await publicClient.readContract({
              address: addrs.roles,
              abi: SupaRolesABI,
              functionName: 'isOperator',
              args: [getAddress(addr)],
            })) as boolean;
            if (live) pushActive(getAddress(addr), 'OPERATOR', true, meta.block);
          }
        } catch {
          /* skip */
        }
      };

      const loadGuardianLogs = async () => {
        try {
          const raw = (await publicClient.getLogs({
            address: addrs.circuitBreaker,
            event: guardianEvent,
            fromBlock: 0n,
            toBlock: 'latest',
          })) as Log[];
          const latest = new Map<string, { active: boolean; block: number }>();
          for (const log of raw) {
            const guardian = (log.args as { guardian?: Address })?.guardian;
            const active = (log.args as { active?: boolean })?.active;
            if (!guardian || active === undefined) continue;
            const key = guardian.toLowerCase();
            const block = Number(log.blockNumber ?? 0);
            const prev = latest.get(key);
            if (!prev || block >= prev.block) {
              latest.set(key, { active, block });
            }
          }
          for (const [addr, meta] of latest) {
            if (!meta.active) continue;
            const live = (await publicClient.readContract({
              address: addrs.circuitBreaker,
              abi: CircuitBreakerABI,
              functionName: 'isGuardian',
              args: [getAddress(addr)],
            })) as boolean;
            if (live) pushActive(getAddress(addr), 'GUARDIAN', true, meta.block);
          }
        } catch {
          /* skip */
        }
      };

      await Promise.all([loadOperatorLogs(), loadGuardianLogs()]);

      const candidateOwners = new Set<string>();
      if (address) candidateOwners.add(address.toLowerCase());
      if (timelockAdmin) candidateOwners.add((timelockAdmin as string).toLowerCase());
      for (const e of entries) candidateOwners.add(e.address.toLowerCase());

      for (const addr of candidateOwners) {
        try {
          const isProposer = (await publicClient.readContract({
            address: addrs.timelock,
            abi: SupaTimelockABI,
            functionName: 'isProposer',
            args: [getAddress(addr)],
          })) as boolean;
          if (isProposer) pushActive(getAddress(addr), 'OWNER', true);
        } catch {
          /* skip */
        }
      }

      entries.sort((a, b) => {
        const order = { OWNER: 0, GUARDIAN: 1, OPERATOR: 2 } as const;
        return order[a.role] - order[b.role] || a.address.localeCompare(b.address);
      });
      setRoster(entries);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [publicClient, addrs, address, timelockAdmin]);

  useEffect(() => {
    void refreshRoster();
  }, [refreshRoster]);

  const lookupAddress = useCallback(
    async (raw: string) => {
      if (!publicClient || !addrs || !isAddress(raw)) {
        setLookupResult(null);
        return [];
      }
      const account = getAddress(raw);
      const found: RoleRosterEntry[] = [];
      try {
        const [isProposer, isGuardian, isOperator] = await Promise.all([
          publicClient.readContract({
            address: addrs.timelock,
            abi: SupaTimelockABI,
            functionName: 'isProposer',
            args: [account],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: addrs.circuitBreaker,
            abi: CircuitBreakerABI,
            functionName: 'isGuardian',
            args: [account],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: addrs.roles,
            abi: SupaRolesABI,
            functionName: 'isOperator',
            args: [account],
          }) as Promise<boolean>,
        ]);
        if (isProposer) found.push({ address: account, role: 'OWNER', active: true });
        if (isGuardian) found.push({ address: account, role: 'GUARDIAN', active: true });
        if (isOperator) found.push({ address: account, role: 'OPERATOR', active: true });
      } catch {
        /* skip */
      }
      setLookupResult(found);
      return found;
    },
    [publicClient, addrs]
  );

  const checkRoleActive = useCallback(
    async (account: Address, role: ManageableRole): Promise<boolean> => {
      if (!publicClient || !addrs) return false;
      if (role === 'OWNER') {
        return !!(await publicClient.readContract({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'isProposer',
          args: [account],
        }));
      }
      if (role === 'GUARDIAN') {
        return !!(await publicClient.readContract({
          address: addrs.circuitBreaker,
          abi: CircuitBreakerABI,
          functionName: 'isGuardian',
          args: [account],
        }));
      }
      return !!(await publicClient.readContract({
        address: addrs.roles,
        abi: SupaRolesABI,
        functionName: 'isOperator',
        args: [account],
      }));
    },
    [publicClient, addrs]
  );

  const buildDraft = useCallback(
    async (
      rawAddress: string,
      role: ManageableRole,
      active: boolean
    ): Promise<RoleChangeDraft> => {
      if (!addrs?.timelock || !addrs.roles || !addrs.circuitBreaker) {
        throw new Error('Protocol contracts not deployed');
      }
      if (!isAddress(rawAddress)) throw new Error('Invalid wallet address');
      const account = getAddress(rawAddress);
      const currentlyActive = await checkRoleActive(account, role);

      if (role === 'OWNER') {
        const callData = encodeFunctionData({
          abi: SupaTimelockABI,
          functionName: 'setProposer',
          args: [account, active],
        });
        return {
          address: account,
          role,
          active,
          currentlyActive,
          targetContract: addrs.timelock,
          targetLabel: 'SupaTimelock',
          delaySeconds: 0,
          functionName: 'setProposer(address,bool)',
          callData,
        };
      }

      if (role === 'GUARDIAN') {
        const callData = encodeFunctionData({
          abi: CircuitBreakerABI,
          functionName: 'setGuardian',
          args: [account, active],
        });
        return {
          address: account,
          role,
          active,
          currentlyActive,
          targetContract: addrs.circuitBreaker,
          targetLabel: 'CircuitBreaker',
          delaySeconds: Number(minDelay ?? 86400n),
          functionName: 'setGuardian(address,bool)',
          callData,
        };
      }

      const callData = encodeFunctionData({
        abi: SupaRolesABI,
        functionName: 'setOperator',
        args: [account, active],
      });
      return {
        address: account,
        role,
        active,
        currentlyActive,
        targetContract: addrs.roles,
        targetLabel: 'SupaRoles',
        delaySeconds: Number(minDelay ?? 86400n),
        functionName: 'setOperator(address,bool)',
        callData,
      };
    },
    [addrs, checkRoleActive, minDelay]
  );

  const submitRoleChange = useCallback(
    async (draft: RoleChangeDraft, proposer: string) => {
      if (!addrs?.timelock) throw new Error('Timelock not deployed');

      if (draft.role === 'OWNER') {
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'setProposer',
          args: [draft.address, draft.active],
        });
        await refreshRoster();
        return { mode: 'direct' as const, id: null };
      }

      const predecessor = zeroHash;
      const salt = nextSalt();
      const delay = minDelay ?? 86400n;
      const eta = Date.now() + Number(delay) * 1000;

      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'schedule',
        args: [draft.targetContract, 0n, draft.callData, predecessor, salt, delay],
      });

      const id = (await publicClient?.readContract({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'hashOperation',
        args: [draft.targetContract, 0n, draft.callData, predecessor, salt],
      })) as Hex;

      setQueue((prev) => [
        {
          id,
          role: draft.role,
          account: draft.address,
          active: draft.active,
          targetContract: draft.targetContract,
          proposer,
          eta,
          executed: false,
          canceled: false,
          callData: draft.callData,
          salt,
        },
        ...prev,
      ]);

      // Anvil: warp past minDelay and execute immediately
      if ((chain?.id ?? 31337) === 31337 && publicClient) {
        await publicClient.request({
          method: 'evm_increaseTime',
          params: [Number(delay) + 1],
        } as never);
        await publicClient.request({ method: 'evm_mine', params: [] } as never);
        await writeContractAsync({
          address: addrs.timelock,
          abi: SupaTimelockABI,
          functionName: 'execute',
          args: [draft.targetContract, 0n, draft.callData, predecessor, salt],
        });
        setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
        await refreshRoster();
      }

      return { mode: 'timelock' as const, id };
    },
    [addrs, writeContractAsync, minDelay, publicClient, chain?.id, refreshRoster]
  );

  const executeRoleAction = useCallback(
    async (id: string) => {
      if (!addrs?.timelock || !publicClient) throw new Error('Not deployed');
      const action = queue.find((a) => a.id === id);
      if (!action) return;

      const chainId = chain?.id ?? 31337;
      if (chainId === 31337) {
        const remainingSec = Math.max(0, Math.ceil((action.eta - Date.now()) / 1000));
        if (remainingSec > 0) {
          await publicClient.request({
            method: 'evm_increaseTime' as 'eth_chainId',
            params: [remainingSec + 1] as never,
          });
          await publicClient.request({
            method: 'evm_mine' as 'eth_chainId',
            params: [] as never,
          });
        }
      }

      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'execute',
        args: [action.targetContract, 0n, action.callData, zeroHash, action.salt],
      });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, executed: true } : a)));
      await refreshRoster();
    },
    [addrs, queue, writeContractAsync, publicClient, chain?.id, refreshRoster]
  );

  const cancelRoleAction = useCallback(
    async (id: string) => {
      if (!addrs?.timelock) throw new Error('Not deployed');
      await writeContractAsync({
        address: addrs.timelock,
        abi: SupaTimelockABI,
        functionName: 'cancel',
        args: [id as Hex],
      });
      setQueue((prev) => prev.map((a) => (a.id === id ? { ...a, canceled: true } : a)));
    },
    [addrs, writeContractAsync]
  );

  const displayRoster = useMemo(() => {
    if (!lookupResult) return roster;
    if (lookupResult.length === 0) return [];
    const keys = new Set(lookupResult.map((e) => `${e.role}:${e.address.toLowerCase()}`));
    const fromRoster = roster.filter((e) => keys.has(`${e.role}:${e.address.toLowerCase()}`));
    const missing = lookupResult.filter(
      (e) => !fromRoster.some((r) => r.role === e.role && r.address.toLowerCase() === e.address.toLowerCase())
    );
    return [...fromRoster, ...missing];
  }, [roster, lookupResult]);

  return {
    roster: displayRoster,
    fullRoster: roster,
    queue,
    isLoadingRoster,
    isSubmitting: isPending || isConfirming,
    minDelaySeconds: Number(minDelay ?? 86400n),
    canManageRoles: hasPermission('admin.roles.manage'),
    isAnvil: (chain?.id ?? 31337) === 31337,
    address,
    buildDraft,
    submitRoleChange,
    executeRoleAction,
    cancelRoleAction,
    refreshRoster,
    lookupAddress,
    clearLookup: () => setLookupResult(null),
    isUserRejectedError,
  };
}
