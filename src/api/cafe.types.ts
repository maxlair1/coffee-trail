import { type Tag } from "./tag.types";

export type Cafe = {
  id: number;
  created_at: string;
  name: string;
  images: string[] | null;
  body: string;
  date_visited: string | null; // ISO date string "YYYY-MM-DD"
  city: string | null;
  state: string | null;
  address: string | null;
  tags: number[] | null;
  rank: number;
  archived: boolean;
  map_hidden?: boolean | null;
  map_query?: string | null;
};

// For inserts — omit auto-generated fields
export type CafeInsert = Omit<Cafe, "id" | "created_at" | "rank"> & {
  id?: number;
  created_at?: string;
  rank?: number;
};

// For updates — all fields optional except id
export type CafeUpdate = Partial<CafeInsert> & { id: number };

export type CafeWithTags = Omit<Cafe, "tags"> & {
  tags: Tag[] | null;
};