import { supabase } from "./client"


export const getData = async () => {
     const { data, error } = await supabase.from("ranked_cafes").select();
     return data;
}