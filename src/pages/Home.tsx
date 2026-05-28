import { useAuth } from '../../context/AuthContext';
import { supabase } from '../api/client';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { type Cafe as CafeT } from '../api/cafe.types';
import { type Tag as TagT } from '../api/tag.types';
import { Popover } from '../components/ui/Popover';
import { Icon } from '../components/ui/Icon';
import { TagMultiSelect } from '../components/ui/TagMultiSelect';
import { LOADING } from '../constants';

export function Home() {
	const [items, setItems] = useState<CafeT[]>([]);
	const [tags, setTags] = useState<TagT[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
	const [showArchived, setShowArchived] = useState(false);
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
	const searchRef = useRef<HTMLInputElement>(null);
	const { loading: authLoading, session } = useAuth();

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
		result.sort((a, b) => sortDir === 'asc' ? a.rank - b.rank : b.rank - a.rank);
		return result;
	}, [items, query, selectedTags, showArchived, sortDir]);

	function toggleTag(id: number) {
		setSelectedTags(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	if (loading) return <p>{LOADING}</p>;

	return (
		<div class="home">
			<h1>Ranked cafes</h1>

			<div class="filters">
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

				{selectedTags.size > 0 && (
					<button
						type="button"
						data-variant="ghost"
						onClick={() => setSelectedTags(new Set())}
					>
						Clear {selectedTags.size} filter{selectedTags.size === 1 ? '' : 's'}
					</button>
				)}

				<button
					type="button"
					data-variant="ghost"
					onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
					data-tooltip={sortDir === 'asc' ? 'Sort: rank ascending' : 'Sort: rank descending'}
					aria-label={`Sort rank ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
				>
					<Icon name={sortDir === 'asc' ? 'sort-ascending' : 'sort-descending'} />
				</button>

				<button
					type="button"
					data-variant="ghost"
					data-active={showArchived || undefined}
					onClick={() => setShowArchived(v => !v)}
					data-tooltip={showArchived ? 'Hide archived' : 'Show archived'}
					aria-label={showArchived ? 'Hide archived' : 'Show archived'}
					aria-pressed={showArchived}
				>
					<Icon name="archive" />
				</button>

				{!authLoading && session && (
					<button
						type="button"
						data-variant="ghost"
						data-tooltip="Edit"
						aria-label="Edit"
					>
						<Icon name="pencil-simple" />
					</button>
				)}
			</div>

			{showSearch && (
				<input
					ref={searchRef}
					type="search"
					placeholder="Search name, city, state…"
					value={query}
					onInput={e => setQuery(e.currentTarget.value)}
					class="search-input"
				/>
			)}

			<table>
				<thead>
					<tr style={{ textAlign: 'left' }}>
						<th>#</th>
						<th>Cafe Name</th>
						<th>City</th>
					</tr>
				</thead>
				<tbody>
					{visible.map((cafe, index) => (
						<tr key={cafe.id}>
							<td><strong>{cafe.rank || index + 1}</strong></td>
							<td>
								<a href={`/cafe/${cafe.id}`}>{cafe.name}</a>
								{cafe.archived && (
									<small style={{ marginLeft: '0.5rem', opacity: 0.6 }}>(archived)</small>
								)}
							</td>
							<td>{cafe.city || 'N/A'}</td>
						</tr>
					))}
				</tbody>
			</table>

			{visible.length === 0 && (
				<p><small>No cafes match your filters.</small></p>
			)}
		</div>
	);
}
