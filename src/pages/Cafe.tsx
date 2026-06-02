import { Fragment } from 'preact';
import { useRoute } from 'preact-iso';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Cafe as CafeT } from '../api/cafe.types';
import { type Tag as TagT } from '../api/tag.types';
import { supabase } from '../api/client';
import { Map as CafeMap } from '../components/Map';
import { Tag } from '../components/ui/Tag';
import { Icon } from '../components/ui/Icon';
import { Gallery } from '../components/ui/Gallery';
import { formatDate } from '../utils/date';
import { LOADING, US_STATES } from '../constants';
import { toast } from '../utils/toast';
import { uploadCafeImage } from '../utils/upload';
import { compressRanks } from '../utils/rank';
import { useAuth } from '../../context/AuthContext';

const FIELDS: { label: string; value: (c: CafeT, tags: Map<number, TagT>) => any }[] = [
	{ label: 'Visited', value: c => c.date_visited && formatDate(c.date_visited) },
	{ label: 'City', value: c => c.city },
	{ label: 'State', value: c => c.state },
	{ label: 'Address', value: c => c.address },
	{
		label: 'Tags',
		value: (c, tags) => {
			const ts = (c.tags ?? []).map(id => tags.get(id)).filter(Boolean) as TagT[];
			if (ts.length === 0) return null;
			return (
				<span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.25rem' }}>
					{ts.map(t => <Tag key={t.id} name={t.name} color={t.color} icon={t.icon} />)}
				</span>
			);
		},
	},
	{ label: 'Notes', value: c => c.body },
	{ label: 'Added', value: c => formatDate(c.created_at) },
	{ label: 'Archived', value: c => c.archived ? 'Yes' : null },
];

export function Cafe() {
	const [cafe, setCafe] = useState<CafeT | null>(null);
	const [tags, setTags] = useState<TagT[]>([]);
	const [rankList, setRankList] = useState<{ id: number; rank: number; archived: boolean; name: string }[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<CafeT | null>(null);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { loading: authLoading, session } = useAuth();

	const { params } = useRoute();
	const id = params.id ?? '';
	// `/cafe/new` is a literal route (no :id). `/cafe/:id` always has one.
	const isNew = !params.id || params.id === 'new';

	useEffect(() => {
		async function fetchData() {
			if (isNew) {
				const [tagsRes, rankRes] = await Promise.all([
					supabase.from('tags').select('*'),
					supabase.from('ranked_cafes').select('id, rank, archived, name').order('rank'),
				]);
				const empty: CafeT = {
					id: 0,
					created_at: '',
					name: '',
					images: null,
					body: '',
					date_visited: null,
					city: null,
					state: null,
					address: null,
					tags: null,
					rank: 0,
					archived: false,
					map_hidden: false,
					map_query: null,
				};
				setCafe(empty);
				setDraft(empty);
				setEditing(true);
				setTags(tagsRes.data ?? []);
				setRankList(rankRes.data ?? []);
				setLoading(false);
				return;
			}
			const [cafeRes, tagsRes, rankRes] = await Promise.all([
				supabase.from('ranked_cafes').select('*').eq('id', Number(id)).single(),
				supabase.from('tags').select('*'),
				supabase.from('ranked_cafes').select('id, rank, archived, name').order('rank'),
			]);
			if (cafeRes.error) console.error(cafeRes.error);
			if (tagsRes.error) console.error(tagsRes.error);
			if (rankRes.error) console.error(rankRes.error);
			setCafe(cafeRes.data);
			setTags(tagsRes.data ?? []);
			setRankList(rankRes.data ?? []);
			setLoading(false);
		}
		fetchData();
	}, [id, isNew]);

	const tagById = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);
	const selectedTagSet = useMemo(() => new Set(draft?.tags ?? []), [draft]);

	const rankInfo = useMemo(() => {
		if (!cafe) return null;
		const nonArchived = rankList.filter(c => !c.archived);
		const total = nonArchived.length;
		let displayed = cafe.rank;
		if (!cafe.archived) {
			displayed = compressRanks(nonArchived).find(c => c.id === cafe.id)?.rank ?? cafe.rank;
		}
		const rawSorted = [...rankList].sort((a, b) => a.rank - b.rank);
		const raw = rawSorted.findIndex(c => c.id === cafe.id) + 1 || cafe.rank;
		return { displayed, total, raw };
	}, [cafe, rankList]);

	const neighbors = useMemo(() => {
		if (!cafe) return { prev: null, next: null };
		const seq = rankList.filter(c => !c.archived).sort((a, b) => a.rank - b.rank);
		const idx = seq.findIndex(c => c.id === cafe.id);
		if (idx === -1) return { prev: null, next: null };
		return {
			prev: idx > 0 ? { ...seq[idx - 1], displayed: idx } : null,
			next: idx < seq.length - 1 ? { ...seq[idx + 1], displayed: idx + 2 } : null,
		};
	}, [cafe, rankList]);

	// Dirty: any unsaved edit when in edit mode.
	const dirty = useMemo(() => {
		if (!editing || !draft || !cafe) return false;
		const keys: (keyof CafeT)[] = [
			'name', 'body', 'date_visited', 'city', 'state', 'address',
			'archived', 'images', 'tags', 'map_hidden', 'map_query',
		];
		return keys.some(k => JSON.stringify(draft[k]) !== JSON.stringify(cafe[k]));
	}, [editing, draft, cafe]);

	// Skip the beforeunload prompt when WE'RE the ones navigating
	// (e.g., handing off the create flow to the home page).
	const skipUnloadRef = useRef(false);

	useEffect(() => {
		if (!dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			if (skipUnloadRef.current) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [dirty]);

	function startEdit() {
		if (!cafe) return;
		setDraft({ ...cafe });
		setEditing(true);
	}

	function cancel() {
		if (dirty && !confirm('Discard unsaved changes?')) return;
		if (isNew) {
			// /cafe/new is a one-shot page — bail back home.
			skipUnloadRef.current = true;
			window.location.href = '/';
			return;
		}
		setDraft(null);
		setEditing(false);
	}

	function patch(p: Partial<CafeT>) {
		setDraft(d => d ? { ...d, ...p } : d);
	}

	function toggleTag(tagId: number) {
		if (!draft) return;
		const current = draft.tags ?? [];
		const next = current.includes(tagId)
			? current.filter(t => t !== tagId)
			: [...current, tagId];
		patch({ tags: next });
	}

	function removeImage(idx: number) {
		setDraft(d => {
			if (!d) return d;
			const images = (d.images ?? []).filter((_, i) => i !== idx);
			return { ...d, images: images.length ? images : null };
		});
	}

	async function handleFiles(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = Array.from(target.files ?? []);
		target.value = '';
		if (!files.length || !draft) return;
		setUploading(true);
		for (const file of files) {
			try {
				const url = await uploadCafeImage(file, draft.id);
				setDraft(d => d ? { ...d, images: [...(d.images ?? []), url] } : d);
				toast.success(`Uploaded ${file.name}`);
			} catch (err: any) {
				toast.error(`Upload failed: ${err.message}`);
			}
		}
		setUploading(false);
	}

	async function save() {
		if (!draft) return;
		const name = (draft.name ?? '').trim();
		const body = (draft.body ?? '').trim();
		if (!name) {
			toast.error('Name is required');
			return;
		}

		if (isNew) {
			// Don't insert yet — stash the draft and bounce to home so user can drag
			// it into rank position. The actual INSERT happens when they hit Save there.
			sessionStorage.setItem('pendingCafe', JSON.stringify({
				name,
				body: body || '',
				city: draft.city ?? '',
				state: draft.state ?? '',
			}));
			toast.success('Drag into position, then Save to commit');
			skipUnloadRef.current = true;
			window.location.href = '/';
			return;
		}

		setSaving(true);
		const payload: Record<string, any> = {
			name,
			body: body || null,
			date_visited: draft.date_visited,
			city: draft.city,
			state: draft.state,
			address: draft.address,
			tags: draft.tags,
			archived: draft.archived,
			images: draft.images,
		};
		// Only send map_* fields if the DB row already exposes them (column exists)
		if (cafe && 'map_hidden' in cafe) payload.map_hidden = draft.map_hidden ?? false;
		if (cafe && 'map_query' in cafe) payload.map_query = draft.map_query ?? null;

		const { data, error } = await supabase
			.from('ranked_cafes')
			.update(payload)
			.eq('id', draft.id)
			.select();
		setSaving(false);
		if (error) {
			console.error(error);
			toast.error(`Save failed: ${error.message}`);
			return;
		}
		if (!data || data.length === 0) {
			toast.error('Save returned 0 rows — check RLS policy or table type.');
			return;
		}
		setCafe(data[0] as CafeT);
		setEditing(false);
		setDraft(null);
		toast.success('Saved');
	}

	if (loading) return <p>{LOADING}</p>;
	if (!cafe) return <p>Not found</p>;

	const canEdit = !authLoading && !!session;
	const source = editing && draft ? draft : cafe;
	const showMap = !source.map_hidden;
	const galleryImages = (editing ? draft?.images : cafe.images) ?? [];

	return (
		<>
		<section style={{ marginInline: 'auto', maxWidth: '70ch' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
				<a href="../"><button>← Back</button></a>
				{canEdit && !editing && (
					<span style={{ display: 'inline-flex', gap: '0.5rem' }}>
						<a href={`/?reorder=${cafe.id}`}>
							<button
								type="button"
								data-variant="ghost"
								data-tooltip="Change rank order"
								aria-label="Reorder rank"
							>
								<Icon name="arrows-down-up" /> Reorder
							</button>
						</a>
						<button
							type="button"
							data-variant="ghost"
							onClick={startEdit}
							data-tooltip="Edit"
							aria-label="Edit"
						>
							<Icon name="pencil-simple" /> Edit
						</button>
					</span>
				)}
				{editing && (
					<span style={{ display: 'inline-flex', gap: '0.5rem' }}>
						<button onClick={cancel} disabled={saving}>Cancel</button>
						<button onClick={save} disabled={saving || !dirty}>
							{saving ? 'Saving…' : `Save${dirty ? ' *' : ''}`}
						</button>
					</span>
				)}
			</div>

			<header>
				<h1>
					{editing && draft ? (
						<input
							value={draft.name}
							onInput={e => patch({ name: e.currentTarget.value })}
							style={{ font: 'inherit', width: '60%' }}
						/>
					) : (
						cafe.name
					)}
				</h1>
				<p>
					<em style={{ color: 'orange' }}>
						#{rankInfo?.displayed ?? cafe.rank}
					</em>
					<small style={{ marginLeft: '0.5rem', opacity: 0.6 }}>
						(#
						{rankInfo && rankInfo.raw !== rankInfo.displayed && rankInfo.raw}
						&nbsp;including archived)
					</small>
				</p>
				{(source.city || source.state) && (
					<p style={{ opacity: 0.7 }}>
						{[source.city, source.state].filter(Boolean).join(', ')}
					</p>
				)}
			</header>

			{showMap && (
				<CafeMap
					name={source.name}
					city={source.city}
					state={source.state}
					address={source.address}
					queryOverride={source.map_query}
				/>
			)}

			{editing && draft ? (
				<>
					<Gallery
						images={galleryImages}
						alt={cafe.name}
						onRemove={removeImage}
						trailing={
							<button
								type="button"
								class="thumb-add"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploading}
							>
								<Icon name="plus" />
								<small>{uploading ? 'Uploading…' : 'Add'}</small>
							</button>
						}
					/>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple
						onChange={handleFiles}
						style={{ display: 'none' }}
					/>
				</>
			) : (
				galleryImages.length > 0 && <Gallery images={galleryImages} alt={cafe.name} />
			)}

			{editing && draft ? (
				<table>
					<tbody>
						<tr><th>Visited</th><td>
							<input
								type="date"
								value={draft.date_visited ?? ''}
								onInput={e => patch({ date_visited: e.currentTarget.value || null })}
							/>
						</td></tr>
						<tr><th>City</th><td>
							<input
								value={draft.city ?? ''}
								onInput={e => patch({ city: e.currentTarget.value || null })}
							/>
						</td></tr>
						<tr><th>State</th><td>
							<select
								value={draft.state ?? ''}
								onChange={e => patch({ state: e.currentTarget.value || null })}
							>
								<option value="">—</option>
								{US_STATES.map(s => (
									<option key={s.code} value={s.code}>{s.name}</option>
								))}
							</select>
						</td></tr>
						<tr><th>Address</th><td>
							<input
								value={draft.address ?? ''}
								onInput={e => patch({ address: e.currentTarget.value || null })}
								style={{ width: '100%' }}
							/>
						</td></tr>
						<tr><th>Map</th><td>
							<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
								<input
									type="checkbox"
									checked={!draft.map_hidden}
									onChange={e => patch({ map_hidden: !e.currentTarget.checked })}
								/>
								Show map
							</label>
							<input
								value={draft.map_query ?? ''}
								onInput={e => patch({ map_query: e.currentTarget.value || null })}
								placeholder="Search override (leave blank for auto)"
								style={{ width: '100%', display: 'block' }}
							/>
						</td></tr>
						<tr><th>Tags</th><td>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center', marginBottom: '0.5rem' }}>
								{(draft.tags ?? []).map(tid => {
									const t = tagById.get(tid);
									return t ? (
										<Tag
											key={tid}
											name={t.name}
											color={t.color}
											icon={t.icon}
											onClear={() => toggleTag(tid)}
										/>
									) : null;
								})}
							</div>
							<select
								value=""
								onChange={e => {
									const val = (e.currentTarget as HTMLSelectElement).value;
									if (!val) return;
									toggleTag(Number(val));
									(e.currentTarget as HTMLSelectElement).value = '';
								}}
							>
								<option value="">Add a tag…</option>
								{tags
									.filter(t => !selectedTagSet.has(t.id))
									.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
							</select>
						</td></tr>
						<tr><th>Notes</th><td>
							<textarea
								rows={6}
								style={{ width: '100%', font: 'inherit' }}
								value={draft.body ?? ''}
								onInput={e => patch({ body: e.currentTarget.value || null })}
							/>
						</td></tr>
						<tr><th>Archived</th><td>
							<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
								<input
									type="checkbox"
									checked={draft.archived}
									onChange={e => patch({ archived: e.currentTarget.checked })}
								/>
								{draft.archived ? 'Yes' : 'No'}
							</label>
						</td></tr>
					</tbody>
				</table>
			) : (
				<dl class="cafe-detail">
					{FIELDS.map(f => {
						const cafeForDisplay = rankInfo
							? { ...cafe, rank: rankInfo.displayed }
							: cafe;
						const v = f.value(cafeForDisplay, tagById);
						if (!v) return null;
						return (
							<Fragment key={f.label}>
								<dt>{f.label}</dt>
								<dd>{v}</dd>
							</Fragment>
						);
					})}
				</dl>
			)}

			{(neighbors.prev || neighbors.next) && (
				<p style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
					{neighbors.prev ? (
						<a href={`/cafe/${neighbors.prev.id}`}>
							<small>← #{neighbors.prev.displayed} {neighbors.prev.name}</small>
						</a>
					) : <span />}
					{neighbors.next ? (
						<a href={`/cafe/${neighbors.next.id}`}>
							<small>#{neighbors.next.displayed} {neighbors.next.name} →</small>
						</a>
					) : <span />}
				</p>
			)}

			{(neighbors.prev || neighbors.next) && (
				<div style={{ height: '3.5rem' }} aria-hidden="true" />
			)}
		</section>

		{(neighbors.prev || neighbors.next) && (
			<nav class="bottom-bar" aria-label="Cafe navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				{neighbors.prev ? (
					<a href={`/cafe/${neighbors.prev.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
						<Icon name="caret-left" /> #{neighbors.prev.displayed}
					</a>
				) : <span />}
				{neighbors.next ? (
					<a href={`/cafe/${neighbors.next.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
						#{neighbors.next.displayed} <Icon name="caret-right" />
					</a>
				) : <span />}
			</nav>
		)}
		</>
	);
}
