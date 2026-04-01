---
name: design
description: Design quality axiom — anti-slop patterns, typography rules, and visual standards
scope: axiom
---

# Design Axioms

These rules apply whenever generating, reviewing, or modifying UI. They are the
difference between "looks like AI made it" and "looks like a designer made it."

## The AI Slop Blacklist

These patterns instantly mark a design as AI-generated. Never use them:

1. **Purple/violet/indigo gradient backgrounds** — THE most recognizable AI default
2. **3-column feature grid** — icon in colored circle + bold title + 2-line description, repeated 3x
3. **Icons in colored circles** as section decoration
4. **Centered everything** — `text-align: center` on all headings and body text
5. **Uniform bubbly border-radius** on every element (same radius everywhere)
6. **Decorative blobs, floating circles, wavy SVG dividers** — meaningless decoration
7. **Emoji as design elements** (rockets in headings, sparkles in CTAs)
8. **Colored left-border on cards** (`border-left: 3px solid`)
9. **Generic hero copy** — "Welcome to X", "Unlock the power of", "All-in-one solution"
10. **Cookie-cutter section rhythm** — hero → 3 features → testimonials → pricing → CTA, all same height

## Typography Rules

- **Maximum 2 typefaces** — one for headings, one for body. Three is the hard limit.
- **No default font stacks** — Inter, Roboto, Arial, system-ui are invisible. Choose a font with character.
- **Scale ratios matter** — use 1.25 (major third) or 1.333 (perfect fourth), not arbitrary sizes
- **Line height: 1.5-1.7 for body, 1.1-1.3 for headings** — tight headings, airy body
- **Measure: 45-75 characters per line** — wider is unreadable, narrower is choppy
- **No letterspacing on lowercase text** — only on uppercase/small-caps
- **Minimum 16px body text** — 14px is too small for sustained reading
- **Font weight contrast** — headings should be noticeably heavier, not just bigger

**Good font pairings for 2026:**
- Display: Satoshi, General Sans, Fraunces, Instrument Serif, Cabinet Grotesk
- Body: Instrument Sans, DM Sans, Geist, Plus Jakarta Sans, Manrope

## Color Rules

- **Maximum 12 non-gray colors** in the full palette (including semantic)
- **One dominant color** with sharp accents — not a rainbow
- **WCAG AA minimum** — 4.5:1 contrast for body text, 3:1 for large text and UI elements
- **Never use color as the only differentiator** — always pair with icon, shape, or text
- **Semantic colors are consistent** — red = error, green = success, amber = warning everywhere
- **Dark mode: desaturate accents 10-15%** — vivid colors on dark backgrounds strain eyes
- **Off-white text in dark mode: ~#E0E0E0** — pure white (#FFF) is too harsh

## Layout Rules

- **Grid-based** — 12-column or auto-fit, with consistent gutters
- **Spacing scale** — 4px or 8px base. Never arbitrary pixel values.
- **Border-radius hierarchy** — inner radius = outer radius - gap. Not uniform everywhere.
- **Max content width** — 1200-1440px for content, full-bleed for backgrounds
- **White space is intentional** — related elements close, sections distant
- **No horizontal scroll** on any viewport

## Interaction Rules

- **Every clickable element looks clickable** — cursor:pointer, hover state, visual affordance
- **Loading states exist** — skeleton screens over spinners where possible
- **Empty states are designed** — message + action + visual, not just "No items found"
- **Error messages are specific** — "Email already registered" not "An error occurred"
- **Touch targets: 44px minimum** on mobile
- **Focus rings visible** — never `outline: none` without a replacement

## Motion Rules

- **Ease-out for entering elements** — fast start, gentle stop
- **Ease-in for exiting elements** — gentle start, fast finish
- **Duration: 150-300ms for micro-interactions, 300-500ms for transitions**
- **One orchestrated animation** beats ten scattered ones
- **Respect prefers-reduced-motion** — always
- **Never animate with `transition: all`** — only animate transform and opacity

## The Intentionality Test

For every design decision, ask: "Is this intentional, or is it the default?"

If it's the default, change it. Defaults are how AI slop happens. Every element should
earn its pixels through deliberate choice, not through being the first thing the model
generated.

Good design feels inevitable. AI slop feels accidental. The difference is intentionality.
