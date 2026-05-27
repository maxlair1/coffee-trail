import { useAuth } from '../../context/AuthContext';
import { supabase } from '../api/client';
import { useEffect, useState } from 'preact/hooks';

export function Home() {
	const [items, setItems] = useState([]); // state to hold the JSON array
	const [loading, setLoading] = useState(true);
	const {loading: authLoading, session} = useAuth();

	useEffect(() => {
		async function fetchData() {
		try {
			const { data, error } = await supabase
			.from('ranked_cafes')
			.select("*")
			.order('rank', { ascending: true });

			if (error) throw error;
			setItems(data); // 3. Save the JSON data to state
			console.log("Fetched Data successfully:", data); 
		} catch (error) {
			console.error('Error fetching data:', error.message);
		} finally {
			// setTimeout(() => {
			// }, 1000)
			setLoading(false);
		}
		}

		fetchData();
	}, []);

	if (loading) return <p>loading...</p>

	return (
		<div class="home">
			<h1>Ranked cafes</h1>

			{/* Actions */}
			<div style={{
				display: 'flex',
				gap: '0.5rem'
			}}>

				{!authLoading && session && <button>edit</button>}
				<button>search</button>
			</div>

			<table>
			<thead>
				<tr style={{textAlign: 'left' }}>
				<th>#</th>
				<th>Cafe Name</th>
				{/* Add columns below if you fetch them via .select('*') */}
				<th>City</th>
				</tr>
			</thead>
			<tbody>
				{items.map((cafe, index) => (
				<tr key={index}>
					{/* Fallback to index + 1 if the 'rank' column wasn't selected */}
					<td>
						<strong>
							{cafe.rank || index + 1}
						</strong>
					</td>
					<td>
						<a href={`/cafe/${cafe.id}`}>
							{cafe.name}
						</a>
					</td>
					<td>{cafe.city || 'N/A'}</td>
				</tr>
				))}
			</tbody>
			</table>
			
		</div>
	);
}
