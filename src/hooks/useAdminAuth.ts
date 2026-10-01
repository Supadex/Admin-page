import { useMemo } from 'react';
import { useAccount, useDisconnect, useReadContract } from 'wagmi';
import type { AdminRole, RoleDefinition } from '../config/roles';
import { ROLE_DEFINITIONS } from '../config/roles';
import { getAddressesForChain } from '../contracts/addresses';
import { CircuitBreakerABI, SupaRolesABI, SupaTimelockABI } from '../contracts/abis';

export function useAdminAuth() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const addrs = getAddressesForChain(chain?.id);

  const { data: isGuardian } = useReadContract({
    address: addrs?.circuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isGuardian',
    args: address ? [address] : undefined,
    query: { enabled: !!addrs?.circuitBreaker && !!address },
  });

  const { data: isOperatorOnChain } = useReadContract({
    address: addrs?.roles,
    abi: SupaRolesABI,
    functionName: 'isOperator',
    args: address ? [address] : undefined,
    query: { enabled: !!addrs?.roles && !!address },
  });

  const { data: isTimelockProposer } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'isProposer',
    args: address ? [address] : undefined,
    query: { enabled: !!addrs?.timelock && !!address },
  });

  const { data: isTimelockAdmin } = useReadContract({
    address: addrs?.timelock,
    abi: SupaTimelockABI,
    functionName: 'admin',
    query: { enabled: !!addrs?.timelock },
  });

  const onChainRole = useMemo<AdminRole>(() => {
    if (!address || !isConnected) return 'VIEWER';
    const isOwnerActor =
      !!isTimelockProposer ||
      (!!isTimelockAdmin && address.toLowerCase() === (isTimelockAdmin as string).toLowerCase());
    if (isOwnerActor) return 'OWNER';
    if (isGuardian) return 'GUARDIAN';
    if (isOperatorOnChain) return 'OPERATOR';
    return 'VIEWER';
  }, [address, isConnected, isGuardian, isOperatorOnChain, isTimelockProposer, isTimelockAdmin]);

  const activeRoleDef: RoleDefinition = ROLE_DEFINITIONS[onChainRole];

  const hasPermission = (permission: string): boolean => {
    return activeRoleDef.permissions.includes(permission);
  };

  return {
    address,
    isConnected,
    chain,
    activeRole: onChainRole,
    activeRoleDef,
    simulatedRole: null as AdminRole | null,
    setSimulatedRole: (_role: AdminRole | null) => {
      /* simulation disabled for production wiring — keep API for AccountDetailsModal */
    },
    hasPermission,
    isOwner: onChainRole === 'OWNER',
    isGuardian: onChainRole === 'GUARDIAN' || onChainRole === 'OWNER',
    isOperator: onChainRole === 'OPERATOR' || onChainRole === 'OWNER',
    disconnect,
    addresses: addrs,
    isProtocolDeployed: !!addrs,
  };
}
