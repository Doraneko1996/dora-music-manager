import React from 'react';
import { createPortal } from 'react-dom';
import { useDataGridTooltip } from '../hooks/useDataGridTooltip';

export const GlobalTooltip: React.FC = () => {
  const tooltipRef = useDataGridTooltip();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-9999 px-3 py-1.5 text-xs font-medium rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-white/90 text-zinc-900 dark:bg-zinc-900/95 dark:text-zinc-100 border border-black/20 dark:border-white/20 pointer-events-none"
      style={{ display: 'none' }}
    />,
    document.body
  );
};
