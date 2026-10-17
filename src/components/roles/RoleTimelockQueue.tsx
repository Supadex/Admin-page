import React, { useEffect, useState } from 'react';
import type { RoleTimelockAction } from '../../hooks/useRoleManagement';
import { Badge, Button } from '../ui';
import { shortenAddress } from '../../utils/formatters';
import { Clock, Play, XCircle } from 'lucide-react';

interface RoleTimelockQueueProps {
  queue: RoleTimelockAction[];
  onExecute: (id: string) => void;
  onCancel: (id: string) => void;
  canExecute: boolean;
  isSubmitting: boolean;
  minDelaySeconds?: number;
  isAnvil?: boolean;
}

export const RoleTimelockQueue: React.FC<RoleTimelockQueueProps> = ({
  queue,
  onExecute,
  onCancel,
  canExecute,
  isSubmitting,
  minDelaySeconds = 86400,
  isAnvil = false,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (eta: number) => {
    const diff = eta - currentTime;
    if (diff <= 0) return 'READY FOR EXECUTION';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}h ${mins
      .toString()
      .padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const delayLabel =
    minDelaySeconds >= 3600
      ? `${Math.round(minDelaySeconds / 3600)}h Timelock`
      : `${minDelaySeconds}s Timelock`;

  const activeQueue = queue.filter((q) => !q.executed && !q.canceled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-secondary-theme" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-theme">
            Pending Role Operations
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-secondary-theme">
            Delay: <span className="text-primary-theme font-semibold">{delayLabel}</span>
            {isAnvil ? ' · Anvil warps on Execute' : ''}
          </span>
          <Badge variant={activeQueue.length > 0 ? 'warning' : 'default'}>
            {activeQueue.length} Pending
          </Badge>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface-theme border border-hairline-theme text-center">
          <p className="text-xs text-secondary-theme font-mono">
            No timelocked role grants or revokes currently queued.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {queue.map((item) => {
            const isReady = item.eta <= currentTime && !item.executed && !item.canceled;
            const verb = item.active ? 'GRANT' : 'REVOKE';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  item.executed
                    ? 'bg-surface-theme/50 border-hairline-theme opacity-60'
                    : item.canceled
                      ? 'bg-surface-theme/30 border-hairline-theme opacity-40 line-through'
                      : isReady
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-surface-theme border-hairline-theme'
                }`}
              >
                <div className="space-y-1 font-mono">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-primary-theme">
                      {shortenAddress(item.id, 6)}
                    </span>
                    <Badge
                      variant={
                        item.executed
                          ? 'success'
                          : item.canceled
                            ? 'default'
                            : isReady
                              ? 'warning'
                              : 'info'
                      }
                    >
                      {item.executed
                        ? 'EXECUTED'
                        : item.canceled
                          ? 'CANCELED'
                          : isReady
                            ? 'READY'
                            : 'LOCKED'}
                    </Badge>
                    <span className="text-xs text-primary-theme font-medium">
                      {verb} {item.role}: {shortenAddress(item.account, 6)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-secondary-theme">
                    <span>Proposer: {item.proposer}</span>
                    <span>•</span>
                    <span>ETA: {new Date(item.eta).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right font-mono">
                    <span className="text-[10px] uppercase text-secondary-theme block">
                      Timelock Countdown
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        item.executed || item.canceled
                          ? 'text-secondary-theme'
                          : isReady
                            ? 'text-amber-500 animate-pulse'
                            : 'text-primary-theme'
                      }`}
                    >
                      {item.executed
                        ? 'Completed'
                        : item.canceled
                          ? 'Revoked'
                          : formatCountdown(item.eta)}
                    </span>
                  </div>

                  {!item.executed && !item.canceled && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canExecute || isSubmitting}
                        onClick={() => onCancel(item.id)}
                        className="text-xs font-mono text-red-400 hover:text-red-300"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!isReady || !canExecute || isSubmitting}
                        onClick={() => onExecute(item.id)}
                        className="text-xs font-mono gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Execute</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
