export function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer style={{
			borderTop: '1px solid var(--border-soft)',
			marginTop: '2rem',
			padding: '1rem 0.5rem',
			display: 'flex',
			flexWrap: 'wrap',
			gap: '1rem',
			alignItems: 'center',
			justifyContent: 'space-between',
			fontSize: '0.9em',
		}}>
			<nav aria-label="Site map" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
				<a href="/">Home</a>
				<a href="/login">Admin</a>
				<a href="/tags">Tags</a>
			</nav>
			<small style={{ opacity: 0.6 }}>
				© {year} Olivia's Coffee Trail
			</small>
		</footer>
	);
}
