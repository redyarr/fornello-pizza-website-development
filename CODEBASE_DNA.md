# CODEBASE DNA: Fornello Pizza Engineering & Design System

> **Repository:** `fornello-pizza-website-development`  
> **Stack:** Next.js 16 (App Router + Turbopack), React 19, TypeScript 5.7, Tailwind CSS v4, Base UI primitives  
> **Status:** Authoritative Architectural & Design Blueprint

---

## 1. Core Architectural Blueprint

### Directory Layout & Boundaries
```
├── app/                        # Next.js App Router (Thin server/client shells)
│   ├── globals.css             # Tailwind v4 theme, OKLCH tokens, base typography, RTL rules
│   ├── layout.tsx              # Root HTML shell, Google Fonts (DM Sans, Oswald, Noto Sans Arabic)
│   ├── page.tsx                # Server Component root; parses searchParams -> OrderProvider
│   └── qr/page.tsx             # Staff Table QR Studio route (unindexed, print-ready)
├── components/                 # Domain-specific and layout components
│   ├── cart-bar.tsx            # Floating bottom bar with safe-area padding & view switcher
│   ├── hero.tsx                # Hero banner with RTL-flipped photography & quick mode switcher
│   ├── item-sheet.tsx          # Item modifier & customization bottom sheet
│   ├── menu-browser.tsx        # Search, filter tags, sticky category subnav with scroll-spy
│   ├── menu-item-row.tsx       # Individual menu list item with badge tags & price
│   ├── mode-switcher.tsx       # Dine-in vs Takeaway toggle and table picker
│   ├── order-provider.tsx      # React Context holding cart, dining mode, language & URL sync
│   ├── order-sheet.tsx         # Cart drawer with WhatsApp checkout & ticket triggering
│   ├── qr-studio.tsx           # Printable QR generator for tables 1–25 and takeaway counter
│   ├── sheet.tsx               # Reusable modal/bottom-sheet primitive using native <dialog>
│   ├── site-footer.tsx         # Multilingual footer with contact details and staff link
│   ├── site-header.tsx         # Sticky header with brand, dining mode pill & language toggle
│   ├── tricolor.tsx            # Italian tricolor accent bar (Basil, White, Terracotta)
│   └── waiter-ticket.tsx       # High-contrast, full-screen inverted card for waiter/counter
├── lib/                        # Pure business logic, types, data schemas, i18n
│   ├── i18n.ts                 # Bilingual dictionaries (en, ckb) & shop constants (SITE)
│   ├── menu.ts                 # Menu item catalogue, modifier groups, add-on pricing, prep times
│   ├── order.ts                # Calculation algorithms, receipt formatting, URL query serialization
│   └── utils.ts                # Utility cn() combining clsx and tailwind-merge
└── public/                     # Static media assets (optimized PNGs/SVGs)
```

### Component Responsibility & Decomposition Rules
1. **Server vs. Client Boundary**:
   - `app/page.tsx` is an `async` Server Component. It extracts `searchParams`, invokes `parseOrderParams()`, and feeds the parsed object as initial props to the client tree (`OrderProvider`).
   - All interactive UI components declare `'use client'` at line 1.
2. **Decomposition Threshold**:
   - Sheets and modals must never hold raw dialog implementations inline. Always encapsulate via `Sheet` (`components/sheet.tsx`).
   - When a sheet or modal manages form state for an item, split into an outer container and an inner keyed form:
     ```tsx
     <Sheet open={item !== null} onClose={onClose} label={item?.name ?? ''}>
       {item ? <ItemForm key={item.id} item={item} onClose={onClose} /> : null}
     </Sheet>
     ```
     *Reason:* The `key={item.id}` pattern ensures local modifier state resets cleanly on each item selection without manual `useEffect` cleanup.
3. **Data & Logic Colocation**:
   - No inline calculation logic inside JSX. Calculations like pricing (`unitPrice`, `lineTotal`, `cartTotal`), preparation times (`prepEstimate`), and pacing checks (`needsPacing`) must live in `lib/order.ts` as pure, testable functions.
4. **Button & Interactive Controls**:
   - All interactive buttons are styled directly with semantic `<button type="button">`, Tailwind utility classes, and ARIA attributes (`role="radio"`, `aria-checked`, `aria-pressed`, `aria-live`). The initial unused `components/ui/button.tsx` template file was pruned to prevent runtime abstraction overhead and guarantee zero pixel-shift or micro-interaction regressions.

---

## 2. Code Signatures & Conventions

### Import Order Hierarchy
Strictly follow this import group ordering:
1. Third-party packages (`react`, `next/*`, `lucide-react`, `@base-ui/*`)
2. Domain types, schemas, and library functions (`@/lib/*`)
3. Sibling and child components (`./*` or `@/components/*`)

```tsx
'use client'

import { ShoppingBag, Utensils } from 'lucide-react'
import { useState } from 'react'
import { SITE } from '@/lib/i18n'
import { padTable, type Mode } from '@/lib/order'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'
```

### Export Conventions
- **Domain Components & Utilities**: Always use **named exports** (`export function MenuBrowser()`, `export function cn()`).
- **Next.js Route Pages/Layouts**: Use **default exports** (`export default function Page()`).
- **Types**: Use explicit type exports (`export type { MenuItem, CategoryId }`).

### Context & State Signature
- State is managed via a single typed React Context (`OrderProvider`).
- Direct URL synchronization uses non-reloading history replacement:
  ```ts
  const update = (patch: Partial<OrderParams>) => {
    const next = { ...params, ...patch }
    setParams(next)
    window.history.replaceState(null, '', orderQuery(next))
  }
  ```
- Always throw early when hooks are consumed outside their context provider:
  ```ts
  export function useOrder(): OrderContextValue {
    const value = useContext(OrderContext)
    if (!value) throw new Error('useOrder must be used inside OrderProvider')
    return value
  }
  ```

### Native HTML5 `<dialog>` Signature
Modals avoid heavy JavaScript animation libraries or bloated modal runtimes in favor of the standard `<dialog>` API:
```tsx
export function Sheet({ open, onClose, label, variant = 'sheet', children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={cn(...)}
    >
      {open ? children : null}
    </dialog>
  )
}
```

---

## 3. Bilingual & RTL Engineering Rules (English & Central Kurdish `ckb`)

The website serves both **English (`en`)** and **Central Kurdish / Sorani (`ckb`)**. Because Kurdish uses the Arabic script, adhere to these strict linguistic rules:

1. **Letter Spacing Prohibition in Kurdish**:
   - Arabic-script characters connect cursively. Adding tracking or uppercase transforms destroys letter shapes.
   - Enforced globally in `app/globals.css`:
     ```css
     :lang(ckb) {
       letter-spacing: 0 !important;
     }
     ```
   - When styling Latin uppercase headings with tracking, explicitly isolate the language:
     ```tsx
     <span lang="en" className="font-display tracking-[0.18em] uppercase">FORNELLO</span>
     <p lang="ckb" className="text-muted-foreground">{SITE.nameCkb}</p>
     ```
2. **Bidirectional Isolation (`<bdi>`)**:
   - Any phone number, Instagram handle, Latin word, or numeric string rendered in bilingual context **must** be wrapped in `<bdi dir="ltr">`:
     ```tsx
     <bdi dir="ltr">{SITE.phoneDisplay}</bdi>
     <bdi dir="ltr">{SITE.instagramHandle.slice(1)}</bdi>
     ```
3. **Logical CSS Properties**:
   - Never use directional margins or paddings (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`).
   - Use CSS Logical Properties: `ps-` (padding-start), `pe-` (padding-end), `ms-`, `me-`, `start-`, `end-`.
   - Use `text-start` and `text-end`.
4. **Directional Inversion**:
   - Navigation arrows must flip in RTL: `className="size-4 rtl:rotate-180"`
   - Hero background imagery must mirror in RTL: `className="object-cover rtl:-scale-x-100"`
   - Gradients must adapt: `bg-linear-to-r ... rtl:bg-linear-to-l`

---

## 4. Design & Styling Tokens (Tailwind CSS v4 & OKLCH)

### Color Palette & Theme Tokens
Color coordinates are defined in `app/globals.css` using the perceptually uniform **OKLCH** color space:

| Token | OKLCH Value | Role / Usage |
|---|---|---|
| `--background` | `oklch(0.2 0.02 165)` | Very deep forest-charcoal canvas |
| `--card` / `--popover` | `oklch(0.34 0.075 158)` | Deep sage green surfaces |
| `--foreground` | `oklch(0.95 0.035 92)` | Warm ivory parchment text |
| `--primary` | `oklch(0.9 0.07 90)` | Warm dough gold (CTAs, badge borders, highlights) |
| `--primary-foreground` | `oklch(0.2 0.03 160)` | Deep charcoal on dough gold |
| `--secondary` | `oklch(0.27 0.03 162)` | Subtle darkened green-gray for search inputs & chips |
| `--muted-foreground` | `oklch(0.84 0.035 100)` | Soft muted parchment for secondary descriptions |
| `--accent` | `oklch(0.56 0.19 27)` | Rich terracotta / tomato red (order actions, add to cart) |
| `--accent-foreground` | `oklch(0.98 0.01 90)` | Clean light ivory on terracotta |
| `--destructive` | `oklch(0.72 0.18 25)` | Spicy flame indicator & delete buttons |
| `--basil` | `oklch(0.62 0.16 148)` | Fresh Italian basil green for vegetarian tags & tricolor |
| `--border` | `oklch(0.95 0.035 92 / 22%)` | Translucent warm border |
| `--input` | `oklch(0.95 0.035 92 / 32%)` | Translucent form borders |

### Typography Stack
- **Display Typography (`font-display`)**: `Oswald` (Google Font), used in uppercase with tracking (`tracking-wide` or `tracking-[0.14em]`) for brand names, titles, categories, and large numbers.
- **Body Typography (`font-sans`)**: `DM Sans` (Google Font) for all standard UI labels, buttons, and English descriptions.
- **Arabic Typography (`font-arabic`)**: `Noto Sans Arabic` (Google Font) configured seamlessly as fallback in CSS `--font-sans` and `--font-display`.

### Micro-Patterns & Visual Accents
- **Italian Tricolor (`Tricolor`)**: An Italian visual signature (`bg-basil`, `bg-white`, `bg-accent`) rendered under category titles and brand marks.
- **Parchment Dashed Borders**: Category title boxes and dividing lines use `border-dashed border-2 border-primary/70` and `divide-dashed divide-foreground/30`.
- **Tabular Numerics**: Any element showing currency (`formatIQD`) or quantities must specify `tabular-nums` to prevent horizontal layout jiggle.
- **Mobile Safe Area**: Fixed bottom bars must employ safe area insets: `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- **Tailwind v4 Gradients**: Always use the modern Tailwind v4 syntax `bg-linear-to-r` (not `bg-gradient-to-r`).

---

## 5. Anti-Patterns & Prohibitions

| Prohibited Pattern | Required Pattern | Reason |
|---|---|---|
| `// TODO` or placeholder mocks | Complete end-to-end implementation | Production quality standard |
| `mr-*`, `ml-*`, `pl-*`, `pr-*` | `me-*`, `ms-*`, `pe-*`, `ps-*` | Breaks Kurdish RTL layout |
| Raw `$`, `USD`, or untyped number for prices | `formatIQD(amount)` | Currency is Iraqi Dinar (`IQD`) formatted as `6,500 IQD` |
| Uppercase on Kurdish text | Uppercase only on `lang="en"` | Kurdish script has no case; CSS uppercase can corrupt Arabic unicode |
| Radix/Headless UI dialog install | Use `<Sheet>` (`components/sheet.tsx`) | Preserves low bundle size and native `<dialog>` accessibility |
| Hardcoded strings in UI components | Add key to `lib/i18n.ts` under `en` and `ckb` | Preserves 100% bilingual parity |
| Re-inventing state in sheets | Use `useOrder()` | Prevents desynchronization of cart and dining context |
| `bg-gradient-to-r` | `bg-linear-to-r` | Tailwind CSS v4 syntax standard |
| Direct `window.location.href = ...` for queries | `window.history.replaceState(...)` | Prevents page refresh on table/lang/mode change |

---

## 6. Verification Checklist Before Any Commit
- [ ] TypeScript strict check passes (`pnpm build` or `pnpm exec tsc --noEmit`).
- [ ] Both English (`en`) and Kurdish (`ckb`) strings exist in `lib/i18n.ts`.
- [ ] RTL layout behaves correctly when switching language.
- [ ] Mobile responsive layout tested (small screen, bottom bar safe areas).
- [ ] Tabular numerals applied to any currency or counter display.
- [ ] Keyboard navigation and accessibility labels (`aria-label`, `aria-live`, `aria-hidden`) in place.

