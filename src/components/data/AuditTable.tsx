import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AuditColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface AuditTableProps<T> {
  columns: AuditColumn<T>[];
  data: T[];
  title?: string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function AuditTable<T extends { id?: string | number }>({
  columns,
  data,
  title,
  searchPlaceholder = 'Filter records...',
  searchFilter,
  pageSize = 10,
  emptyMessage = 'No records found',
  className,
  onRowClick,
}: AuditTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, searchQuery));
  }, [data, searchQuery, searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div
      className={cn(
        'rounded-2xl border border-hairline-theme bg-surface-theme overflow-hidden',
        className
      )}
    >
      {(title || searchFilter) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 gap-3 border-b border-hairline-theme">
          {title && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-primary-theme">{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-subtle-theme text-secondary-theme">
                {filteredData.length}
              </span>
            </div>
          )}

          {searchFilter && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary-theme" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-base-theme border border-hairline-theme rounded-xl pl-9 pr-3 py-1.5 text-xs text-primary-theme placeholder:text-secondary-theme focus:outline-none focus:border-active-theme transition-colors"
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-elevated-theme/60 border-b border-hairline-theme text-secondary-theme font-mono uppercase text-[10px] tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 font-medium',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-theme">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => (
                <tr
                  key={item.id ? String(item.id) : idx}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'hover:bg-subtle-theme transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-primary-theme font-mono',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-secondary-theme"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-hairline-theme text-xs text-secondary-theme">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg bg-subtle-theme hover:bg-elevated-theme disabled:opacity-40 text-primary-theme transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg bg-subtle-theme hover:bg-elevated-theme disabled:opacity-40 text-primary-theme transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
