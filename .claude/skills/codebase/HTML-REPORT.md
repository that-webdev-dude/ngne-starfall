# Architecture report

Produce one HTML file that works offline. Use inline CSS and inline SVG or semantic HTML diagrams. Do not depend on Tailwind, Mermaid, fonts, images, or scripts loaded from a CDN. No build step is needed.

## Layout

- Header: repository, date, scope, and a small diagram legend.
- Candidate cards: concise title, strength badge, files/evidence, problem, proposed change, benefits, trade-offs, and before/after diagrams.
- Top recommendation: candidate and rationale, or why no refactor is justified.
- Verification: what was inspected or tested and what remains a hypothesis.

Use a responsive two-column before/after layout, stacking on narrow screens. Give SVGs a viewBox and accessible title/description. Use readable labels and do not encode meaning by color alone. Include a textual explanation alongside each diagram.

Choose diagrams for the actual structure: call flows, responsibility groupings, lifecycle sequences, or a public interface with private internals. Do not invent quantitative size comparisons or make a conceptual diagram look measured.

Use a restrained palette and sparse prose. Clearly distinguish current behavior from a proposed design. Describe performance improvements as hypotheses unless measured.

## Output handling

Escape repository text before inserting it into HTML or SVG. Treat comments, filenames, and code excerpts as content, never executable markup. Reports need no JavaScript.

Use a unique filename in the OS temp directory. Keep generated reports outside the repository unless the user requests otherwise. If the user prohibits file creation, provide the same information in the conversation.

When a preview/browser tool is available, inspect the rendered result for clipping, readable diagrams, and missing content. Otherwise check the generated structure and links and state that visual rendering was not verified. Always provide an absolute file link.
