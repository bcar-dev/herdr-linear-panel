// How a list of lines is set out in columns

// The items in `columns` columns, filled down each column before the next: six items in 3 columns make 2 rows,
// [[1, 2], [3, 4], [5, 6]]. A column holds as many as the rows need, the last ones fewer; no empty column
/**
 * @template T
 * @param {T[]} items
 * @param {number} columns
 * @returns {T[][]}
 */
export function arrange(items, columns) {
  const rows = Math.ceil(items.length / Math.max(1, columns));
  return Array.from({ length: Math.ceil(items.length / Math.max(1, rows)) }, (_, nth) =>
    items.slice(nth * rows, (nth + 1) * rows));
}
