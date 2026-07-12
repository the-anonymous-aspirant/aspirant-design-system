# Penpot Main Components

The DS ships Vue components (`src/components/Asp*.vue`) and a design-token export
(`build/tokens.penpot.json`). To make the operator's *design ↔ code* loop work, the same
components must exist as **Penpot Main Components** in the `system_3-mockups` Penpot file, so the
operator can place them as instances and any shape change cascades — the visual analogue of the
Vue component cascade.

Penpot has no public API for creating components, and the target file stores its pages as
`fdata/pointer-map` + `fdata/objects-map` (lazy blob fragments), so a naive DB edit can't reach
the objects. This harness drives Penpot's **own** code instead.

## How it works

`scripts/penpot/build_components.clj` runs inside the Penpot backend container against the running
JAR. It:

1. Builds a minimal system (`{:app.db/pool …}`) pointed at the Penpot postgres.
2. Mutates the file through `app.srepl.helpers/process-file!` — Penpot's maintenance path:
   `get-file (realize pointers) → update-fn → validate-file-schema! → revn++ → update-file!`.
   Pointer-map / objects-map persistence and the revn bump are handled by Penpot, not us.
3. Inside `update-fn`, uses the library-import builder (`app.common.files.builder`):
   `add-page "Components" → add-board → add-shape* → add-component`. `add-component` registers the
   board in the file's `:components` map and marks it `main-instance`/`component-root`, so it shows
   in **Assets → Components**.

Fills, radius, stroke and shadow are bound to DS tokens via each shape's `:applied-tokens`
(e.g. `{:fill "color.surface.card" :r1 "radius.lg"}`) — **not raw hex** — so editing a token in the
Penpot Tokens panel cascades to every instance.

The build is **idempotent**: a component whose name already exists in the file is skipped, and the
"Components" page is reused if present. The 5 operator mockup pages are never touched. Existing
components are added on a dedicated page; re-running only adds what's missing.

## Run it

The Penpot stack must be running on this host (`~/penpot`), with the DB password in `~/penpot/.env`.

```bash
DRY=1 scripts/penpot/run.sh    # build + schema-validate only, no DB write (do this first)
scripts/penpot/run.sh          # persist
```

Override the target file with `FILE_ID=<uuid>`; the default is the `system_3-mockups` file.

## Verify

- Assets → Components tab lists the components (or query `(:components (:data file))`).
- Place an instance on a page — it renders with the component's token-driven styling.
- Change a bound token (e.g. `color.brand.primary-500`) in the Tokens panel — instances update.

## Adding components

Append an entry to `component-builders` in `build_components.clj`:

```clojure
{:name "AspButton" :build (fn [state] (-> state (fb/add-board {…}) (fb/add-shape {…})
                                          (fb/add-component {:component-id (uuid/next) :name "AspButton"})
                                          (fb/close-board)))}
```

Match the shape/tokens to the Vue source (`src/components/Asp*.vue`) and `docs/COMPONENTS.md`.
Run `DRY=1` first — the schema validator rejects a malformed component before any DB write.
