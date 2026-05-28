import { useEffect, useState } from 'preact/hooks';
import { supabase } from '../api/client';
import { type Tag as TagT } from '../api/tag.types';
import { Tag } from '../components/ui/Tag';
import { Popover } from '../components/ui/Popover';
import { ColorSelect } from '../components/ui/ColorSelect';
import { IconSelect } from '../components/ui/IconSelect';
import { DEFAULT_COLOR, LOADING } from '../constants';
import { useReload } from '../utils/hooks';
import { toast } from '../utils/toast';

type Draft = { name: string; color: string; icon: string };
const BLANK: Draft = { name: '', color: DEFAULT_COLOR, icon: '' };

function TagEditor({ value, onChange, onSubmit, submitLabel, onCancel }: {
	value: Draft;
	onChange: (v: Draft) => void;
	onSubmit: () => void;
	submitLabel: string;
	onCancel?: () => void;
}) {
	return (
		<form onSubmit={e => { e.preventDefault(); onSubmit(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
			<IconSelect value={value.icon} onChange={icon => onChange({ ...value, icon })} />
			<input
				type="text"
				placeholder="Tag name…"
				value={value.name}
				onInput={e => onChange({ ...value, name: e.currentTarget.value })}
				style={{ flex: 1, minWidth: 0, maxWidth: '200px' }}
			/>
			<ColorSelect value={value.color} onChange={color => onChange({ ...value, color })} />
			<button type="submit" disabled={!value.name.trim()}>{submitLabel}</button>
			{onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
		</form>
	);
}

export function Tags() {
	const [tags, setTags] = useState<TagT[] | null>(null);
	const [version, reload] = useReload();
	const [draft, setDraft] = useState<Draft>(BLANK);
	const [editing, setEditing] = useState<(TagT & { icon: string }) | null>(null);

	useEffect(() => {
		(async () => {
			const { data, error } = await supabase.from('tags').select('*').order('name');
			if (error) console.error(error);
			setTags(data ?? []);
		})();
	}, [version]);

	async function save() {
		if (!editing) return;
		const { error } = await supabase.from('tags').update({
			name: editing.name,
			color: editing.color,
			icon: editing.icon || null,
		}).eq('id', editing.id);
		if (error) {
			toast.error(`Update failed: ${error.message}`);
			return;
		}
		setEditing(null);
		reload();
		toast.success(`Updated "${editing.name}"`);
	}

	async function add() {
		const { error } = await supabase.from('tags').insert({
			name: draft.name,
			color: draft.color,
			icon: draft.icon || null,
		});
		if (error) {
			toast.error(`Add failed: ${error.message}`);
			return;
		}
		const name = draft.name;
		setDraft(BLANK);
		reload();
		toast.success(`Added "${name}"`);
	}

	async function remove(id: number) {
		if (!confirm('Delete this tag?')) return;
		const { error } = await supabase.from('tags').delete().eq('id', id);
		if (error) {
			toast.error(`Delete failed: ${error.message}`);
			return;
		}
		setEditing(null);
		reload();
		toast.success('Tag deleted');
	}

	if (tags === null) return <p>{LOADING}</p>;

	return (
		<section>
			<h1>Tags</h1>
			<ul class="plain">
				{tags.map(t => (
					<li key={t.id}>
						{editing?.id === t.id ? (
							<TagEditor
								value={editing}
								onChange={v => setEditing({ ...editing, ...v })}
								onSubmit={save}
								submitLabel="Save"
								onCancel={() => setEditing(null)}
							/>
						) : (
							<>
								<Tag name={t.name} color={t.color} icon={t.icon} />
								<Popover trigger="⋯" tooltip="More" variant="ghost">
									<button onClick={() => setEditing({ ...t, icon: t.icon ?? '' })}>Edit</button>
									<button onClick={() => remove(t.id)}>Delete</button>
								</Popover>
							</>
						)}
					</li>
				))}
			</ul>

			{tags.length === 0 && <p><small>No tags yet — add one below ↓</small></p>}

			<hr />
			<TagEditor
				value={draft}
				onChange={setDraft}
				onSubmit={add}
				submitLabel="+ Add"
			/>
		</section>
	);
}
