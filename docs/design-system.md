# Linked Canvas design system

Linked Canvas should feel like a native Obsidian workspace, not a second
application embedded inside it. Its visual direction follows the
[Cupertino theme](https://github.com/aaaaalexis/obsidian-cupertino) principles:
fresh, familiar, focused, with quiet secondary UI and clear document
hierarchy. It does not copy Cupertino's global selectors or assets. It consumes
Obsidian's public text, surface, radius, shadow, motion, and editor variables.
Cupertino is a design reference, not a copied palette or runtime dependency.
The plugin therefore remains coherent when Cupertino is absent without
overriding any global Obsidian or third-party theme selector. The exact source
revision and license are recorded in `THIRD_PARTY_NOTICES.md`.

Its spatial interaction model borrows a separate principle from
[Heptabase](https://wiki.heptabase.com/fundamental-elements): the card is the
knowledge object; the whiteboard is a thinking context that places it without
owning it. Linked Canvas translates that model into Obsidian rather than
creating another card database.

## Product model

| Heptabase principle | Linked Canvas translation |
| --- | --- |
| Cards are independent of a whiteboard | Vault files remain authoritative; Canvas file nodes are instances |
| One card can appear on multiple whiteboards | One Markdown path can appear in any number of standard Canvas files |
| A whiteboard is an infinite thinking surface | Obsidian Canvas owns geometry, groups, text, media, and manual edges |
| Cards can be opened while context remains visible | Native Canvas file cards remain editable in place; Linked Map provides an optional larger Reading projection |
| Reference material stays beside the active thought | Canvas places files and media directly; Map can reuse one native right editor split |
| Advanced actions stay secondary | Direct actions appear on hover or keyboard focus; destructive actions stay in the menu |

The plugin does not duplicate Heptabase's Card Library, AI, collaboration,
journal, or nested-whiteboard systems. Obsidian already owns file discovery,
search, editors, and Canvas. Adding parallel navigation would increase depth
and split authority. The current note's real link neighbourhood is the primary
surface; a durable native Canvas is an advanced continuation when spatial work
is genuinely useful.

## Rules

1. **Content is primary.** Markdown, card titles, and relationships are easier
   to scan than the controls around them. Secondary actions appear on hover,
   keyboard focus, or a state that needs explanation.
2. **Scoped platform foundation.** Text, fonts, Reading content, and editor
   semantics remain native Obsidian. Plugin-scoped `--cg-*` surface, text, separator,
   accent, focus, spacing, radius, shadow, and motion tokens are aliases over
   the active host theme and never escape the plugin boundary.
3. **One visual vocabulary.** Canvas, compact cards, opened documents, controls,
   fields, and popovers have named semantic tokens. A component cannot invent
   a private colour, radius, shadow, duration, type size, or pixel dimension.
4. **Depth explains state.** Compact cards sit above the canvas; an opened
   document sits above compact cards; drag raises the same card without
   changing its dimensions. Accent is reserved for boundaries, focus, authored
   relationship meaning, and actionable state; it never fills a compact card.
5. **Theme-independent structure.** The stylesheet does not carry separate
   copied light/dark palettes. It must never detect a theme name, depend on
   Cupertino classes, or patch a specific theme.
6. **Geometry is stable.** Hover, focus, Reading, Source, and pin state cannot
   move or resize a card. Visual polish must not change the interaction
   contract.
7. **A board is not a graph screenshot.** The primary ribbon opens the current
   note's real connections without creating a board. The advanced Canvas launcher
   creates a blank standard Canvas, optionally starts with the current note, or
   reopens an existing board. It never converts every link in an index note into
   a spatial decision. After placement, the user's Canvas geometry is authoritative.

## Single source of truth

The block between `linked-canvas-design-tokens:start` and
`linked-canvas-design-tokens:end` at the top of `styles.css` is the only
place where Linked Canvas design values are declared.

- Platform aliases map only Obsidian public surface, text, separator, accent,
  focus, spacing, radius, shadow, motion, and font semantics.
- Semantic state tokens describe focus, open, pin, warning, and relationship
  states.
- Graph-only role, edge, grid, node, and geometry tokens are scoped to
  `.context-tree-view`; help-modal tokens are scoped separately and are not
  part of the shared contract.
- Component selectors consume those tokens through `var(--cg-...)`.

`npm run check:css` parses the stylesheet and rejects:

- `!important`;
- raw colours or component-level `color-mix()`;
- raw component lengths, type sizes, and animation durations;
- raw numeric typography values; and
- declared but unused Linked Canvas tokens.

Low-zoom TypeScript computes only the bounded visual scale. Action width,
padding, and toolbar clearance remain CSS tokens and are multiplied with that
scale in CSS; runtime code must not carry a second copy of those dimensions.

The responsive `700px` media-query condition is the only compile-time
exception. CSS custom properties cannot parameterise media-query conditions;
the card dimensions inside that query still use semantic tokens.

## Surface hierarchy

| Role | Light | Dark | Behaviour |
| --- | --- | --- | --- |
| Canvas | quiet base surface | quiet base surface | advanced spatial workspace; dot grid anchors pan and zoom |
| Compact card | primary surface | secondary surface | low native elevation and neutral border |
| Open Reading or Source | primary + restrained accent | raised secondary + restrained accent | strongest native elevation; fixed graph footprint |
| HUD, menu, search | primary control surface | raised secondary control surface | one shared radius and shadow vocabulary |

The active Obsidian theme owns every shared surface and elevation. Linked
Canvas owns only local graph-role derivations and component geometry; semantic
Markdown rendered inside each card remains theme-native.

## Component boundaries

- `.context-tree-viewport` owns the canvas surface and grid.
- `.context-tree-card` owns the document boundary. Reading and Source are modes
  of this component, not nested card components.
- `.context-tree-card-quick-actions` and `.context-tree-card-menu` own card
  commands. Their children do not add independent chrome.
- `.context-tree-graph-controls` and `.context-tree-search-panel` form one HUD
  family. Every toolbar action is icon-only; its Korean or English action name
  remains available through `aria-label` and the native tooltip.
- Default topic cards omit the repeated role label. Root, question, and entity
  roles remain as quiet text cues, while generated section headings, lists, and
  HTML comments never become compact-card summaries.
- edge and connection-port components consume relation and interaction state
  tokens; they do not define local colours.

If a new component needs a value, add a semantic token first, explain its role
here when it creates a new category, then consume it from the component.
Duplicate local constants are not accepted.

Generated JSON Canvas cards use the same rule at the protocol boundary:
`src/domain/generated-canvas-design.ts` is the single source for standard
Canvas role hints, default dimensions, and initial placement rhythm.
`json-canvas.ts` consumes that contract and never carries visual constants.
A blank board has no generated cards and a current-note shortcut has only that
one file card. When explicit link-aware expansion adds missing Markdown or
media, generated root/question/entity cards may use restrained native JSON
Canvas colours; ordinary topic and media cards retain the host default.
Manually placed cards keep their authored geometry and colour. Native Canvas
drag, resize, group, and colour controls remain the long-term layout authority.

## Visual release gate

Every release is checked in:

1. Obsidian default light;
2. Obsidian default dark; and
3. the maintainer's installed theme, including Cupertino when it is the active
   release target.

Verify the canvas/compact/open surface order, readable edges and dot grid,
native Markdown hierarchy, stable card geometry, visible keyboard focus,
hover controls at overview zoom, and reduced-motion behaviour. Refresh the
README captures only from that verified runtime.
