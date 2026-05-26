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
			marginBottom: '1rem'

		}}>
			<nav style={{
				display: 'flex', 
				gap: '1rem',
				padding: '0.5rem'
			}}>
				<span style={{textDecoration: 'italic'}}>☕️🥾 Olivia's Coffee Trail  </span>
				{/* {url.length >= 2 ? <a href="../">← Back</a> : null} */}
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
				{!loading && session && (
					<>
						<span style={{color: 'green'}}> Logged in as {session.user.email}</span>
						<button onClick={handleLogout}>Logout</button>
					</>
				)}
			</nav>
			{}
		</header>
	);
}
