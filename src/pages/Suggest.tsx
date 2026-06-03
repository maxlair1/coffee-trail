import { useState } from 'preact/hooks';
import { supabase } from '../api/client';
import { toast } from '../utils/toast';
import { US_STATES } from '../constants';

type Draft = {
	name: string;
	city: string;
	state: string;
	notes: string;
	submitter_name: string;
	submitter_email: string;
};

const EMPTY: Draft = { name: '', city: '', state: '', notes: '', submitter_name: '', submitter_email: '' };

export function Suggest() {
	const [draft, setDraft] = useState<Draft>(EMPTY);
	const [sending, setSending] = useState(false);
	const [done, setDone] = useState(false);

	function patch(p: Partial<Draft>) {
		setDraft(d => ({ ...d, ...p }));
	}

	async function submit(e: Event) {
		e.preventDefault();
		const name = draft.name.trim();
		if (!name) {
			toast.error('Cafe name is required');
			return;
		}
		setSending(true);
		const { error } = await supabase.from('suggestions').insert({
			name,
			city: draft.city.trim() || null,
			state: draft.state || null,
			notes: draft.notes.trim() || null,
			submitter_name: draft.submitter_name.trim() || null,
			submitter_email: draft.submitter_email.trim() || null,
		});
		setSending(false);
		if (error) {
			toast.error(`Submit failed: ${error.message}`);
			return;
		}
		setDone(true);
		setDraft(EMPTY);
		toast.success('Thanks for the tip!');
	}

	return (
		<section style={{ marginInline: 'auto', maxWidth: '60ch' }}>
			<h1>Suggest a cafe</h1>
			<p>
				Know of a shop I can't miss? Drop it below.
			</p>
			{done && (
				<p style={{
					background: 'rgba(41, 160, 42, 0.12)',
					color: '#29A02A',
					padding: '0.5rem 0.75rem',
				}}>
					Thanks — your suggestion is in. Submit another if you've got more.
				</p>
			)}
			<form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
				<label>
					Cafe name *<br />
					<input
						required
						value={draft.name}
						onInput={e => patch({ name: e.currentTarget.value })}
						style={{ width: '100%' }}
					/>
				</label>
				<label>
					City<br />
					<input
						value={draft.city}
						onInput={e => patch({ city: e.currentTarget.value })}
						style={{ width: '100%' }}
					/>
				</label>
				<label>
					State<br />
					<select
						value={draft.state}
						onChange={e => patch({ state: e.currentTarget.value })}
					>
						<option value="">—</option>
						{US_STATES.map(s => (
							<option key={s.code} value={s.code}>{s.name}</option>
						))}
					</select>
				</label>
				<label>
					What makes it awesome?<br />
					<textarea
						rows={4}
						value={draft.notes}
						onInput={e => patch({ notes: e.currentTarget.value })}
						style={{ width: '100%', font: 'inherit' }}
					/>
				</label>
				<label>
					Your name (optional)<br />
					<input
						value={draft.submitter_name}
						onInput={e => patch({ submitter_name: e.currentTarget.value })}
						style={{ width: '100%' }}
					/>
				</label>
				<label>
					Your email (optional, for follow-ups)<br />
					<input
						type="email"
						value={draft.submitter_email}
						onInput={e => patch({ submitter_email: e.currentTarget.value })}
						style={{ width: '100%' }}
					/>
				</label>
				<div>
					<button type="submit" disabled={sending}>
						{sending ? 'Sending…' : 'Submit suggestion'}
					</button>
				</div>
			</form>
		</section>
	);
}
