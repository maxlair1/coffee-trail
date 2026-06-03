import { Fragment } from 'preact';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../api/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Cafe as CafeT } from '../api/cafe.types';
import { type Tag as TagT } from '../api/tag.types';
import { Icon } from '../components/ui/Icon';
import { Tag } from '../components/ui/Tag';
import { EmailSignup } from '../components/EmailSignup';
import { compressRanks } from '../utils/rank';
import { useHomeStore } from '../utils/homeStore';
import { toast } from '../utils/toast';
import { LOADING, US_STATES } from '../constants';

const STATE_NAME_BY_CODE = new Map(US_STATES.map(s => [s.code, s.name]));

function locationCell(city: string | null, state: string | null) {
	const fullName = state ? STATE_NAME_BY_CODE.get(state) : undefined;
	const abbr = state ? <abbr title={fullName}>{state}</abbr> : null;
	if (city && state) return <>{city}, {abbr}</>;
	if (city) return <>{city}</>;
	if (state) return abbr;
	return 'N/A';
}

export function Home() {
	const [items, setItems] = useState<CafeT[]>([]);
	const [tags, setTags] = useState<TagT[]>([]);
	const [loading, setLoading] = useState(true);
	const searchRef = useRef<HTMLInputElement>(null);
	const { loading: authLoading, session } = useAuth();

	// Reorder/edit state
	const [editMode, setEditMode] = useState(false);
	const [working, setWorking] = useState<CafeT[]>([]);
	const [parkedItems, setParkedItems] = useState<CafeT[]>([]);
	const [touched, setTouched] = useState<Set<number>>(new Set());
	const [saving, setSaving] = useState(false);
	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
	const [overZone, setOverZone] = useState(false);
	const zoneRef = useRef<HTMLDivElement>(null);

	// Per-row action menu
	const [actionCafe, setActionCafe] = useState<CafeT | null>(null);
	const actionDialogRef = useRef<HTMLDialogElement>(null);


	const query = useHomeStore(s => s.query);
	const showSearch = useHomeStore(s => s.showSearch);
	const selectedTagIds = useHomeStore(s => s.selectedTagIds);
	const showArchived = useHomeStore(s => s.showArchived);
	const sortDir = useHomeStore(s => s.sortDir);
	const update = useHomeStore(s => s.update);
	const selectedTags = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);

	const setQuery = (v: string) => update({ query: v });
	const setShowSearch = (v: boolean | ((p: boolean) => boolean)) =>
		update({ showSearch: typeof v === 'function' ? v(showSearch) : v });
	const setSelectedTags = (next: Set<number>) => update({ selectedTagIds: [...next] });
	const setShowArchived = (v: boolean | ((p: boolean) => boolean)) =>
		update({ showArchived: typeof v === 'function' ? v(showArchived) : v });
	const setSortDir = (v: 'asc' | 'desc' | ((p: 'asc' | 'desc') => 'asc' | 'desc')) =>
		update({ sortDir: typeof v === 'function' ? v(sortDir) : v });

	function toggleRankSort() {
		setSortDir(d => d === 'asc' ? 'desc' : 'asc');
	}

	useEffect(() => {
		return () => {
			useHomeStore.getState().update({ scrollY: window.scrollY });
		};
	}, []);

	useEffect(() => {
		if (loading) return;
		const y = useHomeStore.getState().scrollY;
		if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
	}, [loading]);

	useEffect(() => {
		(async () => {
			try {
				const [cafesRes, tagsRes] = await Promise.all([
					supabase.from('ranked_cafes').select('*').order('rank', { ascending: true }),
					supabase.from('tags').select('*').order('name'),
				]);
				if (cafesRes.error) throw cafesRes.error;
				if (tagsRes.error) throw tagsRes.error;
				setItems(cafesRes.data ?? []);
				setTags(tagsRes.data ?? []);
			} catch (error: any) {
				console.error('Error fetching data:', error.message);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	useEffect(() => {
		if (showSearch) searchRef.current?.focus();
	}, [showSearch]);

	useEffect(() => {
		const d = actionDialogRef.current;
		if (!d) return;
		if (actionCafe && !d.open) d.showModal();
		else if (!actionCafe && d.open) d.close();
	}, [actionCafe]);

	// While dragging, force `grabbing` cursor everywhere.
	useEffect(() => {
		if (draggingId === null) return;
		document.body.style.cursor = 'grabbing';
		return () => { document.body.style.cursor = ''; };
	}, [draggingId]);

	const visible = useMemo(() => {
		const q = query.trim().toLowerCase();
		const result = items.filter(cafe => {
			if (!showArchived && cafe.archived) return false;
			if (selectedTags.size > 0) {
				const cafeTags = cafe.tags ?? [];
				if (!cafeTags.some(id => selectedTags.has(id))) return false;
			}
			if (q) {
				const haystack = [cafe.name, cafe.city, cafe.state]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
		result.sort((a, b) => a.rank - b.rank);
		const compressed = compressRanks(result);
		if (sortDir === 'desc') compressed.reverse();
		return compressed;
	}, [items, query, selectedTags, showArchived, sortDir]);

	function toggleTag(id: number) {
		const next = new Set(selectedTags);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelectedTags(next);
	}

	const activeFilterCount =
		(query.trim() ? 1 : 0) +
		selectedTags.size;

	function clearAllFilters() {
		setQuery('');
		setSelectedTags(new Set());
	}

	async function setArchived(cafeId: number, archived: boolean): Promise<boolean> {
		const { error } = await supabase
			.from('ranked_cafes')
			.update({ archived })
			.eq('id', cafeId);
		if (error) {
			toast.error(`Archive failed: ${error.message}`);
			return false;
		}
		setItems(prev => prev.map(c => c.id === cafeId ? { ...c, archived } : c));
		return true;
	}

	async function toggleArchive(cafe: CafeT) {
		const next = !cafe.archived;
		const prev = cafe.archived;
		const ok = await setArchived(cafe.id, next);
		if (!ok) return;
		toast.success(next ? 'Archived' : 'Unarchived', {
			action: {
				label: 'Undo',
				onClick: () => setArchived(cafe.id, prev),
			},
		});
	}

	async function deleteCafe(cafe: CafeT) {
		if (!confirm(`Delete "${cafe.name}" permanently? This cannot be undone.`)) return;
		const { error } = await supabase.from('ranked_cafes').delete().eq('id', cafe.id);
		if (error) {
			toast.error(`Delete failed: ${error.message}`);
			return;
		}
		setItems(prev => prev.filter(c => c.id !== cafe.id));
		toast.success(`Deleted ${cafe.name}`);
	}

	// ── Reorder helpers ──────────────────────────────────────────────────────

	const originalIndexById = useMemo(() => {
		if (!editMode) return null;
		const m = new Map<number, number>();
		[...items].sort((a, b) => a.rank - b.rank).forEach((c, i) => m.set(c.id, i));
		return m;
	}, [editMode, items]);

	const dirty = touched.size > 0;

	useEffect(() => {
		if (!editMode || !dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [editMode, dirty]);

	function enterEditMode(parkId: number | null = null) {
		const sorted = [...items].sort((a, b) => a.rank - b.rank);
		if (parkId !== null) {
			const parked = sorted.find(c => c.id === parkId);
			if (parked) {
				setParkedItems([parked]);
				setWorking(sorted.filter(c => c.id !== parkId));
				setTouched(new Set([parkId]));
				setEditMode(true);
				return;
			}
		}
		setWorking(sorted);
		setParkedItems([]);
		setTouched(new Set());
		setEditMode(true);
	}

	function exitEditMode() {
		setEditMode(false);
		setWorking([]);
		setParkedItems([]);
		setTouched(new Set());
		setDraggingId(null);
		setPointerPos(null);
		setOverZone(false);
		if (window.location.search) {
			window.history.replaceState({}, '', window.location.pathname);
		}
	}

	function cancelEdit() {
		if (dirty && !confirm('Discard changes to rank order?')) return;
		exitEditMode();
	}

	function markTouched(id: number) {
		setTouched(prev => {
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}

	// ── Pointer-event drag-and-drop ──────────────────────────────────────────
	// Pointerdown on the handle starts a drag. Subsequent pointermove/pointerup
	// are listened on `window` so the pointer can be anywhere on screen.

	function onRowHandlePointerDown(e: PointerEvent, cafeId: number) {
		if (!editMode) return;
		if (e.button !== undefined && e.button !== 0) return;
		e.preventDefault();
		setDraggingId(cafeId);
		setPointerPos({ x: e.clientX, y: e.clientY });
	}

	function onParkedPointerDown(e: PointerEvent, item: CafeT) {
		if (!editMode) return;
		if (e.button !== undefined && e.button !== 0) return;
		e.preventDefault();
		setWorking(w => [item, ...w]);
		setParkedItems(p => p.filter(c => c.id !== item.id));
		setDraggingId(item.id);
		markTouched(item.id);
		setPointerPos({ x: e.clientX, y: e.clientY });
	}

	// Global pointer listeners while dragging — track movement anywhere on screen,
	// not just over the handle column.
	useEffect(() => {
		if (draggingId === null) return;

		function onMove(e: PointerEvent) {
			setPointerPos({ x: e.clientX, y: e.clientY });

			const zone = zoneRef.current;
			if (zone) {
				const r = zone.getBoundingClientRect();
				if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
					setOverZone(true);
					return;
				}
			}
			setOverZone(false);

			const rows = document.querySelectorAll('tr[data-cafe-id]');
			let overId: number | null = null;
			for (const row of rows) {
				const rect = (row as HTMLElement).getBoundingClientRect();
				if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
					overId = Number((row as HTMLElement).getAttribute('data-cafe-id'));
					break;
				}
			}
			if (!overId || overId === draggingId) return;
			setWorking(prev => {
				const fromIdx = prev.findIndex(c => c.id === draggingId);
				const toIdx = prev.findIndex(c => c.id === overId);
				if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
				const next = [...prev];
				const [item] = next.splice(fromIdx, 1);
				next.splice(toIdx, 0, item);
				return next;
			});
			markTouched(draggingId);
		}

		function onUp() {
			setWorking(prev => {
				if (!overZone || draggingId === null) return prev;
				const item = prev.find(c => c.id === draggingId);
				if (!item) return prev;
				setParkedItems(p => [...p, item]);
				markTouched(item.id);
				return prev.filter(c => c.id !== draggingId);
			});
			setDraggingId(null);
			setPointerPos(null);
			setOverZone(false);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		};
	}, [draggingId, overZone]);

	async function saveReorder() {
		if (parkedItems.length > 0) {
			toast.error('Drop parked items back in the list first');
			return;
		}
		setSaving(true);

		// If there's a pending cafe (id < 0), insert it first to get a real id.
		// Use a safely-high rank for the insert; phase 1 will re-park into the
		// OFFSET range so no unique-key collision.
		let workingForSave = [...working];
		const pendingIdx = workingForSave.findIndex(c => c.id < 0);
		if (pendingIdx !== -1) {
			const pending = workingForSave[pendingIdx];
			const maxRank = items.reduce((m, c) => Math.max(m, c.rank), 0);
			const { data: inserted, error: insertError } = await supabase
				.from('ranked_cafes')
				.insert({
					name: pending.name,
					body: pending.body || null,
					city: pending.city || null,
					state: pending.state || null,
					rank: maxRank + 1,
				})
				.select()
				.single();
			if (insertError) {
				console.error(insertError);
				toast.error(`Create failed: ${insertError.message}`);
				setSaving(false);
				return;
			}
			workingForSave[pendingIdx] = inserted as CafeT;
		}

		const orderedIds = workingForSave.map(c => c.id);
		const OFFSET = 1_000_000;

		const phase1 = await Promise.all(
			orderedIds.map((id, i) =>
				supabase.from('ranked_cafes').update({ rank: OFFSET + i + 1 }).eq('id', id),
			),
		);
		const p1Errors = phase1.filter(r => r.error);
		if (p1Errors.length) {
			console.error(p1Errors.map(r => r.error));
			toast.error(`Save failed (phase 1, ${p1Errors.length})`);
			setSaving(false);
			return;
		}

		const phase2 = await Promise.all(
			orderedIds.map((id, i) =>
				supabase.from('ranked_cafes').update({ rank: i + 1 }).eq('id', id),
			),
		);
		setSaving(false);
		const p2Errors = phase2.filter(r => r.error);
		if (p2Errors.length) {
			console.error(p2Errors.map(r => r.error));
			toast.error(`Save failed (phase 2, ${p2Errors.length})`);
			return;
		}

		const { data } = await supabase.from('ranked_cafes').select('*').order('rank');
		setItems(data ?? []);
		toast.success(`Saved order (${orderedIds.length} cafes)`);
		exitEditMode();
	}

	useEffect(() => {
		if (authLoading || !session || loading || editMode) return;
		// Check for a pending new cafe (set by /cafe/new). Park it as a temp item
		// with a negative id — the real INSERT happens at saveReorder time.
		const pendingRaw = sessionStorage.getItem('pendingCafe');
		if (pendingRaw) {
			sessionStorage.removeItem('pendingCafe');
			try {
				const pending = JSON.parse(pendingRaw) as { name: string; body: string; city: string; state: string };
				const sorted = [...items].sort((a, b) => a.rank - b.rank);
				const tempId = -Date.now();
				const draftCafe: CafeT = {
					id: tempId,
					created_at: '',
					name: pending.name,
					images: null,
					body: pending.body,
					date_visited: null,
					city: pending.city || null,
					state: pending.state || null,
					address: null,
					tags: null,
					rank: 0,
					archived: false,
					map_hidden: false,
					map_query: null,
				};
				setWorking(sorted);
				setParkedItems([draftCafe]);
				setTouched(new Set([tempId]));
				setEditMode(true);
				return;
			} catch (err) {
				console.error('Failed to read pendingCafe', err);
			}
		}

		const params = new URLSearchParams(window.location.search);
		const reorderId = params.get('reorder');
		if (reorderId) enterEditMode(Number(reorderId));
	}, [authLoading, session, loading]);

	if (loading) return <p>{LOADING}</p>;

	const displayItems = editMode ? working : visible;
	const canEdit = !authLoading && !!session;

	function onRowClick(e: MouseEvent, cafe: CafeT) {
		if (editMode || !canEdit) return;
		const t = e.target as Element | null;
		if (t && t.closest('a, button, input, label, select, summary')) return;
		setActionCafe(cafe);
	}

	return (
		<div class="home" style={{
			maxWidth: '600px',
			// margin: '0 auto'
		}}>
			<div style={{ padding: '0 0.5rem' }}>
				<EmailSignup />
			</div>
			<div style={{
				position: 'sticky',
				top: 0,
				zIndex: 20,
				background: 'var(--surface-0)',
				paddingBottom: '0.5rem',
				marginBottom: '0.5rem',
				marginTop: '1rem',
				borderBottom: '1px solid var(--border)',
			}}>
				<div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.5rem' }}>
					<h1>Ranked cafes</h1>
					{editMode && (
						<span style={{
							display: 'inline-flex',
							alignItems: 'center',
							padding: '0.25rem 0.5rem',
							backgroundColor: 'rgba(255, 165, 0, 0.15)',
							color: 'orange',
							textWrap: 'nowrap',
						}}>
							Editing
						</span>
					)}
				</div>

				<div class="filters">
					{editMode && (
						<>
							<button
								type="button"
								onClick={saveReorder}
								disabled={!dirty || saving || parkedItems.length > 0}
								title={parkedItems.length > 0 ? 'Drop parked items back in the list first' : undefined}
							>
								{saving ? 'Saving…' : `Save${touched.size ? ` (${touched.size})` : ''}`}
							</button>
							<button
								type="button"
								data-variant="ghost"
								onClick={cancelEdit}
								disabled={saving}
							>
								Cancel
							</button>
						</>
					)}

					{!editMode && showSearch ? (
						<>
							<input
								style={{
									maxWidth: '2rem',
								}}
								ref={searchRef}
								type="search"
								placeholder="Search..."
								value={query}
								onInput={e => setQuery(e.currentTarget.value)}
								class="search-input"
								onBlur={() => {
									if (!query || query === null)
									setShowSearch(s => !s)
								}}
							/>
						</>
					) : (<button
							type="button"
							data-variant="ghost"
							data-active={showSearch || query ? '' : undefined}
							onClick={() => setShowSearch(s => !s)}
							data-tooltip="Search"
							aria-label="Search"
							aria-pressed={showSearch}
						>
							<Icon name="magnifying-glass" />
						</button>
					)}

					<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
						<select
							value=""
							onChange={e => {
								const val = (e.currentTarget as HTMLSelectElement).value;
								if (!val) return;
								toggleTag(Number(val));
								(e.currentTarget as HTMLSelectElement).value = '';
							}}
						>
							<option value="">Filter by tags</option>
							{tags
								.filter(t => !selectedTags.has(t.id))
								.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
						</select>
						{[...selectedTags].map(id => {
							const t = tags.find(t => t.id === id);
							if (!t) return null;
							return (
								<Tag
									key={t.id}
									name={t.name}
									color={t.color}
									icon={t.icon}
									onClear={() => toggleTag(t.id)}
								/>
							);
						})}
					</label>

					<label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
						<input
							type="checkbox"
							checked={showArchived}
							onChange={e => setShowArchived(e.currentTarget.checked)}
						/>
						show archived
					</label>

					{activeFilterCount > 0 && (
						<button
							type="button"
							data-variant="ghost"
							onClick={clearAllFilters}
						>
							Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
						</button>
					)}

					{!editMode && canEdit ? (
						<>
							<button
								type="button"
								data-variant="ghost"
								onClick={() => enterEditMode()}
								data-tooltip="Edit rank order"
								aria-label="Edit rank order"
							>
								<Icon name="pencil-simple" /> Edit
							</button>
							<a href="/cafe/new" data-variant="ghost">
								<button
									type="button"
									data-variant="ghost"
									data-tooltip="Add a new cafe"
									aria-label="Add a new cafe"
								>
									<Icon name="plus" /> Add
								</button>
							</a>
						</>
					):(
						<a href="/suggest" style={{textWrap: 'no-wrap'}}>
							<small>Got a suggestion?</small>
						</a>
					)} 
				</div>

				{editMode && (draggingId !== null || parkedItems.length > 0) && (
					<aside
						ref={zoneRef}
						data-over={overZone || undefined}
						style={{
							padding: '0.5rem 0.75rem',
							minHeight: '3rem',
							border: '2px dashed var(--border)',
							borderColor: overZone ? 'var(--accent)' : 'var(--border)',
							background: overZone ? 'color-mix(in srgb, var(--accent) 12%, var(--surface-1))' : 'var(--surface-1)',
							display: 'flex',
							flexWrap: 'wrap',
							gap: '0.5rem',
							alignItems: 'center',
							marginTop: '0.5rem',
						}}
					>
						<small style={{ opacity: 0.6 }}>Parking</small>
						{parkedItems.length === 0 && <small>Drop here to set aside</small>}
						{parkedItems.map(item => (
							<div key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.5rem', border: '1px solid var(--border-soft)', background: 'var(--surface-0)' }}>
								<span
									onPointerDown={(e: PointerEvent) => onParkedPointerDown(e, item)}
									style={{
										cursor: draggingId !== null ? 'grabbing' : 'grab',
										touchAction: 'none',
										display: 'inline-flex',
									}}
									aria-label={`Drag ${item.name} into the list`}
								>
									<Icon name="dots-six-vertical" />
								</span>
								<strong>{item.name}</strong>
							</div>
						))}
					</aside>
				)}
			</div>

			<table class="data-table cafe-list">
				<thead>
					<tr style={{ textAlign: 'left' }}>
						<th
							data-col="rank"
							onClick={editMode ? undefined : toggleRankSort}
							style={editMode ? undefined : { cursor: 'pointer' }}
							aria-sort={sortDir === 'asc' ? 'ascending' : 'descending'}
						>
							#{!editMode && <span aria-hidden="true">&nbsp;{sortDir === 'asc' ? '▲' : '▼'}</span>}
						</th>
						<th data-col="name">Cafe Name</th>
						<th data-col="location">Location</th>
					</tr>
				</thead>
				<tbody>
					{displayItems.map((cafe, index) => {
						const origIdx = originalIndexById?.get(cafe.id) ?? index;
						const isTouched = editMode && touched.has(cafe.id);
						const wasMoved = isTouched && origIdx !== index;
						const isDragging = draggingId === cafe.id;
						return (
							<Fragment key={cafe.id}>
								<tr
									data-archived={cafe.archived || undefined}
									data-cafe-id={cafe.id}
									onClick={(e: MouseEvent) => onRowClick(e, cafe)}
									style={{
										...(canEdit && !editMode ? { cursor: 'pointer' } : {}),
										...(wasMoved && !isDragging ? {
											background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
										} : {}),
										...(isDragging ? {
											background: 'color-mix(in srgb, var(--accent) 30%, transparent)',
											outline: '2px solid var(--accent)',
										} : {}),
										touchAction: editMode ? 'none' : undefined,
									}}
								>
									<td data-col="rank">
										{editMode && (
											<span
												onPointerDown={(e: PointerEvent) => onRowHandlePointerDown(e, cafe.id)}
												style={{
													cursor: draggingId !== null ? 'grabbing' : 'grab',
													touchAction: 'none',
													marginRight: '0.35rem',
													display: 'inline-flex',
													verticalAlign: 'middle',
												}}
												aria-label="Drag to reorder"
											>
												<Icon name="dots-six-vertical" />
											</span>
										)}
										<strong>{editMode ? index + 1 : (cafe.rank || index + 1)}</strong>
									</td>
									<td data-col="name">
										<a href={`/cafe/${cafe.id}`}>{cafe.name}</a>
										{cafe.archived && (
											<small style={{ marginLeft: '0.5rem', opacity: 0.6 }}>(archived)</small>
										)}
										{wasMoved && (
											<small style={{ marginLeft: '0.5rem', opacity: 0.6 }}>was #{origIdx + 1}</small>
										)}
									</td>
									<td data-col="location">{locationCell(cafe.city, cafe.state)}</td>
								</tr>
							</Fragment>
						);
					})}
				</tbody>
			</table>

			{!editMode && visible.length === 0 && (
				<p><small>No cafes match your filters.</small></p>
			)}

			{editMode && draggingId !== null && pointerPos && (() => {
				const cafe = working.find(c => c.id === draggingId);
				if (!cafe) return null;
				return (
					<div
						class="drag-ghost"
						style={{
							left: `${pointerPos.x + 12}px`,
							top: `${pointerPos.y + 12}px`,
						}}
					>
						<Icon name="dots-six-vertical" />&nbsp;{cafe.name}
					</div>
				);
			})()}

			{/* Per-row action dialog (replaces the old more-popover column) */}
			<dialog
				ref={actionDialogRef}
				onClose={() => setActionCafe(null)}
				onClick={(e: MouseEvent) => {
					if (e.target === actionDialogRef.current) setActionCafe(null);
				}}
				style={{ padding: '1rem', minWidth: '14rem', border: '1px solid var(--border-soft)', background: 'var(--surface-1)' }}
			>
				{actionCafe && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
						<strong>{actionCafe.name}</strong>
						<a href={`/cafe/${actionCafe.id}`} onClick={() => setActionCafe(null)}>Open / edit</a>
						<button
							type="button"
							data-variant="ghost"
							onClick={() => { const c = actionCafe; setActionCafe(null); if (c) enterEditMode(c.id); }}
						>
							Move
						</button>
						<button
							type="button"
							data-variant="ghost"
							onClick={() => { const c = actionCafe; setActionCafe(null); if (c) toggleArchive(c); }}
						>
							{actionCafe.archived ? 'Unarchive' : 'Archive'}
						</button>
						<button
							type="button"
							data-variant="danger"
							onClick={() => { const c = actionCafe; setActionCafe(null); if (c) deleteCafe(c); }}
						>
							Delete…
						</button>
						<button
							type="button"
							data-variant="ghost"
							onClick={() => setActionCafe(null)}
							style={{ marginTop: '0.5rem' }}
						>
							Close
						</button>
					</div>
				)}
			</dialog>
		</div>
	);
}
