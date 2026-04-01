---
name: design-html
description: |
  Convert an approved design direction into production-quality HTML/CSS
  or framework components. Real text reflow, computed heights, dynamic
  layouts. Use after /design or /design-shotgun approves a direction.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /yocode:design-html

Turn an approved design into production-quality code. Not a rough prototype —
real reflow, real responsiveness, real dark mode.

## When to Use

- After `/yocode:design` creates DESIGN.md
- After `/yocode:design-shotgun` approves a variant
- When you have a screenshot/mockup and want pixel-faithful code
- When converting a Figma/AI mockup to production

## Process

### Step 1: Load Design Context

```bash
cat DESIGN.md 2>/dev/null || echo "No DESIGN.md — run /yocode:design first"
ls .yocode/designs/ 2>/dev/null
```

Determine the target:
- **Vanilla HTML/CSS** — self-contained, zero dependencies
- **React/Next.js** — JSX components with CSS modules or Tailwind
- **Svelte** — .svelte components
- **Vue** — .vue SFCs

### Step 2: Design Token Extraction

From DESIGN.md, extract and define as CSS custom properties:

```css
:root {
  /* Typography */
  --font-display: 'Instrument Serif', serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'Geist Mono', monospace;

  /* Scale (1.25 ratio) */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-4xl: 3.052rem;

  /* Colors */
  --color-primary: #...;
  --color-secondary: #...;
  --color-accent: #...;
  --color-surface: #...;
  --color-text: #...;
  --color-text-muted: #...;

  /* Spacing (8px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #...;
    --color-text: #E0E0E0;
    /* Desaturate accents 10-15% */
  }
}
```

### Step 3: Build

**Page structure first, decoration last.**

1. Semantic HTML structure (header, main, section, footer, nav)
2. Layout (grid/flexbox, responsive breakpoints)
3. Typography (scale, weight, line-height)
4. Color application (surfaces, text, accents)
5. Spacing (margins, padding from scale)
6. Interaction states (hover, focus, active, disabled)
7. Motion (entrance animations, transitions)
8. Dark mode variant
9. Responsive adjustments (375px → 768px → 1024px → 1440px)

**Anti-slop checks during build:**
- [ ] No blacklisted patterns (check design axiom)
- [ ] Font loaded from Google Fonts or self-hosted, not system default
- [ ] Colors from DESIGN.md tokens, not ad-hoc hex values
- [ ] Spacing from scale, not arbitrary pixels
- [ ] Border-radius varies by context (inner = outer - gap)
- [ ] At least one element breaks the grid (asymmetry > perfect symmetry)

### Step 4: Responsive Verification

Test at 4 breakpoints:
```bash
# If browse daemon available:
$B goto file://$(pwd)/output.html
$B responsive 375 768 1024 1440
```

For each breakpoint verify:
- Text readable without zooming
- Touch targets 44px+ on mobile
- No horizontal overflow
- Layout intentionally adapts (not just stacks)
- Images responsive (not fixed width)

### Step 5: Accessibility Check

- [ ] Semantic HTML (headings in order, landmarks present)
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 body, 3:1 large)
- [ ] Focus management (visible focus rings, logical tab order)
- [ ] `prefers-reduced-motion` respected
- [ ] `color-scheme` meta tag present

### Step 6: Iteration Loop

Present the result. Offer refinement:
```
Here's the implementation. Review it and tell me:
  1. What looks right
  2. What needs adjustment
  3. What's missing

I'll iterate up to 10 times until it matches your vision.
```

Each iteration: make the change, verify it didn't break something else,
present the delta.

### Step 7: Component Extraction (if framework target)

If the target is React/Svelte/Vue, extract reusable components:
- Button variants (primary, secondary, ghost, destructive)
- Input/form components
- Card component (if cards earned their existence)
- Layout components (Container, Section, Stack)
- Navigation components

Each component uses the CSS custom properties from Step 2.

### Step 8: Output

```
Deliverables:
  - output.html (or component files)
  - design-tokens.css (custom properties)
  - DESIGN.md (updated if tokens were refined during implementation)
```
