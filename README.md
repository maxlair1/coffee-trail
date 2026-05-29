# Olivia's Coffee Trail

A ranked list of cafes with photos, tags, and per-cafe map. Personal site, built to be edited by one user.

## Stack

- **Preact** 10.26 + **preact-iso** 2.12 (routing, prerender)
- **Vite** 7 + **TypeScript** 6
- **Zustand** 5 (filters/scroll persistence, toast state)
- **Supabase** 2.106 (Postgres + Auth + Storage)
- **Phosphor Icons** 2.1 — **bold weight only** (see [DESIGN.md](DESIGN.md))
- No CSS framework, no UI kit. Plain CSS + native browser primitives.

## Dev

```sh
npm install
npm run dev      # vite dev server
npm run build    # vite build → dist/ (with dist/404.html copy for SPA fallback)
npm run preview  # serve the production build locally
```

`.env` needs your Supabase URL + anon key — see `src/api/client.ts` for the exact var names.

## Database

Supabase Postgres. Two tables and one storage bucket.

### `tags`
| column | type |
|---|---|
| id | bigint pk |
| name | text |
| color | text (hex) |
| icon | text (Phosphor name, nullable) |

### `ranked_cafes`
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| created_at | timestamptz | |
| name | text | |
| images | text[] | public storage URLs |
| body | text | notes |
| date_visited | date | nullable |
| city, state, address | text | nullable |
| tags | bigint[] | references `tags.id` |
| rank | int | original/canonical rank; the UI displays a compressed 1..N |
| archived | bool | hidden by default in the list |
| map_hidden | bool | optional — per-cafe hide-map toggle |
| map_query | text | optional — overrides the auto-derived map search |

`map_hidden` and `map_query` are optional columns; the save payload only sends them if the row already exposes them. Add them when you want the feature:

```sql
alter table ranked_cafes
  add column map_hidden boolean default false,
  add column map_query text;
```

### Storage bucket

`cafe-images` — **public** bucket for the uploaded photos. Image uploads downsample to 1600px JPEG (q=0.85) client-side before uploading.

Required policy for logged-in upload:
```sql
create policy "authenticated can upload cafe images"
on storage.objects for insert to authenticated
with check (bucket_id = 'cafe-images');
```

### Auth

Email/password via Supabase Auth. Single admin user; auth gates edit actions, not reads.

## What's where

- `src/pages/` — Home, Cafe, Tags, Login
- `src/components/ui/` — Tag, Popover, Gallery, Carousel-less now (lightbox dialog inside Gallery), Toaster, TagMultiSelect, Icon, ColorSelect, IconSelect, SearchDropdown
- `src/components/` — Header, Map (Google embed + skeleton + dark-mode filter), AuthGuard
- `src/utils/` — toast, upload, rank, date, hooks, homeStore, color
- `src/api/` — supabase client + generated types
- `styles/global.css` — single stylesheet, organized roughly by component
- [DESIGN.md](DESIGN.md) — color tokens, button variants, hover gating, popover-as-sheet, gallery, carousel, rounded-corners rule. **Read this before adding UI.**

## Notable conventions

- **Web-native first**: native `popover`, `<dialog>`, `<input type="search">`, CSS-only mobile sheet, `@media (hover: hover)` for hover gating. No animation libs.
- **Theme toggle** lives in the header — sets `color-scheme` + `data-theme` on the root; the map iframe gets a CSS filter in dark mode since Google's embed has no theme param.
- **Ranks** displayed everywhere are "position among non-archived cafes" (see `utils/rank.ts` → `compressRanks`). Original rank stays in the DB.
- **Filters and scroll position** persist across in-session navigation via a zustand store (`utils/homeStore.ts`). Hard reload clears them.
