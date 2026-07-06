---
title: Component Library Spec
project: Let's find you a family doctor in Ontario
created_on: 2026-05-08
purpose: |
  This file is the contract between the design system Bolt project and the screens
  Bolt project. The design system project produces these components. The screens
  project consumes them. Bolt should read this file before generating anything
  in either project.
---

# Component Library

## How to use this file

If you are Bolt working in the **design system project**: build every component listed below in `src/components/design-system/`, one file per component. Use the design tokens from PRD.md (palette, typography, spacing). Do not build any application screens. When in doubt about a prop, follow the TypeScript signature.

If you are Bolt working in the **screens project** (the duplicated fork): read this file before generating any view code. Compose screens from these components only. Do not invent new buttons, inputs, or modals. If a need arises that isn't covered, add the new component to `src/components/design-system/`, update this file in the same edit, and only then use it.

## Design tokens

Drawn verbatim from PRD.md, UI Design System section.

### Color palette (logo aligned)

| Role | Token | Hex |
|---|---|---|
| Background base | `background-base` | `#F7F2E7` |
| Surface (cards) | `surface` | `#FFFCF5` |
| Primary action | `primary` | `#8FB89E` |
| Primary action hover | `primary-hover` | `#7BA386` |
| Secondary action | `secondary` | `#7A9CB8` |
| Text primary | `text-primary` | `#2D4A6B` |
| Text secondary | `text-secondary` | `#6B7A8A` |
| Text tertiary | `text-tertiary` | `#A4BCCF` |
| Border | `border-soft` | `#E5DFD2` |
| Brand accent | `brand-accent` | `#E89A8E` |
| Status accepted | `status-accepted` | `#7BA386` |
| Status rejected | `status-rejected` | `#D8A09C` |
| Status pending | `status-pending` | `#C4B89A` |
| Status calling | `status-calling` | `#7A9CB8` |
| Status no answer | `status-no-answer` | `#5C4A3A` |

**Implementation note:** Component code references colors through Tailwind theme tokens (e.g., `bg-primary`, `text-text-primary`), never raw hex codes. The hex values shown here are spec only, so a human reader can see what each token represents. See "Token implementation rule" in PRD.md.

### Typography

Font families:
* **Heading and body:** Inter
* **Mono (OHIP, postal code, timestamps):** JetBrains Mono

Type scale:

| Role | Size | Weight | Line height |
|---|---|---|---|
| h1 (page title) | 32px | 600 | 1.25 |
| h2 (section) | 24px | 600 | 1.3 |
| h3 (card title) | 18px | 500 | 1.4 |
| Body | 16px | 400 | 1.6 |
| Small (helper, label) | 14px | 400 | 1.5 |
| Micro (caption, timestamp) | 12px | 400 | 1.4 |
| Button | 15px | 500 | 1.0 |
| Mono | 15px | 500 | 1.4 |

### Spacing

* **Grid:** 4px base. Multiples 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
* **Card padding:** 24px.
* **Section gap on a page:** 32px.
* **Page outer margin:** 64px on the desktop main content area (around the page header and body).

### Border radius scale

* **sm:** 4px (small inputs, tags)
* **md:** 8px (Button, Input, Select)
* **lg:** 12px (Card, Modal, Banner)
* **pill:** 9999px (StatusPill, Tag, Avatar)

### Z index stack

Layer everything predictably:

* Page content: 0
* SidebarNav: 10
* PageHeader: 20
* Banner: 30
* Modal overlay: 100
* Modal content: 110
* Toast: 200
* Tooltip / Popover: 300

## Global interaction rules

These apply to every interactive element. Implement them once in shared utilities, not per component.

### Focus

Focus ring on any interactive element: 2px solid `#8FB89E`, 2px offset from the element. Visible only on keyboard focus (`:focus-visible`), never on mouse click.

### Hover

* Buttons: defined per variant in the Button section.
* Rows in lists (search results, shortlist): subtle `#F7F2E7` background fill.
* Ghost links: text color shifts from `#6B7A8A` to `#2D4A6B`.
* Cards (when clickable): no color shift, but border color shifts from `#E5DFD2` to `#8FB89E`.

### Disabled

50 percent opacity, no hover state, cursor `not-allowed`.

### Transitions

* `120ms ease-out` for color and opacity changes (hover, focus).
* `200ms ease-in-out` for size and position changes.
* `300ms ease-in-out` for modal open and close, drawer slide, page transitions.
* `1500ms ease-in-out infinite` for the StatusPill `calling` pulse.

### Iconography

* **Library:** `lucide-react`. No other icon libraries.
* **Inline / nav:** 20px, stroke 1.5px.
* **Inside buttons:** 16px, stroke 1.5px.
* **Empty state illustration:** 48px, stroke 1.5px, color `#C4B89A`.

### Out of scope (do not introduce)

* No dark mode. Light theme only.
* No drop shadows on cards. Modals are the only element that gets a shadow: `0 8px 24px rgba(45, 74, 107, 0.12)`.
* No gradients anywhere.
* No background images.
* No custom fonts beyond Inter and JetBrains Mono.

## Components

### Button

Primary interactive element.

```ts
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'ghost' | 'dangerGhost';
  size?: 'sm' | 'md' | 'lg';   // default 'md'
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onClick: () => void;
  children: ReactNode;
};
```

Notes:
* `primary` uses `bg-primary` background, `text-surface` text. Hover `bg-primary-hover`.
* `secondary` uses `bg-secondary` background, `text-surface` text.
* `ghost` is transparent background, `text-text-primary` text, `border-border-soft` border on hover.
* `dangerGhost` is transparent background, `text-status-rejected` text, used for "Remove" or "Delete" actions.
* `loading` swaps the children with a small spinner. Disable click while loading.
* Border radius: `rounded-md`. Padding: 12px 20px for `md`.

### Input

Text input family.

```ts
type InputProps = {
  type: 'text' | 'email' | 'password' | 'postalCode' | 'ohip';
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};
```

Notes:
* `postalCode` formats as `M4K 1A1` automatically as the user types.
* `ohip` masks all but the last 4 digits with a reveal toggle (eye icon button on the right).
* `error` renders a single line of error text below the input in `text-status-rejected`.
* `helper` renders below the input in `text-text-secondary`. Hidden when `error` is present.
* Border: 1px `border-soft`. Focus ring: 2px `primary`.
* Border radius: `rounded-md`. Padding: 12px 16px.

### Select

Single value dropdown.

```ts
type SelectProps<T> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};
```

### MultiSelect

Multi value dropdown rendered as toggleable pills.

```ts
type MultiSelectProps<T> = {
  label: string;
  value: T[];
  options: Array<{ value: T; label: string }>;
  onChange: (value: T[]) => void;
  error?: string;
};
```

Notes:
* Selected pills use `bg-primary` background. Unselected pills use `bg-surface` background with `border-border-soft` border.

### Toggle

Two state on/off switch.

```ts
type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};
```

### Slider

Single value range slider.

```ts
type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;     // e.g. 'km'
};
```

Notes:
* Track is `border-soft`. Filled portion is `primary`. Thumb is `surface` with a 2px `primary` border.
* Show the current value with unit to the right of the slider.

### TimePicker

Hour:minute picker for setting allowed call hours.

```ts
type TimePickerProps = {
  label: string;
  value: string;       // 'HH:MM' 24h
  onChange: (value: string) => void;
};
```

### StatusPill

Compact status indicator.

```ts
type StatusPillProps = {
  status: 'not_called' | 'calling' | 'accepted' | 'rejected' | 'voicemail_left' | 'no_answer';
};
```

Notes:
* `not_called` uses `bg-border-soft` background, `text-text-secondary` text. Light/neutral.
* `calling` uses `bg-status-calling` background, `text-surface` text. Subtle pulse animation.
* `accepted` uses `bg-status-accepted` background, `text-surface` text.
* `rejected` uses `bg-status-rejected` background, `text-surface` text.
* `voicemail_left` uses `bg-status-pending` background, `text-text-primary` text.
* `no_answer` uses `bg-status-no-answer` background, `text-surface` text. Warm dark brown, clearly distinct from `not_called`.

### Card

Generic surface container.

```ts
type CardProps = {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';   // default 'md' = 24px
  className?: string;
};
```

Notes:
* Background `bg-surface`. Border 1px `border-border-soft`. Border radius `rounded-lg`. No drop shadow.

### Modal

Centered dialog with overlay.

```ts
type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: { label: string; onClick: () => void; variant?: 'primary' | 'dangerGhost' };
  secondaryAction?: { label: string; onClick: () => void };
};
```

Notes:
* Overlay is `text-primary` at 40 percent opacity.
* Modal width: 480px default. Border radius `rounded-lg`.
* Close on overlay click and Escape key.
* Shadow: `shadow-modal`.

### Toast

Slide in confirmation popup.

```ts
type ToastProps = {
  id: string;
  message: string;
  variant?: 'success' | 'info' | 'warning';
  duration?: number;     // ms, default 4000
};
```

Notes:
* Bottom right of the viewport. Z-index `z-toast`.
* `success` uses `bg-status-accepted` left border. `info` uses `bg-secondary`. `warning` uses `bg-status-pending`.
* Auto dismiss after `duration`.
* Full infrastructure: `ToastProvider` context, `useToast` hook, fixed `Toaster` container.

### EmptyState

Friendly placeholder for empty lists.

```ts
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};
```

### PageHeader

Top of the main content area on every authenticated screen.

```ts
type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;     // for buttons or other inline controls on the right
  notificationBell?: { count: number; onClick: () => void };  // dashboard only
};
```

### SidebarNav

Fixed left sidebar with navigation and user card.

```ts
type SidebarNavProps = {
  currentRoute: string;
  user: { firstName: string; email: string };
  onNavigate: (route: string) => void;
  onSignOut: () => void;
};
```

Notes:
* 240px wide, full viewport height, fixed.
* Background `bg-surface`. Right border 1px `border-border-soft`.
* Wordmark at top, three lines (text only, multi color, no logo image):
  * Line 1: "Let's Find" in `text-text-primary` (navy), 18px, weight 600
  * Line 2: "Family Doctor" in `text-primary` (sage), 18px, weight 600
  * Line 3: small filled `text-brand-accent` (coral) Heart icon (12px) followed by "Toronto, Ontario" in `text-text-tertiary` (pale blue), 12px, weight 400
  * Top padding 32px, bottom padding 32px, left padding 24px
* Nav items: icon + label, 12px vertical padding, 16px horizontal. Active item: `bg-background-base`, 3px `bg-primary` left border.
* User card at the bottom: 48px circle avatar with mock initials, name, email truncated.
* "Sign out" link below the user card. Ghost button.

### UserCard

Sidebar user card. Composes the Avatar component plus name and email.

```ts
type UserCardProps = {
  firstName: string;
  lastName?: string;
  email: string;
};
```

Notes:
* Renders `<Avatar firstName lastName size="md" />` on the left, with name and email stacked to the right.
* Email truncates with ellipsis if it overflows the sidebar width.

### Banner

Inline page level banner. Used for "Finish your profile" reminder on the dashboard.

```ts
type BannerProps = {
  variant?: 'info' | 'warning';   // default 'info'
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
};
```

Notes:
* `info` uses `bg-surface` background, `border-secondary` left border 4px.
* `warning` uses `bg-surface` background, `border-status-pending` left border 4px.
* Place above the page header content when present.

### Tag

Compact non interactive label. Used for languages on a clinic card, criteria summaries, anywhere we need a small, calm pill that is not a status.

```ts
type TagProps = {
  children: ReactNode;
  size?: 'sm' | 'md';    // default 'sm'
};
```

Notes:
* Pill shape (border radius `rounded-pill`).
* Background `bg-surface`. Border 1px `border-border-soft`. Text `text-text-secondary`.
* `sm`: 12px text, 4px vertical padding, 8px horizontal padding.
* `md`: 14px text, 6px vertical padding, 10px horizontal padding.
* Not interactive. No hover. No click. If you need an interactive pill, use a Button with `size: sm`.

### Avatar

Small circular badge for the user. Lives inside UserCard, also usable standalone.

```ts
type AvatarProps = {
  firstName: string;
  lastName?: string;
  size?: 'sm' | 'md' | 'lg';   // default 'md'
};
```

Notes:
* Circle (border radius `rounded-pill`).
* Background `bg-primary`. Text `text-surface`. Weight 500.
* Initials are first letter of `firstName` plus first letter of `lastName` if present, otherwise just the first letter of `firstName`.
* `sm`: 32px diameter, 12px text.
* `md`: 48px diameter, 14px text. Used inside UserCard.
* `lg`: 64px diameter, 18px text.

### Stepper / ProgressIndicator

Horizontal sequence of dots with labels below, used for the multi step onboarding wizard.

```ts
type StepperProps = {
  steps: Array<{ id: string; label: string }>;
  currentStepId: string;
  completedStepIds: string[];
};
```

Notes:
* Each step is a 16px circle. Labels sit below the circle in 12px `text-text-secondary`. Centered horizontally.
* Current step: circle is `bg-primary` filled, label is `text-text-primary` weight 500.
* Completed step: circle is `bg-status-accepted` filled with a 12px white check mark, label is `text-text-secondary`.
* Upcoming step: circle is `bg-surface` background with 2px `border-border-soft` border, label is `text-text-secondary`.
* Connector lines between dots: 2px `border-border-soft` for upcoming connectors, 2px `bg-status-accepted` for completed connectors.
* Centered horizontally, max width 600px, top margin 24px, bottom margin 32px.
* Not interactive. Steps are not clickable.

## Index of components (for quick LLM reference)

Button, Input, Select, MultiSelect, Toggle, Slider, TimePicker, StatusPill, Card, Modal, Toast, EmptyState, PageHeader, SidebarNav, UserCard, Avatar, Banner, Tag, Stepper.

If a screen needs something not listed here, the screens project must add it to `src/components/design-system/`, update this file in the same edit, and only then use it.
