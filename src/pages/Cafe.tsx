import { Route, useRoute } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { type Cafe } from '../api/cafe.types';
import { supabase } from '../api/client';
import { NotFound } from './_404';
import { Map } from '../components/Map';

export function Cafe() {
    const [cafe, setCafe] = useState(null); // state to hold the JSON array
    const [loading, setLoading] = useState(true);
    
    const { params } = useRoute();
    const id = params.id ?? "";
    console.log(Number(id));

    useEffect(() => {
        async function fetchData() {
        try {
            const { data, error } = await supabase
            .from('ranked_cafes')
            .select("*")
            .eq("id", Number(id))
            .single();

            if (error) throw error;
            setCafe(data);
            console.log("Fetched Data successfully:", data); 
        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
        }

        fetchData();
    }, []);
    
    // if (isNaN(Number(id))) return <NotFound/>

    if (loading) return <p>Loading...</p>

    return (
    <>
        <a href="../">
            <button>
               ← Go back
            </button>
        </a>
        <br />
        <div>Cafe ID: {id}</div>
        <br/>
        <h1>{cafe.name}</h1>
        <br/>
        <Map
            name={cafe.name}
            city={cafe.city}
            state={cafe.state}
            address={cafe.address}
        />
    </>

    );
}