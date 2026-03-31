---
name: design
description: |
  Design consultation: research landscape, propose design system,
  generate previews, write DESIGN.md. Use when starting UI work
  or asked about design direction.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# /yocode:design

Complete design system creation — from research to implementation spec.

## Step 1: Understand the Product

- What is this product?
- Who is the target user?
- What's the emotional register? (Professional? Playful? Minimal? Bold?)
- Any existing brand assets or constraints?

## Step 2: Research Landscape

Spawn a researcher agent to:
- Analyze 5-10 competitors/comparable products
- Identify design patterns in the space
- Note what works and what feels generic

## Step 3: Propose Design System

### Aesthetic Direction
Choose and justify: Minimal | Editorial | Brutalist | Soft | Corporate | Playful

### Typography
- Primary font (headings): [font] — why
- Secondary font (body): [font] — why
- Scale: [system] (e.g., 1.25 ratio, or custom)
- Line heights and letter spacing

### Color Palette
- Primary: [hex] — meaning and usage
- Secondary: [hex] — meaning and usage
- Accent: [hex] — for CTAs and emphasis
- Neutrals: [scale from 50-950]
- Semantic: success/warning/error/info
- Dark mode variants (if applicable)

### Layout
- Grid system: [12-col, max-width, gutters]
- Spacing scale: [4px base, or custom]
- Border radii: [consistent scale]
- Elevation/shadows: [levels]

### Motion
- Transition defaults (duration, easing)
- Micro-interactions philosophy
- Loading/skeleton patterns

### Components
- Button variants and states
- Input/form patterns
- Card patterns
- Navigation patterns
- Modal/dialog patterns

## Step 4: Generate Preview

If the browse daemon is available, generate preview pages showing:
- Typography scale
- Color palette swatches
- Component examples
- Layout demonstrations

## Step 5: Write DESIGN.md

Create `DESIGN.md` in project root documenting all decisions:

```markdown
# Design System

## Aesthetic: [direction]
[Rationale]

## Typography
[Full spec]

## Colors
[Full palette with hex codes]

## Layout
[Grid, spacing, radii]

## Components
[Key component patterns]
```

This becomes the source of truth for all UI implementation.
