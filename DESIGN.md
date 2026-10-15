---
name: Taskoral
description: Graphite frame, light work planes, one electric lime signal.
colors:
  canvas: "#e9e9e5"
  paper: "#ffffff"
  paper-subtle: "#f5f5f1"
  paper-raised: "#ebebe5"
  graphite: "#202320"
  ink: "#20221f"
  muted-ink: "#5d625c"
  line: "#dcded6"
  signal-lime: "#e9ff43"
  signal-ink: "#22251d"
  dark-canvas: "#171a17"
  dark-paper: "#272b27"
  dark-paper-subtle: "#202420"
  dark-ink: "#f6f8ee"
  dark-muted-ink: "#b9c2b1"
  dark-line: "#4c5448"
typography:
  headline:
    fontFamily: "Segoe UI Variable, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(22px, 2.3vw, 32px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Segoe UI Variable, Segoe UI, Arial, sans-serif"
    fontSize: "15px"
    lineHeight: 1.48
  map-title:
    fontFamily: "Segoe UI Variable, Segoe UI, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 750
    lineHeight: 1.3
  label:
    fontFamily: "Segoe UI Variable, Segoe UI, Arial, sans-serif"
    fontSize: "12px"
rounded:
  shell: "26px"
  map: "28px"
  card: "18px"
  compact: "12px"
  pill: "999px"
spacing:
  map-gutter: "22px"
  map-header-inline: "25px"
  map-plane-inline: "36px"
  map-column-gap: "44px"
  map-card-padding: "15px"
components:
  view-tab-active:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.pill}"
  view-tab-rest:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  button-primary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.pill}"
  map-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.map-card-padding}"
  map-context-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.map-card-padding}"
---

# Design System: Taskoral

## Overview

**Creative North Star: "The Connected Work Plane"**

Taskoral places dense work on calm paper surfaces inside a graphite frame. Electric lime is a precise signal for selection, primary action, and a few points of attention. The interface stays compact enough for a working board while preserving hierarchy. Text and its surface must maintain at least 4.5:1 contrast (3:1 for large text) in both themes and on hover.

The personal task map extends this language into a scrollable time plane: cards sit near dates, relationships remain visible, and details open beside their parent. The same visual roles apply in light and dark themes.

**Key Characteristics:**

- Graphite navigation and switchers frame light work surfaces.
- One bright lime signal identifies active states and key actions.
- Compact cards and explicit connection lines keep relationships legible.
- Motion reveals structure without withholding content.

## Colors

The palette uses one high-energy accent against restrained warm neutrals.

### Primary

- **Signal Lime** (`colors.signal-lime`): selected view capsules, primary actions, map date counts, and key attention points. Pair it with Signal Ink for text.

### Neutral

- **Graphite Frame** (`colors.graphite`): sidebar, view switcher, and map footer.
- **Work Canvas** (`colors.canvas`): the outer workspace.
- **Paper** (`colors.paper`): primary reading and editing surfaces.
- **Quiet Paper** (`colors.paper-subtle`): board columns and map plane.
- **Raised Paper** (`colors.paper-raised`): subdued controls and contextual cards.
- **Ink, Muted Ink, and Line** (`colors.ink`, `colors.muted-ink`, `colors.line`): hierarchy, supporting text, and separation.
- **Dark counterparts** (`colors.dark-*`): preserve hierarchy in dark mode while Signal Lime stays constant.

**The One Signal Rule.** Lime marks selection and action; it does not fill ordinary content surfaces.

## Typography

**Display Font:** Segoe UI Variable, with Segoe UI and Arial fallbacks.
**Body Font:** The same system stack.

**Character:** Direct and utilitarian, with tight headline spacing and compact labels suited to work screens.

### Hierarchy

- **Headline** (`typography.headline`): section and map headings.
- **Map title** (`typography.map-title`): the primary task name inside a compact card.
- **Body** (`typography.body`): general workspace content.
- **Label** (`typography.label`): controls and supporting metadata.

## Layout

The shell keeps navigation visible. On desktop, the sidebar can collapse to a 74px icon rail; at 960px and below the mobile navigation treatment takes over. Main work areas use compact panels rather than wide empty margins.

The personal map is a horizontally scrollable time plane with 272px date buckets and 44px gaps on desktop. At 600px and below, buckets narrow to 240px and gaps to 30px. Empty periods are labeled as gaps; unscheduled tasks live in a separate area. The map scrolls on phones rather than shrinking its graph into unreadable columns.

## Elevation & Depth

Tonal surfaces and borders carry most hierarchy. The shell, panels, and popovers have progressively stronger ambient shadows; map cards lift on hover and selected cards gain an accent-tinted edge and shadow. Dark mode keeps the same depth hierarchy with darker surfaces.

**The Content First Rule.** Essential content is visible before entrance animation, so loading or reduced motion never creates an empty work plane.

## Shapes

The outer shell and map use broad rounded corners (`rounded.shell`, `rounded.map`). Cards step down to `rounded.card`; compact controls use `rounded.compact`. Active switcher tabs and key actions use full capsules (`rounded.pill`). Borders remain thin and quiet, except the map's strong graphite outer frame and date rules.

## Components

### Navigation and view switcher

Graphite hosts subdued labels; the active destination or view is a distinct lime capsule. The sidebar can become an icon rail, while mobile retains access to navigation and view controls. States use shape and text as well as color.

### Primary button

Lime fill with dark text communicates the main action. Hover lightens the lime; keyboard focus remains visible. Interactive targets in the map are at least 44px high.

### Cards and task map

White cards sit on Quiet Paper with a thin line and soft shadow. Hover lifts the card; selection strengthens its border. A related task owned by someone else uses a muted, dashed card and a visible “Не моя” label. Confirmed dependencies are solid lines; proposals are dashed. Details and child tasks unfold beside the parent node.

### Fields

Map fields use a light surface, fine border, compact radius, and visible keyboard focus. Controls retain readable ink colors in both themes.

### Motion

Map cards enter in 430ms, branches reveal in 420–470ms, and connection lines draw in 700ms with a decelerating curve. Card hover and selection use 260ms transitions. Under `prefers-reduced-motion`, entrance animation stops, transitions contract to 80ms, and smooth scrolling becomes immediate.

## Do's and Don'ts

### Do:

- **Do** keep Taskora data and primary actions immediately legible on the work plane.
- **Do** pair lime with dark text and retain a visible focus state.
- **Do** use text and line style to distinguish selected, proposed, and contextual states.
- **Do** let the map scroll at phone widths and preserve date meaning across scales.

### Don't:

- **Don't** spread lime across ordinary card backgrounds.
- **Don't** hide content until animation completes.
- **Don't** encode ownership or dependency status through color alone.
