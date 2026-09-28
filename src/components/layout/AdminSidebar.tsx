import React from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  Activity,
  Layers,
  Lock,
  SlidersHorizontal,
  Coins,
  Terminal,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'pools'
  | 'create-pool'
  | 'circuit-breaker'
  | 'lvr-oracle'
  | 'treasury'
  | 'audit-logs';

export interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { activeRole, isConnected, activeRoleDef } = useAdminAuth();

  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Telemetry Overview',
      icon: Activity,
      badge: 'Live',
    },
    {
      id: 'pools' as AdminTab,
      label: 'Pool Initializer',
      icon: Layers,
    },
    {
      id: 'circuit-breaker' as AdminTab,
      label: 'Circuit Breaker',
      icon: Lock,
      badge: 'Active',
      badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'lvr-oracle' as AdminTab,
      label: 'LVR & Volatility',
      icon: SlidersHorizontal,
    },
    {
      id: 'treasury' as AdminTab,
      label: 'Fee Treasury',
      icon: Coins,
    },
    {
      id: 'audit-logs' as AdminTab,
      label: 'Audit & Raw State',
      icon: Terminal,
    },
  ];

  return (
    <aside
      className={cn(
        'shrink-0 h-screen select-none border-r transition-all duration-300 z-30 flex flex-col sticky top-0',
        'bg-surface-theme border-hairline-theme text-primary-theme',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-hairline-theme h-16 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/assets/images/supadao-logo.png"
            alt="SupaDex"
            className="w-8 h-8 rounded-lg object-contain shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight text-primary-theme truncate">
                SupaDex
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-secondary-theme">
                Governance & Admin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-secondary-theme">
            Control Center
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer',
                isActive
                  ? 'bg-accent-primary-theme text-accent-invert-theme font-semibold shadow-sm'
                  : 'text-secondary-theme hover:text-primary-theme hover:bg-subtle-theme'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-accent-invert-theme' : 'text-secondary-theme group-hover:text-primary-theme'
                )}
              />

              {!collapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded-full border',
                        isActive
                          ? 'bg-black/10 dark:bg-white/10 text-accent-invert-theme border-current'
                          : item.badgeColor || 'bg-subtle-theme text-secondary-theme border-hairline-theme'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Institutional Controls */}
      <div className="p-3 border-t border-hairline-theme space-y-2 shrink-0 bg-surface-theme">
        {/* Role Badge Indicator */}
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-subtle-theme border border-hairline-theme flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className={`w-3.5 h-3.5 shrink-0 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary-theme">
                  Access Level
                </span>
                <span className="text-xs font-semibold text-primary-theme truncate">
                  {isConnected ? activeRoleDef.title.split('(')[0].trim() : 'Guest / Viewer'}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${
              activeRole === 'OWNER'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : activeRole === 'GUARDIAN'
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : activeRole === 'OPERATOR'
                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                : 'bg-subtle-theme text-secondary-theme border-hairline-theme'
            }`}>
              {activeRole}
            </span>
          </div>
        ) : (
          <div className="flex justify-center p-1.5" title={`Access Level: ${activeRole}`}>
            <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-neutral-400'}`} />
          </div>
        )}

        {/* Theme & Collapse Row */}
        <div className="flex items-center justify-between pt-1 gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-secondary-theme hover:text-primary-theme hover:bg-subtle-theme transition-colors cursor-pointer"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl text-secondary-theme hover:text-primary-theme hover:bg-subtle-theme transition-colors cursor-pointer"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
