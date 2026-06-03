import { useEffect, useState } from 'preact/hooks';
import { supabase } from '../api/client';
import { toast } from '../utils/toast';

const STORAGE_KEY = 'emailSignupHidden';

export function EmailSignup() {
	const [email, setEmail] = useState('');
	const [sending, setSending] = useState(false);
	const [done, setDone] = useState(false);
	const [hidden, setHidden] = useState(false);

	// Check localStorage after mount (avoids SSR hydration mismatch).
	useEffect(() => {
		try {
			if (localStorage.getItem(STORAGE_KEY) === '1') setHidden(true);
		} catch {}
	}, []);

	function dismiss() {
		try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
		setHidden(true);
	}

	async function submit(e: Event) {
		e.preventDefault();
		const value = email.trim();
		if (!value) return;
		setSending(true);
		const { error } = await supabase.from('subscribers').insert({ email: value });
		setSending(false);
		if (error) {
			if ((error as any).code === '23505') {
				setDone(true);
				toast.success('Already subscribed — thanks!');
				return;
			}
			toast.error(`Subscribe failed: ${error.message}`);
			return;
		}
		setDone(true);
		setEmail('');
		toast.success('Subscribed!');
	}

	if (hidden) return null;

	return (
		<section style={{
			background: 'rgba(255, 165, 0, 0.15)',
			padding: '1rem',
			marginBlock: '1.5rem',
			position: 'relative',
		}}>
			<button
				type="button"
				onClick={dismiss}
				aria-label="Hide email signup"
				data-tooltip="Hide"
				style={{
					position: 'absolute',
					top: '0.25rem',
					right: '0.25rem',
					background: 'none',
					border: 'none',
					color: 'orange',
					cursor: 'pointer',
					font: 'inherit',
					lineHeight: 1,
					padding: '0.25rem 0.5rem',
				}}
			>
				×
			</button>
			<p style={{ margin: 0, color: 'orange', fontWeight: 'bold' }}>
				Get notified when Olivia finds a new favorite ☕
			</p>
			{done ? (
				<p style={{ margin: '0.5rem 0 0', opacity: 0.8 }}>You're on the list.</p>
			) : (
				<form
					onSubmit={submit}
					style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
				>
					<input
						type="email"
						required
						placeholder="you@example.com"
						value={email}
						onInput={e => setEmail(e.currentTarget.value)}
						disabled={sending}
						style={{ flex: 1, minWidth: '12rem' }}
					/>
					<button type="submit" disabled={sending}>
						{sending ? 'Subscribing…' : 'Subscribe'}
					</button>
				</form>
			)}
		</section>
	);
}
