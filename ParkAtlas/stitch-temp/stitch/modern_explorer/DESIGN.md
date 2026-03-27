# Design System Document: Modern Explorer

## 1. Overview & Creative North Star: "The Field Journal"
This design system moves away from the sterile, plastic-feel of standard mobile apps and toward the tactile, intentional experience of a high-end field journal. We are defining a **Modern Explorer** aesthetic: a synthesis of rugged reliability and editorial sophistication.

**The Creative North Star: The Digital Curator.**
The UI should feel like a curated exhibit of the natural world. We break the "template" look by using intentional asymmetry—such as offset headers and overlapping image cards—that mimics how a physical map might be laid out on a wooden table. We favor breathing room over density, using high-contrast typography scales to establish an authoritative yet inviting hierarchy.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the organic. We use deep forest tones for authority and clay-like terracotta for human-driven actions.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited.** To create a premium, seamless feel, boundaries between sections must be defined exclusively through background shifts. For example, a `surface-container-low` section should sit directly against a `surface` background. This forces the eye to recognize shapes rather than lines, creating a more sophisticated, "expensive" interface.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of heavy-weight paper.
*   **Surface (`#fbf9f4`):** The base canvas.
*   **Surface-Container-Low (`#f5f3ee`):** Used for large secondary content areas.
*   **Surface-Container-Highest (`#e4e2dd`):** Used for elevated cards or interactive modules.
*   **The "Glass & Gradient" Rule:** For floating navigation or weather overlays, use Glassmorphism. Apply `surface` colors at 80% opacity with a `20px` backdrop-blur to allow the rich nature photography to bleed through the interface.

### Signature Textures
Main CTAs and hero backgrounds should utilize a subtle linear gradient (from `primary` to `primary_container`) at a 145-degree angle. This adds a "visual soul" and depth that prevents the green from looking flat or "corporate."

---

## 3. Typography
We use a high-contrast pairing to balance ruggedness with readability.

*   **Display & Headlines (Epilogue):** Sturdy, bold, and geometric. Use `display-lg` (3.5rem) for park names and `headline-md` (1.75rem) for section titles. The wide stance of Epilogue suggests the permanence of a stone carving.
*   **Body & Labels (Work Sans):** Clean and highly legible. Use `body-lg` (1rem) for trail descriptions. The slightly optimized tracking of Work Sans ensures readability even when the explorer is on the move in bright sunlight.
*   **Editorial Spacing:** Always provide generous bottom margins (`spacing-8`) after headlines to let the typography "own" the space.

---

## 4. Elevation & Depth
We reject the "drop shadow" defaults of the early 2010s. Depth in this system is organic.

*   **The Layering Principle:** Achieve lift by stacking. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f5f3ee) background. The 2-point delta in brightness creates a soft, natural lift.
*   **Ambient Shadows:** If a card must float (e.g., a "Current Location" FAB), use a shadow with a `24px` blur and `4%` opacity. The shadow color must be a tinted version of `on-surface` (#1b1c19), never pure black.
*   **The Ghost Border Fallback:** If a border is required for accessibility, use the `outline-variant` token at **20% opacity**. 100% opaque borders are considered a design failure in this system.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background with `on-primary` text. Use `rounded-md` (0.75rem). Apply a subtle inner-glow on hover.
*   **Secondary:** `secondary` background (Terracotta). Reserved for high-priority "Explorer" actions like "Start Trail" or "Check In."
*   **Tertiary:** No background. Use `primary` text with an icon.

### Cards & Lists
*   **The Divider Ban:** Vertical white space (using `spacing-6` or `spacing-8`) must replace divider lines. 
*   **Photography Integration:** Cards should feature "Full Bleed" headers. Use high-quality nature photography that interacts with the typography (e.g., text overlapping a mountain peak via a `surface-variant` semi-transparent scrim).

### Inputs & Selection
*   **Input Fields:** Use `surface-container-high` as the fill. No bottom line; use a soft `rounded-sm` corner.
*   **Chips:** Use `tertiary_fixed` (#ffdf96) for "Sun Gold" accent chips (e.g., "Easy Trail," "Family Friendly"). These should feel like small badges of honor.

### Contextual Components
*   **The Elevation Map:** A custom component using a `primary` stroke on a `surface-container-lowest` background to track trail incline.
*   **The Compass FAB:** A floating action button using Glassmorphism and the `secondary` color for the needle.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A photo can be right-aligned while the headline is left-aligned with a 10% overlap.
*   **Do** prioritize the "Paper-like" feel. Use the off-white `background` (#fbf9f4) to reduce eye strain during outdoor use.
*   **Do** use "Sun Gold" and "Sky Blue" sparingly as functional accents (e.g., weather alerts or gold-star trail ratings).

### Don’t:
*   **Don’t** use 1px solid black or grey lines. They break the organic flow of the "Field Journal."
*   **Don’t** use sharp 0px corners. The world isn't made of perfect right angles; use the `roundedness-scale` to soften the UI.
*   **Don’t** crowd the interface. If a screen feels full, increase the `spacing` tokens and move secondary info to a "Read More" layer.