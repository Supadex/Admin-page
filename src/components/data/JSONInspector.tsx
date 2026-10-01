import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Copy, Check, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

export interface JSONInspectorProps {
  title?: string;
  data: Record<string, unknown> | unknown[] | string;
  defaultExpanded?: boolean;
  maxHeight?: string;
  className?: string;
}

/** JSON.stringify cannot encode bigint — coerce to decimal string for inspectors/exports. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export const JSONInspector: React.FC<JSONInspectorProps> = ({
  title,
  data,
  defaultExpanded = true,
  maxHeight = '320px',
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formattedJSON =
    typeof data === 'string' ? data : JSON.stringify(data, jsonReplacer, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formattedJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-hairline-theme bg-surface-theme overflow-hidden text-xs font-mono',
        className
      )}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-subtle-theme border-b border-hairline-theme cursor-pointer select-none hover:bg-elevated-theme transition-colors"
      >
        <div className="flex items-center gap-2 text-primary-theme">
          <Terminal className="w-3.5 h-3.5 text-secondary-theme" />
          <span className="font-semibold">{title || 'Payload Inspector'}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-secondary-theme" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-secondary-theme" />
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-subtle-theme hover:bg-elevated-theme text-primary-theme transition-colors text-[11px] cursor-pointer"
          title="Copy raw JSON"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <pre
          style={{ maxHeight }}
          className="p-3.5 overflow-auto text-primary-theme leading-relaxed scrollbar-thin bg-base-theme/50"
        >
          <code>{formattedJSON}</code>
        </pre>
      )}
    </div>
  );
};
