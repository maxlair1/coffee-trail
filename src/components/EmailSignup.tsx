import { useState } from 'preact/hooks';
import { supabase } from '../api/client';
import { toast } from '../utils/toast';

export function EmailSignup() {
	const [email, setEmail] = useState('');
	const [sending, setSending] = useState(false);
	const [done, setDone] = useState(false);

	async function submit(e: Event) {
		e.preventDefault();
		const value = email.trim();
		if (!value) return;
		setSending(true);
		const { error } = await supabase.from('subscribers').insert({ email: value });
		setSending(false);
		if (error) {
			// 23505 = unique violation → already subscribed; treat as success.
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

	return (
		<section style={{
			background: 'rgba(255, 165, 0, 0.15)',
			padding: '1rem',
			marginBlock: '1.5rem',
		}}>
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
