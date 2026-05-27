import { useRoute } from 'preact-iso';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { type Cafe as CafeT } from '../api/cafe.types';
import { type Tag } from '../api/tag.types';
import { supabase } from '../api/client';
import { Map as CafeMap } from '../components/Map';
import { formatDate } from '../utils/date';
import { LOADING } from '../constants';

const FIELDS: { label: string; value: (c: CafeT, tags: Map<number, Tag>) => any }[] = [
	{ label: 'Rank', value: c => c.rank },
	{ label: 'Visited', value: c => c.date_visited && formatDate(c.date_visited) },
	{ label: 'City', value: c => c.city },
	{ label: 'State', value: c => c.state },
	{ label: 'Address', value: c => c.address },
	{ label: 'Tags', value: (c, tags) => c.tags?.map(id => tags.get(id)?.name).filter(Boolean).join(', ') },
	{ label: 'Notes', value: c => c.body },
	{ label: 'Added', value: c => formatDate(c.created_at) },
	{ label: 'Archived', value: c => c.archived ? 'Yes' : null },
];

export function Cafe() {
	const [cafe, setCafe] = useState<CafeT | null>(null);
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(true);

	const { params } = useRoute();
	const id = params.id ?? '';

	useEffect(() => {
		async function fetchData() {
			const [cafeRes, tagsRes] = await Promise.all([
				supabase.from('ranked_cafes').select('*').eq('id', Number(id)).single(),
				supabase.from('tags').select('*'),
			]);
			if (cafeRes.error) console.error(cafeRes.error);
			if (tagsRes.error) console.error(tagsRes.error);
			setCafe(cafeRes.data);
			setTags(tagsRes.data ?? []);
			setLoading(false);
		}
		fetchData();
	}, [id]);

	const tagById = useMemo(() => new Map(tags.map(t => [t.id, t])), [tags]);

	if (loading) return <p>{LOADING}</p>;
	if (!cafe) return <p>Not found</p>;

	return (
		<section style={{
            marginInline: 'auto',
            maxWidth: '70ch'
        }}>
            <a href="../">
                <button>← Back</button>
            </a>
			<h1><em style={{
                color: 'orange',
                fontWeight: 'bold'
            }}>#{cafe.rank}</em>&nbsp;&nbsp;{cafe.name}</h1>

			<CafeMap name={cafe.name} city={cafe.city} state={cafe.state} address={cafe.address} />

			<table>
				<tbody>
					{FIELDS.map(f => {
						const v = f.value(cafe, tagById);
						if (!v) return null;
						return <tr><th>{f.label}</th><td>{v}</td></tr>;
					})}
				</tbody>
			</table>
		</section>
	);
}
