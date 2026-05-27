export function contrastText(hex: string): string {
	const h = hex.replace('#', '');
	if (h.length < 6) return '#000';
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return 0.299 * r + 0.587 * g + 0.114 * b > 128 ? '#000' : '#fff';
}

export const eqHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
