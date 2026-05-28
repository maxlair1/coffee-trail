# Design notes

Conventions to follow when adding UI. Keep this file short — it's a reference, not a spec.

## Principles

- **Web-native first.** Use browser primitives (`popover`, `<dialog>`, `<input type="search">`, `<input type="date">`, `aria-pressed`, etc.) before reaching for JS. Use CSS (`@media (hover: hover)`, `position-area`, `::backdrop`, `@starting-style`) before reaching for libraries.
- **Simple over abstract.** Inline small one-offs. Don't add a wrapper component until something is used in two places. No animation libs, no UI kits.
- **Match what's already there.** Stack: Preact + Zustand + Supabase + Phosphor (bold) + plain CSS. New code should look like existing code.

## Color tokens

Used as literals (no CSS variables yet — fine while the palette is this small):

| Token | Value | Where |
|---|---|---|
| Interactive accent | `#2960D1` (from `COLOR_PRESETS`) | Toggled/active state on ghost buttons |
| Emphasis accent | `orange` | Rank number on cafe page |
| Danger | `#d33` | Destructive action text |
| Muted text | `opacity: 0.6` on `<small>` | Secondary metadata |
| Hover wash | `rgba(128, 128, 128, 0.15)` | Ghost button hover |
| Pressed wash | `rgba(128, 128, 128, 0.25)` | Ghost button `:active` |
| Border (soft) | `var(--border)` → `color-mix(in srgb, CanvasText 20%, transparent)` | All borders (popover, hr, swatches, header) |

`Canvas` / `CanvasText` system colors are used for popover backgrounds so they respect the user's color scheme.

## Buttons

Two variants, both opt-in via `data-variant`:

- **`data-variant="ghost"`** — transparent background, gains a gray wash on hover, gray wash on press. Use for toolbar/icon actions. Default button styling otherwise.
- **`data-variant="danger"`** — red text (`#d33`), faint red wash on hover/press. Use for destructive actions (delete, archive permanently).

### Ghost button states (visually distinct, by design)

| State | Background | Text | When |
|---|---|---|---|
| Idle | transparent | inherit | default |
| Hover | gray wash 0.15 | inherit | `:hover` (only on `hover: hover` devices) |
| Pressed | gray wash 0.25 | inherit | `:active` |
| Toggled | blue wash 0.18 | `#2960D1` | `[data-active]` or `.is-active` |

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

`uploadCafeImage(file, cafeId)` from `src/utils/upload.ts` — downsamples to max 1600px on the long edge as JPEG (q=0.85) via canvas, then uploads to the `cafe-images` Supabase Storage bucket and returns the public URL. The bucket must exist and be public-readable; RLS must allow `insert` for authenticated users on `storage.objects` where bucket is `cafe-images`.

## Rounded corners

Default to **sharp edges**. Only buttons and form fields (`<input>`, `<select>`, `<textarea>`) get rounded corners (≤4px). Tag pills (`.tag-pill`) keep their 999px radius because pill shape is part of their identity. Tiny "control" elements (color swatches, the thumb remove × button) can keep small rounding since they're button-like.

Containers (popovers, toasts, cards, thumbnails, dialogs, etc.) are sharp.

## Tables

Default browser table styling. The home table doesn't use `table-layout: fixed`; column widths are intrinsic. If a cell needs constraint + overflow scroll, set `max-width` on an inner `div` with `overflow-x: auto` rather than messing with table layout.
