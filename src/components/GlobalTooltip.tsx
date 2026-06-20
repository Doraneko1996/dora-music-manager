import React from 'react';
import { createPortal } from 'react-dom';
import { useDataGridTooltip } from '../hooks/useDataGridTooltip';

export const GlobalTooltip: React.FC = () => {
  const tooltipRef = useDataGridTooltip();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-9999 px-3 py-1.5 text-xs font-medium rounded-md shadow-md backdrop-blur-xl bg-white/70 text-zinc-800 dark:bg-zinc-800/70 dark:text-white/80 border border-black/10 dark:border-white/10 pointer-events-none"
      style={{ display: 'none' }}
    />,
    document.body
  );
};
