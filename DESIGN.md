# Design notes

Conventions to follow when adding UI. Keep this file short — it's a reference, not a spec.

## Principles

- **Web-native first.** Use browser primitives (`popover`, `<dialog>`, `<input type="search">`, `<input type="date">`, `aria-pressed`, etc.) before reaching for JS. Use CSS (`@media (hover: hover)`, `position-area`, `::backdrop`, `@starting-style`) before reaching for libraries.
- **Simple over abstract.** Inline small one-offs. Don't add a wrapper component until something is used in two places. No animation libs, no UI kits.
- **Match what's already there.** Stack: Preact + Zustand + Supabase + Phosphor (bold) + plain CSS. New code should look like existing code.

## Color tokens

CSS variables in `:root`. All derive from `Canvas` / `CanvasText` system colors so themes adapt automatically.

```css
--surface-0: Canvas;                                              /* base */
--surface-1: color-mix(in srgb, CanvasText 4%, Canvas);           /* popovers, toasts */
--surface-2: color-mix(in srgb, CanvasText 8%, Canvas);           /* hovered/elevated */

--border:      color-mix(in srgb, CanvasText 20%, transparent);   /* default */
--border-soft: color-mix(in srgb, CanvasText 10%, transparent);   /* popovers, layered surfaces */

--accent: #2960D1;   /* interactive accent — toggled state, links */
--danger: #d33;      /* destructive action text */
```

**Surface ramp**: layered surfaces step toward `CanvasText` so they read as elevated against `--surface-0`. In light mode each step is slightly darker; in dark mode each step is slightly lighter — same code, automatic flip.

**Other rules:**

| Token | Value | Where |
|---|---|---|
| Emphasis accent | `orange` | Rank number on cafe page (kept literal — it's brand, not interactive) |
| Muted text | `opacity: 0.6` on `<small>` | Secondary metadata |
| Hover wash | `rgba(128, 128, 128, 0.15)` | Ghost button hover (theme-neutral gray) |
| Pressed wash | `rgba(128, 128, 128, 0.25)` | Ghost button `:active` |

For tinted backgrounds derived from `--accent` / `--danger`, use `color-mix(in srgb, var(--accent) N%, transparent)` — adapts if the brand color ever changes.

## Buttons

Two variants, both opt-in via `data-variant`:

- **`data-variant="ghost"`** — transparent background, gains a gray wash on hover, gray wash on press. Use for toolbar/icon actions. Default button styling otherwise.
- **`data-variant="danger"`** — red text (`#d33`), faint red wash on hover/press. Use for destructive actions (delete, archive permanently).

### Ghost button states (visually distinct, by design)

| State | Background | Text | When |
|---|---|---|---|
| Idle | transparent | `color-mix(CanvasText 65%, Canvas)` | default |
| Hover | gray wash 0.15 | `color-mix(CanvasText 90%, Canvas)` | `:hover` (only on `hover: hover` devices) |
| Pressed | gray wash 0.25 | (inherits from hover) | `:active` |
| Toggled | blue wash 0.18 | `#2960D1` | `[data-active]` or `.is-active` |

**Foreground rule:** ghost buttons render at ~65% intensity by default so they read as "interactive non-primary" rather than body text. Brighten to ~90% on hover. Toggled state owns the blue accent. Icons inherit `currentColor`, so this affects icon-only ghost buttons too.

The toggled state is **colored**, not just shaded, so it can't be mistaken for hover. For toggle buttons, set `data-active` and `aria-pressed`. The `.is-active` class is used when the trigger lives inside a wrapper component (e.g. `Popover`'s trigger).

## Icons

- **Phosphor, bold weight only.** Only `@phosphor-icons/web/bold` is imported. Don't pass `weight=` to `Icon` — let the default win. Don't add other weight imports without asking.
- Vary `color`, `opacity`, or `size` if you need visual differentiation.

## Tooltips

`data-tooltip="..."` on any element. Appears on hover (gated to `hover: hover`) or keyboard focus-visible. Use for icon-only buttons.

Pair with `aria-label` since touch users won't see the tooltip text.

## Popovers and sheets

Use the `Popover` component, which wraps the native `popover="auto"` attribute. Mark buttons inside the popover with `data-keep-open` if clicking them should not auto-dismiss (e.g., multi-select).

On screens `max-width: 600px`, popovers automatically become bottom sheets via a media query in `global.css` — no JS branching, no per-call config. The CSS resets `position-area` / `position-anchor` and re-anchors to the viewport bottom with a `::backdrop`.

## Hover gating

Wrap every `:hover` rule in `@media (hover: hover)`. Touch devices should never get sticky hover state. Focus-visible styles stay unwrapped.

## Tag pills

`<Tag name={...} color={bg} icon={...} onClear={...} />`. The pill computes a contrast-aware text color from its background. Pills:
- truncate with ellipsis inside the pill
- never wrap their own text (`text-wrap: nowrap`)
- inside `.row-tags` they don't shrink (`flex-shrink: 0`) so a horizontal scroll container can scroll them past the edge instead of squishing them

For multi-select pickers (filter, edit form), use `TagMultiSelect` inside a `Popover`.

## Toasts

`toast.success(msg)` / `toast.error(msg)` / `toast.info(msg)` from `src/utils/toast.ts`. Imperative — call from anywhere (event handlers, async functions). The `<Toaster />` component is mounted once at the app root in [index.tsx](src/index.tsx).

Use for **every** user-initiated API call: success on completion, error on failure. Users should never have to wonder whether a save worked. Auto-dismisses after 3.5s; click to dismiss early. Color-coded: green border for success (`#29A02A`), red for error (`#d33`), neutral for info.

State is a zustand store — already a dep, so no new infra.

## Gallery / Lightbox

`<Gallery images={[...]}>` in `src/components/ui/Gallery.tsx`. Renders a flat row of native-looking image thumbnails (no border, no rounded corners, auto-width at a fixed height — like a contact strip). Clicking one opens a native `<dialog>` lightbox with prev/next arrows + close + arrow-key nav. The dialog handles focus trap, Esc-to-close, and backdrop click via the browser.

Optional `onRemove(idx)` puts an `×` on thumbnails for edit mode. Optional `trailing` slot lets the caller append an "add" tile (file upload, etc.) inside the strip.

The Gallery is **images only** — keep the map separate (it's its own thing, rendered above). Don't mix media kinds in here.

## Map

`<Map />` in `src/components/Map.tsx` wraps a Google Maps embed iframe. Renders an animated `.map-skeleton` shimmer overlay until `onLoad` fires. In dark mode (when `documentElement[data-theme="dark"]` is set), the iframe gets `filter: invert(0.92) hue-rotate(180deg) saturate(1.15)` since Google's embed doesn't expose a theme parameter.

The map query is auto-derived from name/city/state/address. Pass `queryOverride` (or set `cafe.map_query` in the data) to override. `cafe.map_hidden = true` hides the map entirely.

## Image uploads

`uploadCafeImage(file, cafeId)` from `src/utils/upload.ts` — downsamples to max 1600px on the long edge as JPEG (q=0.85) via canvas, then uploads to the `cafe_images` Supabase Storage bucket and returns the public URL. The bucket must exist and be public-readable; RLS must allow `insert` for authenticated users on `storage.objects` where bucket is `cafe_images`.

## Edit modes & dirty-state guards

Pages with a destructive-if-lost editing flow follow this pattern:

- **Sticky banner at the top** when in edit mode — `.edit-banner` class, accent border, status text + Cancel + Save buttons. Make the mode unmissable.
- **Cancel button** checks `dirty` and calls `window.confirm("Discard changes?")` before exiting. Native dialog, accessible, zero JS.
- **`beforeunload` listener** wired in a `useEffect(() => { ... }, [dirty])` for full-page reload / external nav. Browser handles the rest. SPA route changes via clicked links aren't intercepted (preact-iso has no built-in router guard) — accept that gap, the banner stays visible to remind the user.
- **Save disabled when not dirty.** Show count of changes in the Save label when meaningful (`Save (3)`).

## Reorder / list-edit pattern

For reorderable lists ([ReorderList.tsx](src/components/ReorderList.tsx)):

- **Per-row controls: up arrow, pick-up handle, down arrow.** Arrows shift by one; pick-up enters "held" mode where the user clicks a slot between any two rows to drop the item. Works on touch, keyboard, and mouse without any drag-and-drop library or HTML5 `draggable=` attribute.
- **Pick-up mode**: disables other rows' arrows + pick-up buttons (`disabled` attribute), renders thin clickable "slot" rows between every pair of items. Slots adjacent to the picked-up row are hidden (would be no-ops).
- **"Was #N" badge** appears on rows whose position changed, so the user can audit their pending edits at a glance.
- HTML5 drag-and-drop is intentionally not used — the native API has poor touch support and requires significant JS to style cleanly. Arrows + pick-up cover every interaction with less code.

## Motion

One easing curve: **`var(--ease-out)`** = `cubic-bezier(0.22, 1, 0.36, 1)`. Snappy entrance, gentle settle. Use it for any UI transition (popovers, toasts, fade-ins).

Durations: keep them short. Popovers, hover state changes: **100–120ms**. Anything longer than 200ms feels sluggish for menu-level UI.

Transforms should be subtle (`translateY(-2px)`, `scale(1.05)`) — large moves draw the eye away from the actual change.

## Rounded corners

Default to **sharp edges**. Only buttons and form fields (`<input>`, `<select>`, `<textarea>`) get rounded corners (≤4px). Tag pills (`.tag-pill`) keep their 999px radius because pill shape is part of their identity. Tiny "control" elements (color swatches, the thumb remove × button) can keep small rounding since they're button-like.

Containers (popovers, toasts, cards, thumbnails, dialogs, etc.) are sharp.

## Interactive rows & row actions

For data tables whose rows are clickable/actionable:

- **Hover wash** — `tr:hover` gets `color-mix(in srgb, CanvasText 8%, transparent)` background, gated to `@media (hover: hover)` so it doesn't stick on touch. Sits on top of the 4% zebra so hovered rows read as slightly brighter regardless of which zebra band they're in.
- **Per-row actions** — add a dedicated column at the right end of the row. Put a standard `<button data-variant="ghost">` (or a `<Popover>` with `variant="ghost"`) inside. Always visible, no floating/absolute positioning, no hover gating — touch users get the same affordance as desktop users.

Don't reach for floating buttons / `backdrop-filter` / glassmorphism. A regular column is simpler and more native.

## Tables

Two patterns:

- **Vertical / data table** — rows are records, columns are attributes (e.g., the cafe list on Home). Opt in with `<table class="data-table">`. Gets: full-width, zebra stripes (4% CanvasText), `white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis` on cells, modest cell padding. Page-specific column widths live in a uniquely-named class on the same table (e.g., `cafe-list`) — don't scope page CSS with page-name selectors in `global.css`.
- **Horizontal / detail table** — rows are label/value pairs (e.g., the cafe detail page). Uses default browser table styling. Add a class if/when it needs treatment, but most of it should not.

If a cell needs a width constraint + overflow scroll, wrap the content in an inner `div` with `max-width` + `overflow-x: auto`. Don't reach for `table-layout: fixed` unless you really need it.

**Rule:** `global.css` selectors should be page-agnostic. Page-specific styling either gets a unique class name on the element (preferred for small one-offs) or a page-scoped CSS module file (for larger surfaces).
