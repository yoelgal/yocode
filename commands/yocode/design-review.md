---
name: design-review
description: |
  Visual audit of implemented UI. Finds inconsistency, spacing issues,
  hierarchy problems, and AI slop patterns. Fixes iteratively.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
---

# /yocode:design-review

Designer's eye QA — finds visual issues and fixes them iteratively.

## Audit Checklist (10 Categories)

### 1. Typography
- [ ] Heading hierarchy is consistent (H1 > H2 > H3)
- [ ] Body text is readable (size, line-height, contrast)
- [ ] Font weights used intentionally (not random bold)
- [ ] No orphaned headings or widows

### 2. Spacing
- [ ] Consistent spacing scale (not arbitrary pixel values)
- [ ] Adequate white space around content blocks
- [ ] Padding consistent within component types
- [ ] Margin consistency between sections

### 3. Color
- [ ] Palette used consistently (no one-off colors)
- [ ] Sufficient contrast ratios (WCAG AA)
- [ ] Semantic colors used correctly (red=error, green=success)
- [ ] Hover/active/focus states have visible color changes

### 4. Layout
- [ ] Grid alignment — elements snap to grid
- [ ] Responsive behavior at all breakpoints
- [ ] No horizontal overflow
- [ ] Content doesn't collide at any viewport

### 5. Hierarchy
- [ ] Visual hierarchy guides the eye correctly
- [ ] Primary CTA is clearly the most prominent element
- [ ] Information architecture matches importance
- [ ] Scannable — can grasp the page in 3 seconds

### 6. Consistency
- [ ] Same component looks the same everywhere
- [ ] Icon style is unified (not mixing filled/outlined)
- [ ] Border radii consistent
- [ ] Shadow levels consistent

### 7. AI Slop Detection
- [ ] No "hero gradient" that doesn't match the brand
- [ ] No over-designed empty states
- [ ] No unnecessary animations
- [ ] No generic stock-photo aesthetics
- [ ] Components feel hand-crafted, not template-generated

### 8. Interaction
- [ ] Clickable elements look clickable
- [ ] Loading states exist for async operations
- [ ] Error states are designed, not default browser
- [ ] Transitions feel natural (not jarring or too slow)

### 9. Content
- [ ] Text is real, not placeholder
- [ ] Truncation handled gracefully (ellipsis, expand)
- [ ] Empty states are designed
- [ ] Edge cases (long names, no data) handled

### 10. Polish
- [ ] Favicon and meta images set
- [ ] Focus rings visible for keyboard navigation
- [ ] No stray console errors
- [ ] Print stylesheet (if applicable)

## Fix Loop

For each issue found:
1. Screenshot / describe the issue
2. Locate the source code
3. Fix the root cause
4. Commit atomically
5. Re-verify

Continue until health score reaches target.
