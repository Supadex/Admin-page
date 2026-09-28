import React from 'react';
import type { AdminRole } from '../../config/roles';
import { ROLE_DEFINITIONS } from '../../config/roles';
import { Badge } from '../ui/Badge';
import { Lock, KeyRound, Eye, SlidersHorizontal } from 'lucide-react';

interface RoleBadgeProps {
  role: AdminRole;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showIcon = true,
  size = 'md',
}) => {
  const def = ROLE_DEFINITIONS[role];

  const getIcon = () => {
    switch (role) {
      case 'OWNER':
        return <KeyRound className="w-3 h-3 text-emerald-500" />;
      case 'GUARDIAN':
        return <Lock className="w-3 h-3 text-amber-500" />;
      case 'OPERATOR':
        return <SlidersHorizontal className="w-3 h-3 text-blue-500" />;
      case 'VIEWER':
      default:
        return <Eye className="w-3 h-3 text-secondary-theme" />;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {showIcon && getIcon()}
      <Badge variant={def.badgeVariant} size={size}>
        {def.role}
      </Badge>
    </div>
  );
};
