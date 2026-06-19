import { useMemo } from 'react';

/**
 * Hook để tạo Map chứa vị trí index đầu tiên của mỗi chữ cái (dùng cho AlphabetScroller).
 * Các ký tự không phải chữ cái A-Z sẽ được gom vào nhóm `#`.
 * 
 * @param items Mảng dữ liệu đầu vào.
 * @param extractString Hàm trích xuất chuỗi cần phân nhóm từ mỗi item.
 * @param dependencies Mảng các dependency để trigger tính toán lại (ngoài items).
 * @returns Map<string, number> ánh xạ từ Chữ cái -> Vị trí index.
 */
export function useAlphabetMap<T>(
  items: T[],
  extractString: (item: T) => string | undefined | null,
  dependencies: any[] = []
) {
  return useMemo(() => {
    const map = new Map<string, number>();

    items.forEach((item, index) => {
      const val = extractString(item);
      if (!val) return;

      let firstChar = val.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(firstChar)) {
        firstChar = '#'; // Gom nhóm số và ký hiệu thành #
      }

      if (!map.has(firstChar)) {
        map.set(firstChar, index);
      }
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ...dependencies]);
}
