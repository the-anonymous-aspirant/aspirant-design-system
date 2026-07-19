<script setup>
import AspContent from '../src/components/AspContent.vue'
import AspCard from '../src/components/AspCard.vue'

const MARKDOWN = `# Deploy report

The blue-green pair swapped at **09:14 UTC**. Two of the three checks passed on
the first probe; the third needed a retry after a transient DNS failure.

## Checks

- \`GET /healthz\` — 200, 41ms
- \`GET /readyz\` — 200, 96ms
- \`GET /metrics\` — retried once, then 200

> The retry is expected on a cold container and is not counted as a failure.

See the [deploy runbook](https://example.invalid/runbook) for the rollback path.

| Check | Result | Latency |
| --- | --- | --- |
| healthz | pass | 41ms |
| readyz | pass | 96ms |
| metrics | pass (retry) | 210ms |

---

Closing note: nothing to action.
`

const FENCED = `Reproduction below.

\`\`\`python
import asyncio
from dataclasses import dataclass


@dataclass
class Probe:
    """A single health probe against one upstream."""

    url: str
    timeout: float = 2.5
    retries: int = 1

    async def run(self) -> bool:
        for attempt in range(self.retries + 1):
            try:
                await asyncio.wait_for(fetch(self.url), self.timeout)
                return True
            except TimeoutError:
                if attempt == self.retries:
                    raise
        return False
\`\`\`

And the shell that drives it:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

for host in "\${HOSTS[@]}"; do
  curl -fsS --max-time 3 "https://\${host}/healthz" || echo "down: \${host}"
done
\`\`\`

A fence with no language hint is escaped and rendered unhighlighted rather
than guessed at:

\`\`\`
2026-07-19T09:14:02Z  swap  green -> blue  ok
2026-07-19T09:14:03Z  probe /healthz       200
\`\`\`
`

// Deliberately hostile to a markdown parser: leading indentation it would eat,
// bare `*` it would read as emphasis, `#` it would read as a heading. This is
// the body that rendered as mangled paragraphs before this component existed.
const RAW_SOURCE = `# module: probe_runner
# NOTE: the * below is a glob, not emphasis

from pathlib import Path

DEFAULTS = {
    "timeout": 2.5,
    "retries": 1,
    "globs": ["*.yaml", "*.yml"],
}


def load(root: Path) -> dict:
    merged = dict(DEFAULTS)
    for pattern in DEFAULTS["globs"]:
        for path in sorted(root.glob(pattern)):
            if path.name.startswith("_"):
                continue
            merged.update(parse(path))
    return merged
`

const LONG_BODY = Array.from(
  { length: 60 },
  (_, i) =>
    `## Section ${i + 1}\n\nParagraph ${i + 1} of a body long enough that an uncapped ` +
    `renderer would expand to the full page height and push every surrounding ` +
    `control off-screen — the third defect this component was filed against.\n`
).join('\n')

// Built by concatenation, never written contiguously: a literal closing script
// tag in this string would terminate the `<script setup>` block itself, and
// escaping it (`<\/script>`) trips `no-useless-escape`. Splitting after `</`
// is enough — that pair alone does not close anything.
const CLOSE_SCRIPT = '</' + 'script>'
const XSS = `A body is untrusted input, so raw HTML is escaped rather than passed through:

<script>alert('xss')${CLOSE_SCRIPT}
<img src=x onerror="alert('xss')">

Markdown still renders **normally** around it.
`
</script>

<template>
  <Story title="Components/AspContent">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the artifact/report body renderer — a body that arrives as opaque
        text (a markdown report, a source file, a log dump) and has to render without mangling,
        without unbounded growth, and without a hand-authored markup step.
      </p>
      <p>
        <strong>When to use:</strong> rendering an artifact, report, or task body you did not
        author. <strong>When not to use:</strong> content you already have as markup — that is
        <code>AspProse</code>, which styles descendants it is handed. The difference is the parse:
        <code>AspContent</code> owns it, because all three defects it was filed against
        (<code>#2382</code>) happen during the render, not during the styling.
      </p>
      <p>
        <strong>Contrast role: MIXED</strong> (spec amendment <code>#2382</code> comment 9767;
        <code>system_3_design_conventions.md</code> §3.18). Prose <em>inherits</em> — no colour, no
        background, so it is legible on the light page and on a dark card alike. Code blocks
        <em>paint</em> — background and ink declared together, which is what makes the highlight
        ramp's contrast provable once instead of once per theme.
      </p>
      <p>
        <strong>No stock highlight.js theme is vendored.</strong> A third-party theme ships a
        palette tuned for its own background, so dropping one in overrides token ink with colours
        chosen against a different surface entirely. The ramp is re-mapped onto DS tokens and every
        colour was measured against <em>both</em> resolved code surfaces — <code>#2e2e2e</code> in
        the light theme, <code>#373737</code> in the dark — and clears 4.5:1. Four tokens failed
        that measurement and are excluded: <code>--chart-series-3</code> (3.97),
        <code>--chart-series-5</code> (4.44), <code>--chart-series-4</code> (3.51),
        <code>--chart-series-9</code> (2.90). The green one is the trap — "strings are green" is the
        reflex, and strings are the largest token class in a highlighted body.
      </p>
      <p>
        <strong><code>type="auto"</code> is biased away from markdown.</strong> Mis-reading source
        as markdown is the logged defect — eaten indentation, <code>*</code> as emphasis.
        Mis-reading markdown as source is merely plain-looking. The costs are not symmetric, so
        neither is the test: markdown has to be affirmatively evidenced.
      </p>
    </template>

    <Variant title="Markdown">
      <AspCard>
        <AspContent :content="MARKDOWN" type="markdown" />
      </AspCard>
    </Variant>

    <Variant title="Fenced code (highlighted)">
      <AspCard>
        <AspContent :content="FENCED" type="markdown" />
      </AspCard>
    </Variant>

    <Variant title="Raw source (preserved, not mangled)">
      <AspCard>
        <AspContent :content="RAW_SOURCE" type="code" language="python" />
      </AspCard>
      <p class="note">
        The same string under <code>type="markdown"</code> is the defect: indentation eaten,
        <code>#</code> promoted to a heading, <code>*.yaml</code> read as emphasis.
      </p>
    </Variant>

    <Variant title="Raw source under `auto` (sniffed as code)">
      <AspCard>
        <AspContent :content="RAW_SOURCE" type="auto" language="python" />
      </AspCard>
    </Variant>

    <Variant title="Very long body (capped, scrolls internally)">
      <AspCard>
        <AspContent :content="LONG_BODY" type="markdown" :max-height="320" />
      </AspCard>
      <p class="note">
        Capped at 320px with an internal scroll region. The region is focusable
        (<code>tabindex="0"</code>, <code>role="region"</code>) so its content is reachable by
        keyboard — a scroller that only a mouse can move is unreachable content (WCAG 2.1.1).
      </p>
    </Variant>

    <Variant title="Uncapped (max-height null)">
      <AspCard>
        <AspContent :content="MARKDOWN" type="markdown" :max-height="null" />
      </AspCard>
      <p class="note">
        For a caller that already has its own scroll container and would otherwise nest two.
      </p>
    </Variant>

    <Variant title="Plain text">
      <AspCard>
        <AspContent
          :content="'no markdown here\n  just two spaces of indentation\n  and a * that is not emphasis'"
          type="text"
        />
      </AspCard>
    </Variant>

    <Variant title="Empty">
      <AspCard>
        <AspContent content="" />
      </AspCard>
    </Variant>

    <Variant title="Raw HTML is escaped">
      <AspCard>
        <AspContent :content="XSS" type="markdown" />
      </AspCard>
      <p class="note">
        <code>marked</code> has shipped no sanitiser since v5 and an artifact body is written by an
        agent or a tool. Escaping at the renderer is the narrow fix: markdown still renders,
        <code>&lt;script&gt;</code> renders as visible text.
      </p>
    </Variant>

    <Variant title="On the light page (prose inherits)">
      <div class="light-pane">
        <AspContent :content="FENCED" type="markdown" />
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspContent :content="FENCED" type="markdown" />
      </div>
    </Variant>

    <Variant title="Dark theme, on a card">
      <div data-theme="dark" class="dark-pane">
        <AspCard>
          <AspContent :content="MARKDOWN" type="markdown" :max-height="320" />
        </AspCard>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.dark-pane,
.light-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
