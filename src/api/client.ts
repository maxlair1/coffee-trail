import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

// https://vite.dev/guide/env-and-mode
const SB_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const SB_PUBLISHABLE = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Pass first the link to database, then the unique supabase key
export const supabase = createClient<Database>(SB_URL, SB_PUBLISHABLE);