# shadcn/ui for Frontend Component Architecture

We decided to use shadcn/ui (Radix UI primitives + Tailwind CSS) for all UI components in `apps/web`.

## Context
Academic document interfaces require robust accessibility (keyboard navigation, accessible modals, tooltips, popovers, and collapsible drawers) without bloated third-party component library runtimes or opinionated visual themes that clash with minimalist academic design standards.

## Decision
All reusable UI elements reside directly within `apps/web/src/components/ui/` using headless Radix UI accessible primitives styled strictly with Tailwind CSS utility classes and neutral monochrome design tokens.
