---
name: Industrial Transmission Logic
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#434652'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#737783'
  outline-variant: '#c3c6d4'
  surface-tint: '#2b5bb5'
  primary: '#003178'
  on-primary: '#ffffff'
  primary-container: '#0d47a1'
  on-primary-container: '#a1bbff'
  inverse-primary: '#b0c6ff'
  secondary: '#0061a4'
  on-secondary: '#ffffff'
  secondary-container: '#33a0fd'
  on-secondary-container: '#00355c'
  tertiary: '#323538'
  on-tertiary: '#ffffff'
  tertiary-container: '#494c4f'
  on-tertiary-container: '#babcbf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00429c'
  secondary-fixed: '#d1e4ff'
  secondary-fixed-dim: '#9ecaff'
  on-secondary-fixed: '#001d36'
  on-secondary-fixed-variant: '#00497d'
  tertiary-fixed: '#e0e3e6'
  tertiary-fixed-dim: '#c4c7ca'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#44474a'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  technical-label:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for the heavy-duty industrial sector, specifically focusing on power transmission and conveying components. The brand personality is **authoritative, precise, and dependable**. It speaks to engineers, procurement officers, and maintenance professionals who prioritize technical specifications and reliability over aesthetic whimsy.

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It utilizes high-contrast interfaces, a structured grid system, and a clinical approach to information architecture. The emotional response should be one of "operational certainty"—the user should feel that the products found here are as robust and well-engineered as the interface itself.

- **Focus:** Technical specs, load ratings, and compatibility.
- **Vibe:** Efficient, cold (professional), and systematic.
- **Anti-patterns:** Avoid soft pastel colors, whimsical illustrations, or overly rounded "consumer-grade" UI elements.

## Colors

The palette is strictly functional, utilizing a deep **Navy Blue** as the foundation of trust and authority. **Sky Blue** is reserved for interactive elements and technical highlights, ensuring they stand out against the high-contrast white backgrounds.

- **Primary (Navy):** Used for headers, primary buttons, and structural navigation.
- **Secondary (Sky):** Used for links, active states, and call-to-action accents.
- **Neutral (Slate/Black):** Used for body text and technical data to ensure maximum legibility.
- **Surface:** A "Clean White" base with subtle cool-grey alternates (`#F5F7FA`) to delineate technical sections without breaking the high-contrast professional feel.

## Typography

Typography is treated as a tool for data density. **Hanken Grotesk** provides a sharp, contemporary edge for headlines, while **Inter** ensures that long tables of specifications and part numbers remain perfectly legible.

A third typeface, **JetBrains Mono**, is introduced specifically for "Technical Labels"—part numbers, dimensions (e.g., 50mm x 1200mm), and SKU codes. This monospaced addition reinforces the "industrial" feel and prevents character confusion in critical technical data.

- **Headlines:** Bold and direct, using tight letter spacing for a compact, powerful look.
- **Body:** Standardized for readability with generous line height.
- **Data Tables:** Should prioritize Inter for speed or Mono for specific engineering tolerances.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to maintain a sense of rigid structure and reliability. 

- **Desktop (1280px+):** 12-column grid with 24px gutters. Content is centered.
- **Tablet (768px - 1279px):** 8-column grid with fluid margins.
- **Mobile (< 768px):** 4-column grid with 16px margins.

Spacing follows a strict 4px base unit. For industrial catalogs, information density is high; use `16px` (4 units) for internal component padding and `32px` (8 units) for section vertical spacing. This creates a "tight" but organized aesthetic that fits the technical nature of the products.

## Elevation & Depth

This design system avoids heavy shadows and skeuomorphism. Depth is achieved through **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** Pure White (#FFFFFF).
- **Level 1 (Cards/Containers):** Subtle borders (`1px solid #E2E8F0`) with no shadow.
- **Level 2 (Dropdowns/Modals):** A very sharp, 15% opacity shadow with 4px blur, used only to separate floating elements from the primary grid.
- **Active States:** Instead of elevation, use color shifts (e.g., White to Secondary Sky Blue) to indicate focus.

The result is a "flat-technical" look that feels like a modern engineering blueprint.

## Shapes

The shape language is **Soft (0.25rem)**. While sharp edges can feel aggressive, overly rounded corners feel too "consumer-friendly." The 4px radius provides a professional, modern finish while maintaining the geometric integrity of the technical layout.

- **Primary Buttons:** 4px radius.
- **Product Image Containers:** 4px radius or sharp (0px) if within a technical table.
- **Input Fields:** 4px radius with a 1px Navy border when focused.

## Components

### Buttons
- **Primary:** Navy Blue background, white text, bold weight. No gradient.
- **Secondary:** Transparent background, Navy Blue 2px border.
- **Ghost:** Sky Blue text, no background, for "View Specs" or internal links.

### Input Fields
- Use a high-contrast 1px border. Labels must always be visible (not just placeholders) to ensure accessibility for professional users searching for specific part numbers.

### Technical Data Cards
- Cards used for product categories (e.g., "Bearings") should use a cool-grey subtle hover effect.
- Technical specs inside cards should be aligned to a strict vertical baseline using the `technical-label` mono font.

### Chips / Status Indicators
- Use for "In Stock", "High Torque", or "Heat Resistant".
- Rectangular with minimal rounding (2px), using high-contrast text on light-tinted backgrounds.

### Lists & Tables
- This is the core of the design. Tables must have zebra-striping using `#F5F7FA` and `#FFFFFF`.
- Column headers are Navy Blue with white uppercase text.