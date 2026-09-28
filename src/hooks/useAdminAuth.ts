import { useState, useMemo } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import type { AdminRole, RoleDefinition } from '../config/roles';
import { ROLE_DEFINITIONS } from '../config/roles';
import { APP_CONFIG } from '../utils/constants';

export function useAdminAuth() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  // Simulated role override: null by default so live connected wallet takes full control
  const [simulatedRole, setSimulatedRole] = useState<AdminRole | null>(null);

  // Determine actual on-chain role based on connected address
  const onChainRole = useMemo<AdminRole>(() => {
    if (!address) return 'VIEWER';
    const cleanAddr = address.toLowerCase();
    
    if (cleanAddr === APP_CONFIG.roles.OWNER.toLowerCase()) return 'OWNER';
    if (cleanAddr === APP_CONFIG.roles.GUARDIAN.toLowerCase()) return 'GUARDIAN';
    if (cleanAddr === APP_CONFIG.roles.OPERATOR.toLowerCase()) return 'OPERATOR';
    
    return 'VIEWER';
  }, [address]);

  // Active role uses simulatedRole if selected, otherwise onChainRole if wallet is connected
  const activeRole: AdminRole = useMemo(() => {
    if (simulatedRole) return simulatedRole;
    if (isConnected && address) return onChainRole;
    return 'VIEWER';
  }, [simulatedRole, isConnected, address, onChainRole]);

  const activeRoleDef: RoleDefinition = useMemo(() => {
    return ROLE_DEFINITIONS[activeRole];
  }, [activeRole]);

  const hasPermission = (permission: string): boolean => {
    return activeRoleDef.permissions.includes(permission);
  };

  const isOwner = activeRole === 'OWNER';
  const isGuardian = activeRole === 'GUARDIAN' || activeRole === 'OWNER';
  const isOperator = activeRole === 'OPERATOR' || activeRole === 'OWNER';

  const effectiveAddress = address || (simulatedRole ? (APP_CONFIG.roles[simulatedRole as keyof typeof APP_CONFIG.roles] || undefined) : undefined);
  const effectiveIsConnected = isConnected || simulatedRole !== null;

  return {
    address: effectiveAddress,
    isConnected: effectiveIsConnected,
    chain,
    activeRole,
    activeRoleDef,
    simulatedRole,
    setSimulatedRole,
    hasPermission,
    isOwner,
    isGuardian,
    isOperator,
    disconnect,
  };
}
