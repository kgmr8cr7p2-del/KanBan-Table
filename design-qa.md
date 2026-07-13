# Design QA — Taskora follow-up polish

## Evidence

- User references: checklist, archive, assignee picker, profile cropper, and long-FIO profile card screenshots supplied in the task.
- Combined before/after review: `.codex-artifacts/taskora-followup/comparison-board.png`.
- Desktop evidence: `assignees-desktop.png`, `archive-desktop.png`, `profile-desktop.png`, and `crop-direct-desktop.png`.
- Mobile evidence at 390 × 844 px: `create-mobile.png`, `archive-mobile.png`, `profile-mobile.png`, and `crop-direct-mobile.png`.

## Checks

1. Removed all crop sliders. The image itself is draggable by mouse or touch; mouse wheel and compact minus/plus buttons change zoom. Existing saved avatars can be reopened with “Настроить кадр”.
2. Verified crop interaction in the authenticated app: zero `range` inputs, zoom changes from 100% to 115%, pointer drag changes the rendered screenshot, and the mobile page has no horizontal overflow.
3. Rebuilt assignee selection as a wide searchable list with avatars, full names, email context, right-aligned checks, selected count, and a clear action. Selecting three assignees does not crash.
4. Expanded the checklist panel to the full task-form width. Input and add action no longer squeeze into a narrow property column, including at 390 px.
5. Made the profile card name container-aware. “Лесин Виктор Валентинович” wraps without overlapping the title on desktop and mobile.
6. Removed archive table minimum width and internal scrolling. At narrower widths archive rows become labelled cards; archived tasks still open in the detail dialog.
7. Verified TypeScript and whitespace checks after the final component changes.

## Findings

- No P1 or P2 visual, responsive, interaction, or overflow defects remain in the requested states.
- Desktop cropper is 607 px wide with a 238 px direct-manipulation canvas; mobile cropper is 306 px wide inside a 390 px viewport.
- The authenticated desktop and mobile profile checks reported no FIO/title overlap and no page-level horizontal overflow.
- The archive detail action remains available on both desktop and mobile layouts.

## Final result

passed
