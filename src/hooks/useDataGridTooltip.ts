import { useEffect, useRef } from 'react';

/**
 * Hook để quản lý Tooltip hiệu năng cao dựa trên DOM event.
 * Được sử dụng cho các danh sách ảo hóa (Virtualized list) để tránh render hàng trăm component Tooltip.
 * 
 * @param containerRef Tham chiếu tới thẻ bao bọc (thường là thẻ scroll).
 * @returns tooltipRef Tham chiếu tới thẻ div dùng làm tooltip.
 */
export function useDataGridTooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tooltipEl = target.closest('[data-custom-tooltip]');

      if (tooltipEl) {
        const text = tooltipEl.getAttribute('data-custom-tooltip');
        if (text) {
          if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
          tooltipTimeoutRef.current = setTimeout(() => {
            if (tooltipRef.current) {
              const rect = tooltipEl.getBoundingClientRect();
              tooltipRef.current.textContent = text;
              tooltipRef.current.style.display = 'block';

              const tooltipRect = tooltipRef.current.getBoundingClientRect();
              let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
              let top = rect.bottom + 6;

              // Tránh tooltip tràn màn hình
              if (left < 10) left = 10;
              if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
              }
              if (top + tooltipRect.height > window.innerHeight - 10) {
                top = rect.top - tooltipRect.height - 6;
              }

              tooltipRef.current.style.left = `${left}px`;
              tooltipRef.current.style.top = `${top}px`;
            }
          }, 400); // Delay 400ms tương tự Shadcn Tooltip
        }
      }
    };

    const handleMouseOut = () => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
    };

    const handleScroll = (_e: Event) => {
      // Chỉ ẩn nếu scroll xảy ra bên trong ứng dụng, bỏ qua nếu scroll trên chính tooltip (dù không có)
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
    };

    const handleContextMenu = () => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('scroll', handleScroll, true); // true để bắt sự kiện scroll của bất kỳ thẻ con nào
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleContextMenu);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mousedown', handleContextMenu);
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);

  return tooltipRef;
}
