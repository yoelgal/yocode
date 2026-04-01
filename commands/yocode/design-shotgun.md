---
name: design-shotgun
description: |
  Generate multiple design variants, compare them side-by-side, and iterate.
  Use when exploring visual directions or when you want options to choose from.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - WebSearch
---

# /yocode:design-shotgun

Generate N design variants, open a comparison view, collect structured feedback,
and iterate until you land on a direction.

## When to Use

- Starting a new project's visual identity
- Exploring redesign directions
- When "/yocode:design" gave you one direction but you want to see alternatives
- When a stakeholder says "show me options"

## Process

### Step 1: Context

Read existing design context:
- `DESIGN.md` (if exists — the current design system)
- Previous approved designs at `.yocode/designs/`
- The current UI (via browse daemon, if running)

Ask:
- What are we designing? (landing page, dashboard, component, etc.)
- How many variants? (default: 3, max: 6)
- Any constraints? (brand colors, existing framework, etc.)

### Step 2: Concept Generation (BEFORE creating anything)

Generate N **distinct creative directions** — not minor variations.

For each variant, define:
- **Name** — a 2-3 word creative label (e.g., "Brutalist Editorial", "Warm Minimal")
- **Aesthetic** — the visual mood and personality
- **Key differentiator** — what makes this variant different from the others
- **Typography** — specific font pairing
- **Color palette** — 3-5 key colors with hex codes
- **Layout approach** — how content is organized
- **Risk level** — Safe (category standard) / Medium (distinctive) / Bold (category-breaking)

Present the concepts before building anything:
```
Variant A: "Warm Minimal"
  Aesthetic: Clean with soft warmth, lots of white space
  Fonts: Instrument Serif + DM Sans
  Colors: Cream (#FDF8F0) + Charcoal (#2A2A2A) + Terracotta (#C66B3D)
  Layout: Asymmetric, editorial-inspired
  Risk: Medium

Variant B: "Dense Data"
  Aesthetic: Information-forward, dashboard energy
  Fonts: Geist Mono + Geist
  Colors: Near-black (#0A0A0A) + Electric blue (#3B82F6) + Zinc (#71717A)
  Layout: Grid-heavy, data-dense, minimal chrome
  Risk: Safe

Variant C: "Bold Brand"
  ...
```

### Step 3: Generate Variants

For each approved concept, generate a full-page HTML preview:

**Rules for each variant:**
- Self-contained HTML file with inline CSS (no external deps except Google Fonts)
- Real content, not lorem ipsum
- Responsive (mobile-first, looks good at 375px and 1440px)
- Apply the design axioms — no AI slop patterns
- Each variant must be visually DISTINCT (not the same layout with different colors)

Run the AI slop check on each variant before presenting:
- Does it use any blacklisted pattern? → Fix before showing
- Is it actually distinct from the others? → Revise if too similar
- Would you notice this was AI-generated? → If yes, iterate

### Step 4: Compare

Present all variants for comparison. For each, show:
- Screenshot (if browse daemon available)
- Design token summary (fonts, colors, spacing)
- Strengths
- Risks
- What it communicates about the product

Ask the user to rate or choose:
```
Which direction resonates?
  A) Pick one as-is → proceed to DESIGN.md
  B) Mix and match → "I like A's layout with B's colors"
  C) None → describe what's missing, regenerate
```

### Step 5: Remix (if B)

Compose a new variant from approved elements:
```json
{
  "layout": "A",
  "colors": "B",
  "typography": "A",
  "motion": "C"
}
```

Generate the remixed variant and present for approval.

### Step 6: Approve and Persist

Save the approved direction:
- Write/update `DESIGN.md` with the chosen design system
- Save variant artifacts to `.yocode/designs/`
- Save approval metadata: which variant, ratings, date, context

**Taste memory:** Future design-shotgun runs will load prior approved designs
and bias new generations toward the user's established preferences. The system
learns your taste over time.

### Step 7: Handoff

The approved variant can flow into:
- `/yocode:design-review` — audit the implementation against the approved direction
- Direct implementation — the HTML variant IS a working prototype
