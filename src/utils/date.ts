export const formatDate = (s: string) => new Date(s).toLocaleDateString();

// "2025-08-14" → "8/14/25" (no leading zeros, 2-digit year). Empty string if null/empty.
export function shortDate(s: string | null | undefined): string {
	if (!s) return '';
	const [y, m, d] = s.split('-');
	if (!y || !m || !d) return s;
	return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y.slice(2)}`;
}
