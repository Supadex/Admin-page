import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireTypedConfirmation?: boolean;
  confirmationKeyword?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Execute Action',
  cancelText = 'Cancel',
  variant = 'danger',
  requireTypedConfirmation = false,
  confirmationKeyword = 'CONFIRM',
  children,
  isLoading = false,
}) => {
  const [typedValue, setTypedValue] = useState('');

  const isConfirmed = !requireTypedConfirmation || typedValue === confirmationKeyword;

  const handleClose = () => {
    setTypedValue('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    await onConfirm();
    setTypedValue('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div
          className={cn(
            'p-3.5 rounded-xl border flex items-start gap-3 text-xs',
            variant === 'danger' && 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-300',
            variant === 'warning' && 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300',
            variant === 'primary' && 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-300'
          )}
        >
          {variant === 'danger' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400 mt-0.5" />
          ) : (
            <Lock className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold uppercase tracking-wider text-[11px]">
              {variant === 'danger' ? 'High Impact Administrative Action' : 'Verification Required'}
            </div>
            {description && (
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">{description}</p>
            )}
          </div>
        </div>

        {/* Custom Body / Diff Viewer Slots */}
        {children && <div className="space-y-3 pt-1">{children}</div>}

        {/* Typed Confirmation Field */}
        {requireTypedConfirmation && (
          <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-white/[0.06]">
            <label className="text-xs text-neutral-600 dark:text-neutral-300">
              Type <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-white/[0.08] px-1.5 py-0.5 rounded">{confirmationKeyword}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={confirmationKeyword}
              className="w-full bg-neutral-100 dark:bg-[#08090B] border border-neutral-200 dark:border-white/[0.12] rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200 dark:border-white/[0.06]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
