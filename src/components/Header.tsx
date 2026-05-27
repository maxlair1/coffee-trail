import { useLocation } from 'preact-iso';
import { useAuth } from "../../context/AuthContext";
import { supabase } from '../api/client';
import { useEffect } from 'preact/hooks';

export function Header() {
	const { url } = useLocation();
	const { loading, session} = useAuth();

	async function handleLogout() {
		await supabase.auth.signOut();
		window.location.href = "/";
	}

	return (
		<header style={{
			borderBottom: 'solid 1px #292929',
			marginBottom: '1rem',
			display: 'flex',
			justifyContent: 'space-between',
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
				<span style={{fontSize: '1.2rem'}}>☕️&nbsp;🥾&nbsp;Olivia's&nbsp;Coffee&nbsp;Trail&nbsp;&nbsp;</span>
				<a href="/" class={url == '/' && 'active'}>
					Home
				</a>
				<a href="/login" class={url == '/login' && 'active'}>
					Admin
				</a> 
				{/* <a href="/404" class={url == '/404' && 'active'}>
					404
					</a> */}
				<br/>
			</nav>
			{!loading && session && (
				<div style={{
					display: 'inline-flex',
					justifyContent: 'center',
					alignItems: 'center',
					padding: '0.25rem',
					backgroundColor: '#00800020',
				}}>
					<span style={{color: 'green', textOverflow: 'elipses', textWrap: 'nowrap', width: '100%'}}> Logged in as {session.user.email}</span>
					<button data-variant="ghost" onClick={handleLogout}>Logout</button>
				</div>
			)}
		</header>
	);
}
