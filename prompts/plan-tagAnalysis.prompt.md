## Plan: Tag Analysis Page and Metadata Translation

TL;DR: Add a new `/tag-analysis` page with tag count statistics and visualizations, backed by a new server analysis API that uses `src/server/metadata/db.html.json` and `src/server/metadata/tags.json` for translated tag names and descriptions.

**Steps**
1. Add backend metadata helpers in `src/server/lib/tags.ts`.
   - Add `loadTagMetadata()` to read `db.html.json` and produce metadata objects with `name`, `intro`, and `links`.
   - Add `buildTagStats()` or `analyzeTags()` to aggregate manga tag counts from the existing `mangas` table.
   - Keep `getTagName()` and `buildTagMeta()` for existing translation behavior.
2. Expose a new API route in `src/server/routes/mangas.ts`.
   - Add `GET /api/mangas/tags/analysis`.
   - Return tag counts by namespace, total manga count, top tags, namespace summary, and enriched metadata from `db.html.json`/`tags.json`.
   - Support optional `namespace` query filtering so the page can show single-namespace details.
3. Add a frontend page component `src/pages/TagAnalysis.tsx`.
   - Use `useQuery` and `client.api.mangas.tags.analysis.get()` to fetch analysis data.
   - Render summary cards for total mangas, namespaces, and unique tags.
   - Render a bar-style ranking list for top tags by count.
   - Render a tag cloud visualization for top tags with font size or badge size keyed to count.
   - Render metadata translations/descriptions for selected tag or namespace.
4. Add navigation and routing.
   - Add a route in `src/App.tsx` for `/tag-analysis` pointing to `TagAnalysis`.
   - Add a button/link in `src/pages/Library.tsx` header to open `/tag-analysis`.
5. Add or extend types in `src/types.ts`.
   - Include response types for tag analysis data and metadata entries.
   - Keep the new page strongly typed.
6. Ensure UI/UX details.
   - Use simple Tailwind-style cards and layout matching the existing dark theme.
   - Show raw intro text or sanitized HTML from the metadata database.
   - Keep the analysis page independent but accessible from the library header.

**Verification**
1. Start the app and open `/tag-analysis`.
2. Confirm the page shows tag frequency stats, namespace summary, top tag bar list, and a tag cloud.
3. Confirm translated names and descriptions appear from `db.html.json` / `tags.json` metadata.
4. Confirm the Library header button navigates to the analysis page.
5. Run `bun run lint` or equivalent type checks to catch issues.

**Decisions**
- Use a dedicated `/tag-analysis` SPA route plus a Library header navigation button.
- Visualize both ranked counts and a tag cloud to meet the requested graph format.
- Use backend aggregation rather than adding new DB schema columns.
- Use existing metadata cleaning logic plus raw `db.html.json` descriptions for richer tag info.

**Further Considerations**
1. If tag analysis response becomes expensive, the backend can be optimized later with incremental statistics or cached JSON.
2. If the metadata descriptions contain HTML, sanitize or strip tags before rendering.
3. If the app needs deeper translation support, a second route for `tags/metadata` could be added later.