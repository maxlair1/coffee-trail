import { useLocation } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { useAuth } from "../../context/AuthContext";
import { supabase } from '../api/client';
import { Icon } from './ui/Icon';

type Theme = 'light' | 'dark';

export function Header() {
	const { url } = useLocation();
	const { loading, session } = useAuth();
	const [theme, setTheme] = useState<Theme>('light');

	useEffect(() => {
		const saved = localStorage.getItem('theme');
		const initial: Theme =
			saved === 'light' || saved === 'dark' ? saved
				: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark'
					: 'light';
		setTheme(initial);
		document.documentElement.style.colorScheme = initial;
		document.documentElement.dataset.theme = initial;
	}, []);

	function toggleTheme() {
		const next: Theme = theme === 'dark' ? 'light' : 'dark';
		setTheme(next);
		document.documentElement.style.colorScheme = next;
		document.documentElement.dataset.theme = next;
		localStorage.setItem('theme', next);
	}

	async function handleLogout() {
		await supabase.auth.signOut();
		window.location.href = "/";
	}

	return (
		<header style={{
			borderBottom: '1px solid var(--border)',
			marginBottom: '1rem',
			display: 'flex',
			justifyContent: 'space-between',
			alignItems: 'center',
			flexDirection: 'row',
			gap: '0.25rem',
			padding: '0.5rem',
			flexWrap: 'wrap'
		}}>
			<nav style={{
				display: 'flex',
				alignItems: 'center',
				flexDirection: 'row',
				gap: '1rem',
				padding: '0.5rem',
			}}>
				<a href="/" style={{ textDecoration: 'none', textDecorationColor: 'none', color: 'inherit'}}>
					<span style={{fontSize: '1.2rem'}}>☕️&nbsp;🥾&nbsp;Olivia's&nbsp;Coffee&nbsp;Trail&nbsp;&nbsp;</span>
				</a>
				<a href="/suggest" class={url == '/' && 'active'}>
					Got a suggestion?
				</a>
			</nav>
			<div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
				{!loading && session && (
					<div style={{
						display: 'inline-flex',
						justifyContent: 'center',
						alignItems: 'center',
						padding: '0.25rem',
						backgroundColor: '#00800020',
					}}>
						<span style={{color: 'green', textOverflow: 'ellipsis', textWrap: 'nowrap'}}>Logged in as {session.user.email}</span>
						<button data-variant="ghost" onClick={handleLogout}>Logout</button>
					</div>
				)}
				<button
					type="button"
					data-variant="ghost"
					onClick={toggleTheme}
					data-tooltip={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
					aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} />
				</button>
			</div>
		</header>
	);
}
