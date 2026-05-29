// Closes gaps in `rank` by reassigning each item to its 1-based position in the list.
// Use after filtering or sorting when you want consecutive 1..N ranks instead of original
// values (which may have gaps from hidden/archived items).
export function compressRanks<T extends { rank: number }>(items: T[]): T[] {
	return items.map((item, i) => ({ ...item, rank: i + 1 }));
}
