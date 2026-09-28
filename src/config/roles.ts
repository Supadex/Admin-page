export type AdminRole = 'OWNER' | 'GUARDIAN' | 'OPERATOR' | 'VIEWER';

export interface RoleDefinition {
  role: AdminRole;
  title: string;
  description: string;
  badgeVariant: 'success' | 'warning' | 'info' | 'default';
  permissions: string[];
}

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  OWNER: {
    role: 'OWNER',
    title: 'Protocol Owner (Timelock MultiSig)',
    description: 'Full governing authority over protocol fees, hook approvals, contract upgrades, and emergency unpauses.',
    badgeVariant: 'success',
    permissions: [
      'admin.pool.create',
      'admin.pool.configure_fees',
      'admin.circuit_breaker.trigger',
      'admin.circuit_breaker.reset',
      'admin.oracle.calibrate',
      'admin.fees.sweep',
      'admin.hooks.whitelist',
    ],
  },
  GUARDIAN: {
    role: 'GUARDIAN',
    title: 'Emergency Guardian (Security Council)',
    description: 'Fast-response authorized signer for triggering protocol-wide circuit breakers and emergency halts.',
    badgeVariant: 'warning',
    permissions: [
      'admin.circuit_breaker.trigger',
      'admin.oracle.calibrate',
    ],
  },
  OPERATOR: {
    role: 'OPERATOR',
    title: 'Volatility Operator & Calibrator',
    description: 'Authorized operator for adjusting LVR decay rates, volatility oracle parameters, and pool routing configs.',
    badgeVariant: 'info',
    permissions: [
      'admin.oracle.calibrate',
      'admin.pool.create',
    ],
  },
  VIEWER: {
    role: 'VIEWER',
    title: 'Observer / Read-Only Auditor',
    description: 'Unauthenticated or standard wallet account. Read access to on-chain telemetry, state inspection, and audit logs.',
    badgeVariant: 'default',
    permissions: [],
  },
};

export const CONTRACT_ROLES: Record<string, AdminRole> = {
  // Canonical configured test addresses
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc': 'OWNER',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9': 'GUARDIAN',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955': 'OPERATOR',
};
