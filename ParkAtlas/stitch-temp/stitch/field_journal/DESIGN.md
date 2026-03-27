# Design System Document: The Curated Expedition

## 1. Overview & Creative North Star

### The Creative North Star: "The Modern Naturalist"
This design system moves away from the sterile, plastic feel of typical utility apps to embrace the tactile, intentional spirit of a high-end field journal. It is designed to feel like a premium digital logbook—a mix of rugged durability and editorial sophistication. 

We break the "template" look through **Intentional Asymmetry** and **Tonal Depth**. By leaning into the weight of the Epilogue typeface and the organic palette of the forest, we create an environment that feels authoritative yet adventurous. The layout should feel like a curated spread in a travel periodical, where white space (in this case, "Paper Space") is as functional as the content itself.

---

## 2. Colors

The color strategy is rooted in the deep, coniferous greens of the wilderness, balanced by a warm, paper-inspired neutral base.

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts. For example, a map preview or a gallery section should be defined by a shift from `surface` (#fcf9f2) to `surface-container-low` (#f6f3ec) rather than a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine cardstock.
- **Base Layer:** `surface` (#fcf9f2) for the primary background.
- **Secondary Tier:** `surface-container-low` (#f6f3ec) for large content blocks.
- **Interactive Tier:** `surface-container-highest` (#e5e2db) for elevated elements like cards or navigation bars.
*Note: Each inner container should use a slightly higher or lower tier to define its importance relative to its parent.*

### The "Glass & Gradient" Rule
Floating elements (such as "Locate Me" buttons or active trail stats) should utilize **Glassmorphism**. Use a semi-transparent `surface` color with a `backdrop-filter: blur(12px)`. To provide visual "soul," use subtle linear gradients for main CTAs, transitioning from `primary` (#154212) to `primary-container` (#2d5a27). This mimics the depth found in natural foliage.

---

## 3. Typography

The typographic voice is a dialogue between the rugged, geometric character of **Epilogue** and the clean, functional clarity of **Work Sans**.

- **Display & Headlines (Epilogue):** These are the "Title Pages" of the experience. Use `display-lg` and `headline-lg` with tight letter-spacing to create a sense of authoritative permanence. 
- **Titles & Body (Work Sans):** Used for the "data" of the journal. Work Sans provides a technical, legible contrast to the expressive headlines.
- **Labels (Work Sans):** Small-caps or heavy weights should be used for metadata (e.g., "ELEVATION," "LATITUDE") to mimic the meticulous notes of a naturalist.

---

## 4. Elevation & Depth

We eschew traditional shadows in favor of **Tonal Layering** to maintain a modern, flat-but-tactile aesthetic.

- **The Layering Principle:** Achieve depth by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
- **Ambient Shadows:** When a floating effect is vital (e.g., a bottom sheet), shadows must be extra-diffused. 
    - **Blur:** 24px - 40px
    - **Opacity:** 4% - 6%
    - **Color:** Tinted with `on-surface` (#1c1c18) to mimic natural light, never pure black.
- **The "Ghost Border":** If a border is required for accessibility, use the `outline-variant` token at 15% opacity. High-contrast, 100% opaque borders are forbidden.

---

## 5. Components

### Buttons
- **Primary:** `primary` (#154212) background with `on-primary` text. Use a `DEFAULT` roundedness (0.25rem) for a rugged, stamped-ink feel.
- **Secondary:** `secondary-container` (#c8f17a) background. Use this for "Explore" or "Add to Log" actions.
- **Tertiary:** No background; `primary` text with an underline that only appears on hover/active states.

### Cards & Lists
- **Rule:** Forbid the use of divider lines. 
- **Separation:** Use `Spacing 6` (2rem) of vertical white space or a subtle background shift to `surface-variant`. 
- **Imagery:** Photos should have a subtle `sm` (0.125rem) or `md` (0.375rem) corner radius, keeping the look sharp and professional.

### Chips (The "Tagging" System)
- **Filter Chips:** Use `surface-container-high` with `label-md` typography. When selected, transition to `secondary` (#496800) with `on-secondary` text.

### Input Fields
- **Style:** Minimalist. Use a `surface-container-low` background with a bottom-only "Ghost Border." Labels should use `label-sm` and sit above the field, never as placeholder text, to ensure the "Journal" remains organized.

### Specialized Component: The Expedition Progress Bar
- Use a thick `primary-fixed` (#bcf0ae) track with a `primary` (#154212) indicator to track park visits or trail completion.

---

## 6. Do's and Don'ts

### Do
- **Do** use intentional asymmetry. Align text to the left but offset imagery to the right to create a dynamic, editorial rhythm.
- **Do** use the Spacing Scale rigorously. Use `Spacing 8` (2.75rem) to separate major content blocks to allow the design to "breathe."
- **Do** use the logo as a watermark or header mark, ensuring it has enough `surface` breathing room around it.

### Don't
- **Don't** use standard 1px borders. They break the "Field Journal" illusion and make the app feel like a generic template.
- **Don't** use pure black for text. Always use `on-surface` (#1c1c18) to maintain the soft, organic feel of the palette.
- **Don't** over-round corners. Stick to the `DEFAULT` (0.25rem) for most elements; high roundedness (`full`) is reserved only for floating action buttons or specific status pills.