import { Fragment } from 'preact';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../api/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Cafe as CafeT } from '../api/cafe.types';
import { type Tag as TagT } from '../api/tag.types';
import { Popover } from '../components/ui/Popover';
import { Icon } from '../components/ui/Icon';
import { TagMultiSelect } from '../components/ui/TagMultiSelect';
import { compressRanks } from '../utils/rank';
import { shortDate } from '../utils/date';
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
	const [pickedUpId, setPickedUpId] = useState<number | null>(null);
	const [touched, setTouched] = useState<Set<number>>(new Set());
	const [saving, setSaving] = useState(false);

	const query = useHomeStore(s => s.query);
	const showSearch = useHomeStore(s => s.showSearch);
	const selectedTagIds = useHomeStore(s => s.selectedTagIds);
	const showArchived = useHomeStore(s => s.showArchived);
	const sortBy = useHomeStore(s => s.sortBy);
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
	const setSortBy = (v: 'rank' | 'date') => update({ sortBy: v });

	function clickSort(col: 'rank' | 'date') {
		if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		else { setSortBy(col); setSortDir('asc'); }
	}

	function sortIndicator(col: 'rank' | 'date') {
		if (sortBy !== col) return null;
		return <span aria-hidden="true">&nbsp;{sortDir === 'asc' ? '▲' : '▼'}</span>;
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
		// Always compress on canonical rank-ascending order so each item's
		// displayed rank stays stable. Then sort the list by the selected column.
		result.sort((a, b) => a.rank - b.rank);
		const compressed = compressRanks(result);
		if (sortBy === 'date') {
			compressed.sort((a, b) => {
				// Nulls last regardless of direction.
				if (!a.date_visited && !b.date_visited) return 0;
				if (!a.date_visited) return 1;
				if (!b.date_visited) return -1;
				return a.date_visited.localeCompare(b.date_visited);
			});
		}
		if (sortDir === 'desc') compressed.reverse();
		return compressed;
	}, [items, query, selectedTags, showArchived, sortBy, sortDir]);

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

	async function toggleArchive(cafe: CafeT) {
		const next = !cafe.archived;
		const { error } = await supabase
			.from('ranked_cafes')
			.update({ archived: next })
			.eq('id', cafe.id);
		if (error) {
			toast.error(`Archive failed: ${error.message}`);
			return;
		}
		setItems(prev => prev.map(c => c.id === cafe.id ? { ...c, archived: next } : c));
		toast.success(next ? 'Archived' : 'Unarchived');
	}

	// ── Reorder helpers ──────────────────────────────────────────────────────

	const originalIndexById = useMemo(() => {
		if (!editMode) return null;
		const m = new Map<number, number>();
		[...items].sort((a, b) => a.rank - b.rank).forEach((c, i) => m.set(c.id, i));
		return m;
	}, [editMode, items]);

	const pickedUpIdx = editMode && pickedUpId !== null
		? working.findIndex(c => c.id === pickedUpId)
		: -1;
	const isPickingUp = pickedUpIdx !== -1;
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

	function enterEditMode(pickupId: number | null = null) {
		setWorking([...items].sort((a, b) => a.rank - b.rank));
		setPickedUpId(pickupId);
		setTouched(new Set());
		setEditMode(true);
	}

	function exitEditMode() {
		setEditMode(false);
		setWorking([]);
		setPickedUpId(null);
		setTouched(new Set());
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

	function move(fromIdx: number, toIdx: number, touchedId: number) {
		if (toIdx < 0 || toIdx >= working.length || toIdx === fromIdx) return;
		const next = [...working];
		const [item] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, item);
		setWorking(next);
		markTouched(touchedId);
	}

	function moveUp(idx: number) { move(idx, idx - 1, working[idx].id); }
	function moveDown(idx: number) { move(idx, idx + 1, working[idx].id); }

	function togglePickUp(id: number) {
		setPickedUpId(p => (p === id ? null : id));
	}

	function insertAt(slotIdx: number) {
		if (pickedUpIdx === -1) return;
		if (slotIdx === pickedUpIdx || slotIdx === pickedUpIdx + 1) {
			setPickedUpId(null);
			return;
		}
		let toIdx = slotIdx;
		if (pickedUpIdx < slotIdx) toIdx -= 1;
		move(pickedUpIdx, toIdx, working[pickedUpIdx].id);
		setPickedUpId(null);
	}

	async function saveReorder() {
		// `rank` has a UNIQUE constraint, so a single pass of parallel updates
		// can hit duplicate-key collisions. Two-pass: park rows in a high offset
		// range (still unique), then settle to 1..N.
		// TODO: replace with a single Postgres RPC if the list grows large.
		const orderedIds = working.map(c => c.id);
		const OFFSET = 1_000_000;
		setSaving(true);

		const phase1 = await Promise.all(
			orderedIds.map((id, i) =>
				supabase.from('ranked_cafes').update({ rank: OFFSET + i + 1 }).eq('id', id),
			),
		);
		const p1Errors = phase1.filter(r => r.error);
		if (p1Errors.length) {
			console.error(p1Errors.map(r => r.error));
			toast.error(`Save failed (phase 1, ${p1Errors.length} row${p1Errors.length === 1 ? '' : 's'})`);
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
			toast.error(`Save failed (phase 2, ${p2Errors.length} row${p2Errors.length === 1 ? '' : 's'})`);
			return;
		}

		const { data } = await supabase.from('ranked_cafes').select('*').order('rank');
		setItems(data ?? []);
		toast.success(`Saved order (${orderedIds.length} cafes)`);
		exitEditMode();
	}

	// Enter edit mode if URL has ?reorder=<id>.
	useEffect(() => {
		if (authLoading || !session || loading || editMode) return;
		const params = new URLSearchParams(window.location.search);
		const reorderId = params.get('reorder');
		if (reorderId) enterEditMode(Number(reorderId));
	}, [authLoading, session, loading]);

	if (loading) return <p>{LOADING}</p>;

	// In edit mode, show ALL items (archived included) in original-rank order.
	const displayItems = editMode ? working : visible;
	const showActions = !authLoading && !!session;

	// HTML columns are always: [handle?], rank, name, location, date, [action?].
	// Location/date hide via CSS on small screens but the cells stay in the DOM.
	const visibleColCount = (editMode ? 5 : 4) + (showActions ? 1 : 0);

	function renderSlot(slotIdx: number) {
		if (slotIdx === pickedUpIdx || slotIdx === pickedUpIdx + 1) return null;
		return (
			<tr class="insertion-slot" onClick={() => insertAt(slotIdx)}>
				<td colSpan={visibleColCount} />
			</tr>
		);
	}

	return (
		<div class="home">
			<div style={{display: 'flex', gap: '8px'}}>
				<h1>Ranked cafes</h1>
				{editMode && <span style={{
								display: 'inline-flex',
								alignItems: 'center',
								padding: '0.25rem 0.5rem',
								backgroundColor: 'rgba(255, 165, 0, 0.15)',
								color: 'orange',
								textWrap: 'nowrap',
							}}>
								Editing
							</span>}
			</div>

			<div class="filters">
				{editMode ? (
					<>
						<button
							type="button"
							onClick={saveReorder}
							disabled={!dirty || saving}
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
				) : (
					<>
						<button
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

						<Popover
							trigger={<Icon name="funnel" />}
							tooltip="Filter by tag"
							variant="ghost"
							triggerClass={selectedTags.size > 0 ? 'is-active' : undefined}
						>
							<TagMultiSelect
								tags={tags}
								selected={selectedTags}
								onToggle={toggleTag}
								onClear={() => setSelectedTags(new Set())}
							/>
						</Popover>

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

						{showActions && (
							<button
								type="button"
								data-variant="ghost"
								onClick={() => enterEditMode()}
								data-tooltip="Edit rank order"
								aria-label="Edit rank order"
							>
								<Icon name="pencil-simple" /> Edit
							</button>
						)}
					</>
				)}
			</div>

			{!editMode && showSearch && (
				<input
					ref={searchRef}
					type="search"
					placeholder="Search name, city, state…"
					value={query}
					onInput={e => setQuery(e.currentTarget.value)}
					class="search-input"
				/>
			)}

			<table class="data-table cafe-list">
				<thead>
					<tr style={{ textAlign: 'left' }}>
						{editMode && <th data-col="handle" aria-label="Drag handle" />}
						<th
							data-col="rank"
							onClick={editMode ? undefined : () => clickSort('rank')}
							style={editMode ? undefined : { cursor: 'pointer' }}
							aria-sort={sortBy === 'rank' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
						>
							#{!editMode && sortIndicator('rank')}
						</th>
						<th data-col="name">Cafe Name</th>
						<th data-col="location">Location</th>
						<th
							data-col="date"
							onClick={editMode ? undefined : () => clickSort('date')}
							style={editMode ? undefined : { cursor: 'pointer' }}
							aria-sort={sortBy === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
						>
							Visited{!editMode && sortIndicator('date')}
						</th>
						{showActions && <th data-col="action" aria-label="Actions" />}
					</tr>
				</thead>
				<tbody>
					{editMode && isPickingUp && renderSlot(0)}
					{displayItems.map((cafe, index) => {
						const origIdx = originalIndexById?.get(cafe.id) ?? index;
						const isTouched = editMode && touched.has(cafe.id);
						const wasMoved = isTouched && origIdx !== index;
						const picked = editMode && pickedUpId === cafe.id;
						const otherIsHeld = isPickingUp && !picked;
						return (
							<Fragment key={cafe.id}>
								<tr data-archived={cafe.archived || undefined}>
									{editMode && (
										<td data-col="handle">
											<button
												type="button"
												data-variant="ghost"
												data-active={picked || undefined}
												onClick={() => togglePickUp(cafe.id)}
												disabled={otherIsHeld}
												aria-label={picked ? 'Put down' : 'Pick up'}
												style={{ cursor: 'grab' }}
											>
												<Icon name="dots-six-vertical" />
											</button>
										</td>
									)}
									<td data-col="rank"><strong>{editMode ? index + 1 : (cafe.rank || index + 1)}</strong></td>
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
									<td data-col="date">{shortDate(cafe.date_visited)}</td>
									{showActions && (
										<td data-col="action">
											{editMode ? (
												<>
													<button
														type="button"
														data-variant="ghost"
														onClick={() => moveUp(index)}
														disabled={otherIsHeld || index === 0}
														aria-label="Move up"
													>
														<Icon name="caret-up" />
													</button>
													<button
														type="button"
														data-variant="ghost"
														data-active={picked || undefined}
														onClick={() => togglePickUp(cafe.id)}
														disabled={otherIsHeld}
													>
														{picked ? 'Put down' : 'Pickup'}
													</button>
													<button
														type="button"
														data-variant="ghost"
														onClick={() => moveDown(index)}
														disabled={otherIsHeld || index === displayItems.length - 1}
														aria-label="Move down"
													>
														<Icon name="caret-down" />
													</button>
												</>
											) : (
												<Popover
													trigger={<Icon name="dots-three" />}
													tooltip="More"
													variant="ghost"
												>
													<a href={`/cafe/${cafe.id}`}>Edit</a>
													<button
														type="button"
														onClick={() => enterEditMode(cafe.id)}
													>
														Move
													</button>
													<button
														type="button"
														onClick={() => toggleArchive(cafe)}
													>
														{cafe.archived ? 'Unarchive' : 'Archive'}
													</button>
												</Popover>
											)}
										</td>
									)}
								</tr>
								{editMode && isPickingUp && renderSlot(index + 1)}
							</Fragment>
						);
					})}
				</tbody>
			</table>

			{!editMode && visible.length === 0 && (
				<p><small>No cafes match your filters.</small></p>
			)}

			{editMode && isPickingUp && (
				<div class="pickup-bar">
					Holding&nbsp;<strong>{working[pickedUpIdx].name}</strong>
					<button
						type="button"
						data-variant="ghost"
						onClick={() => setPickedUpId(null)}
						style={{ marginLeft: 'auto' }}
					>
						Put down
					</button>
				</div>
			)}
		</div>
	);
}
