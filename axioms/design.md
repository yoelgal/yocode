---
name: design
description: Design quality axiom — anti-slop patterns, OKLCH color, typography, spatial composition, and visual standards
scope: axiom
---

# Design Axioms

These rules apply whenever generating, reviewing, or modifying UI. They are the
difference between "looks like AI made it" and "looks like a designer made it."

Incorporates patterns from Anthropic's frontend-design skill and Impeccable by
Paul Bakaus — the two most battle-tested design quality frameworks for AI coding.

## Before Writing Any UI Code: Four Dimensions

Commit to these before touching a single pixel:

1. **Purpose** — What problem does this solve? Who uses it?
2. **Tone** — Choose an extreme: brutalist, maximalist, luxury, playful, retro-futuristic,
   art deco, organic, industrial, editorial, soft/pastel, or refined minimalism.
   "Clean and modern" is not a tone. It's the absence of one.
3. **Constraints** — Framework, performance budget, accessibility level, browser support
4. **Differentiation** — One unforgettable element. What makes someone remember this?

Bold maximalism and refined minimalism both work. The enemy is the mushy middle
where nothing is intentional and everything looks like every other AI-generated page.

## The AI Slop Blacklist

These patterns instantly mark a design as AI-generated. Never use them:

**Layout slop:**
1. **3-column feature grid** — icon in colored circle + bold title + 2-line description, repeated 3x. THE most recognizable AI layout.
2. **Cookie-cutter section rhythm** — hero → 3 features → testimonials → pricing → CTA, all same height
3. **Centered everything** — `text-align: center` on all headings and body text
4. **Cards wrapping everything** — cards should be the interaction, not decoration around content
5. **Nested cards** — cards inside cards flatten hierarchy and confuse structure
6. **Hero metric template** — big number + small label + gradient accent, repeated in a row

**Color slop:**
7. **Purple/violet/indigo gradient backgrounds** — THE most recognizable AI color default
8. **Cyan-on-dark, purple-to-blue gradients, neon accents** — the AI palette cliche
9. **Gradient text** — accessibility nightmare AND signals AI generation
10. **Dark mode with glowing accents** — lazy, no genuine design thinking

**Decoration slop:**
11. **Decorative blobs, floating circles, wavy SVG dividers** — meaningless decoration
12. **Icons in colored circles** as section decoration
13. **Emoji as design elements** (rockets in headings, sparkles in CTAs)
14. **Colored left-border on cards** (`border-left: 3px solid`)
15. **Glassmorphism without purpose** — blur effects used decoratively, not functionally
16. **Decorative sparklines** — meaningless tiny charts that show nothing real

**Content slop:**
17. **Generic hero copy** — "Welcome to X", "Unlock the power of", "All-in-one solution", "Seamless experience"
18. **Uniform bubbly border-radius** on every element (same radius everywhere)
19. **All primary buttons** — destroys hierarchy. One primary per view.
20. **Information repetition** — redundant headers restating what the section already shows

## Typography Rules

- **Maximum 2 typefaces** — one for headings, one for body. Three is the hard limit.
- **No default/overused font stacks** — Inter, Roboto, Arial, Open Sans, system-ui are invisible. Choose a font with character.
- **Monospace is not a design shorthand** — don't use it to look "technical"
- **Scale ratios matter** — use 1.25 (major third) or 1.333 (perfect fourth), not arbitrary sizes
- **Line height: 1.5-1.7 for body, 1.1-1.3 for headings** — tight headings, airy body
- **Measure: 45-75 characters per line** — wider is unreadable, narrower is choppy
- **No letterspacing on lowercase text** — only on uppercase/small-caps
- **Minimum 16px body text** — 14px is too small for sustained reading
- **Font weight contrast** — headings should be noticeably heavier, not just bigger
- **Large rounded icons above headings = templated** — find another way

**Good font pairings for 2026:**
- Display: Satoshi, General Sans, Fraunces, Instrument Serif, Cabinet Grotesk
- Body: Instrument Sans, DM Sans, Geist, Plus Jakarta Sans, Manrope

## Color Rules (OKLCH-First)

Use OKLCH for perceptually uniform palettes. It produces colors that actually look
evenly spaced to the human eye, unlike HSL which lies about brightness.

**OKLCH basics:**
```css
/* oklch(Lightness Chroma Hue) */
--color-primary: oklch(55% 0.25 250);    /* vibrant blue */
--color-primary-light: oklch(75% 0.15 250);
--color-primary-dark: oklch(35% 0.20 250);

/* Tinted neutrals — NEVER use pure gray */
--color-neutral-50: oklch(97% 0.01 250);  /* warm tint from primary hue */
--color-neutral-900: oklch(15% 0.01 250);

/* Semantic via color-mix */
--color-error: oklch(55% 0.25 25);
--color-success: oklch(55% 0.20 145);
--color-warning: oklch(70% 0.20 85);

/* Dark mode via light-dark() */
--color-surface: light-dark(oklch(98% 0.01 250), oklch(15% 0.01 250));
--color-text: light-dark(oklch(15% 0.01 250), oklch(90% 0 0));
```

**Rules:**
- **Tint every neutral** — never pure #000, #FFF, or #808080. Add a hint of your primary hue.
- **Maximum 12 non-gray colors** in the full palette
- **One dominant color** with sharp accents — not a rainbow
- **WCAG AA minimum** — 4.5:1 contrast for body text, 3:1 for large text and UI elements
- **Never use color as the only differentiator** — always pair with icon, shape, or text
- **Semantic colors are consistent** — red = error, green = success, amber = warning everywhere
- **Dark mode: desaturate accents 10-15%** — use `oklch(L, C * 0.85, H)` for accent adjustment
- **Off-white text in dark mode: oklch(90% 0 0)** — pure white is too harsh
- **Use `color-mix()` for hover/active variants** — not manually picked darker shades
- **Gray text on colored backgrounds is washed out** — use proper contrast

## Spatial Composition Rules

- **Asymmetry over centering** — left-aligned, broken grids feel more intentional than centered everything
- **Diagonal flow, overlap, grid-breaking** — at least one element should surprise spatially
- **Commit to sparse OR dense** — generous negative space or controlled information density. Not both. Not neither.
- **Grid-based** — 12-column or auto-fit, with consistent gutters
- **Spacing scale** — 4px or 8px base. Never arbitrary pixel values.
- **Spacing has rhythm** — related elements close, sections distant. Uniform spacing = flat hierarchy.
- **Border-radius hierarchy** — inner radius = outer radius - gap. Not uniform everywhere.
- **Max content width** — 1200-1440px for content, full-bleed for backgrounds
- **No horizontal scroll** on any viewport

## Interaction Rules

- **Every clickable element looks clickable** — cursor:pointer, hover state, visual affordance
- **Loading states exist** — skeleton screens over spinners where possible
- **Empty states are designed features** — warmth + primary action + context, not "No items found"
- **Error messages are specific and recoverable** — "Email already registered. Sign in instead?" not "An error occurred"
- **Touch targets: 44px minimum** on mobile
- **Focus rings visible and colored** — never `outline: none` without a semantic replacement
- **Form labels above inputs** — not placeholder-as-label
- **Validation timing: on blur, not on keystroke** — let people finish typing
- **One primary action per view** — multiple primary buttons destroys hierarchy
- **Modals are a last resort** — inline expansion or side panels first

## Motion Rules

- **Ease-out for entering elements** — fast start, gentle stop (`cubic-bezier(0, 0, 0.2, 1)`)
- **Ease-in for exiting elements** — gentle start, fast finish (`cubic-bezier(0.4, 0, 1, 1)`)
- **Duration: 150-300ms for micro-interactions, 300-500ms for transitions**
- **One orchestrated page load** with staggered reveals beats ten scattered animations
- **Scroll-triggered effects** used purposefully, not on every section
- **Respect `prefers-reduced-motion`** — always. No exceptions.
- **Never animate with `transition: all`** — only animate transform and opacity
- **No bounce/elastic easing** — dated aesthetic from 2015
- **Never animate layout properties** (width, height, padding) — causes reflow, kills performance

## Responsive Rules

- **Mobile-first** — design for 375px, then enhance for wider
- **Not "stacked on mobile"** — each viewport gets intentional layout decisions
- **Fluid typography** — `clamp()` for font sizes that scale smoothly
- **Container queries** where supported — components adapt to their container, not the viewport
- **Images: srcset + sizes** — serve appropriate resolution, use `aspect-ratio` for CLS prevention
- **Don't hide features on mobile** — adapt them. Hiding = you don't need them anywhere.

## The Intentionality Test

For every design decision, ask: "Is this intentional, or is it the default?"

If it's the default, change it. Defaults are how AI slop happens. Every element should
earn its pixels through deliberate choice, not through being the first thing the model
generated.

Good design feels inevitable. AI slop feels accidental. The difference is intentionality
at every level: the font, the color, the spacing, the layout, the motion, the copy.
