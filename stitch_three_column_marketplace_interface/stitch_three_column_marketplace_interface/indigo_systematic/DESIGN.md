---
name: Indigo Systematic
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#464555'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3130c0'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b4dd8'
  on-tertiary-container: '#d9d8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  column-left-width: 280px
  column-center-width: 1fr
  column-right-width: 360px
  gutter: 20px
  container-padding: 32px
---

## Brand & Style
The design system is rooted in **Corporate Modernism** with a heavy emphasis on **Minimalism** and functional density. It is designed for multi-functional platforms where information hierarchy is paramount. The aesthetic is clean, tech-focused, and highly organized, aiming to evoke a sense of efficiency and reliability.

The UI utilizes a "Surface-on-Surface" approach, using subtle tonal shifts rather than aggressive shadows to define hierarchy. This ensures that even with a data-heavy 3-column layout, the interface remains breathable and reduces cognitive load for the user.

## Colors
The palette is dominated by **Deep Indigo** for primary actions, ensuring a strong brand presence and clear call-to-action paths. **Emerald** is reserved strictly for positive status indicators (e.g., "Open," "Active," "Verified"), while **Slate** provides high-contrast legibility for long-form text and data.

Backgrounds utilize a tiered system:
- **Base Background:** #F9FAFB (Cool Gray) to provide a soft canvas.
- **Surface Containers:** #FFFFFF (Pure White) to elevate content modules and cards.
- **Borders:** #E2E8F0 (Light Slate) used for subtle containment without visual clutter.

## Typography
This design system relies exclusively on **Inter** to maintain a technical and systematic feel. The type scale is optimized for screen-based density.

- **Headlines:** Use a tighter letter-spacing and heavier weights to anchor sections.
- **Body Text:** Standard weight (400) for readability, utilizing Slate (#1E293B) for primary content and a lighter variant for secondary metadata.
- **Labels:** Small caps or bolded 12px font are used for categorizing items in the Marketplace or Job boards.

## Layout & Spacing
The layout follows a **Fixed-Fluid-Fixed 3-column architecture** for desktop:
1.  **Left Column (Navigation):** 280px. Contains high-level navigation, filters, and user profile.
2.  **Center Column (Feed/List):** Fluid width. Dedicated to the primary browsing experience (Jobs/Marketplace cards).
3.  **Right Column (Detail/Context):** 360px. Houses the expanded view of the selected item, sponsored content, or suggested actions.

**Breakpoints:**
- **Desktop (1280px+):** Full 3-column view.
- **Tablet (768px - 1279px):** Left navigation collapses into a rail or hamburger menu; Center and Right columns merge into a 2-column view or single-column detail view.
- **Mobile (<768px):** Single column stack. Detail views transition to full-screen overlays.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Soft Ambient Shadows**. 
- **Level 0 (Background):** #F9FAFB.
- **Level 1 (Cards/Sidebar):** White surface with a 1px border (#E2E8F0).
- **Level 2 (Hover State):** A very soft shadow (0 4px 6px -1px rgb(0 0 0 / 0.1)) to indicate interactivity.
- **Level 3 (Modals/Popovers):** Higher elevation shadow (0 10px 15px -3px rgb(0 0 0 / 0.1)) with a semi-transparent backdrop blur (8px) for focus.

## Shapes
The design system uses a **Soft (0.25rem)** roundedness logic to maintain a professional, sharp tech aesthetic while avoiding the "toy-like" feel of fully rounded corners.
- **Inputs & Buttons:** 0.25rem (4px).
- **Cards & Detail Containers:** 0.5rem (8px).
- **Filtering Chips:** Full pill (999px) to distinguish them from structural elements like buttons or cards.

## Components

### Buttons
- **Primary:** Solid Deep Indigo with white text. High emphasis.
- **Secondary:** White background with Indigo border and text. 
- **Ghost:** No border, Indigo text. Used for "Cancel" or secondary navigation.

### Cards (Job/Marketplace)
- Cards use a white surface with a 1px border.
- On hover, the border color shifts to the primary indigo, and a subtle shadow is applied.
- Marketplace items feature a 1:1 aspect ratio image at the top; Jobs feature a company logo in a 48px rounded square.

### Filtering Chips
- Small, rounded-pill elements.
- **Inactive:** Light gray background (#F1F5F9) with Slate text.
- **Active:** Primary Indigo background with White text and a "close" 'x' icon.

### Detail View Containers
- Located in the right-hand column. These are persistent containers that refresh content based on the center-column selection.
- Features a sticky footer for primary CTAs like 'Apply Now' or 'Chat with Seller' to ensure they are always visible regardless of scroll depth.

### Sidebar Navigation
- Vertical stack with 24px icons and 14px labels.
- Active states use a 4px vertical "primary indigo" bar on the left edge of the item and a subtle indigo tint (5% opacity) on the background.

### Sponsored Banners
- Integrated seamlessly into the feed. 
- Distinguished by a subtle "Indigo-tinted" background (#F5F3FF) and a small "Sponsored" label-sm tag in the top right.