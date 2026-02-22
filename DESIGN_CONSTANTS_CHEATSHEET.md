# Design Constants Cheatsheet

## Core Colors

```ts
COLORS.background.primary // #080809
COLORS.background.elevated // #0f0f11
COLORS.background.subtle // #15151a

COLORS.foreground.primary // #e8e8ea
COLORS.foreground.secondary // #6b6b70

COLORS.accent.iceBlue // #b8c5d6
COLORS.accent.frost // #8a9bb0

COLORS.border.default // rgba(255,255,255,0.04)
COLORS.border.hover // rgba(255,255,255,0.08)
```

## Most Used Spacing

```ts
SPACING.sm // 8
SPACING.lg // 16
SPACING.xl // 24
SPACING["2xl"] // 32
```

## Common Radius

```ts
BORDER_RADIUS.sm // 6
BORDER_RADIUS.md // 8
BORDER_RADIUS.card // 12
BORDER_RADIUS.pill // 999
```

## Common Motion

```ts
ANIMATION.duration.fast // 120
ANIMATION.duration.normal // 200
ANIMATION.duration.slow // 320
```

## Quick Style Snippets

```ts
const panel = {
  backgroundColor: COLORS.background.elevated,
  borderColor: COLORS.border.default,
  borderWidth: 1,
  borderRadius: BORDER_RADIUS.lg,
  padding: SPACING.lg,
};
```

```ts
const mutedText = {
  color: COLORS.foreground.secondary,
  fontSize: TYPOGRAPHY.fontSize.sm,
};
```

```ts
const primaryButton = {
  backgroundColor: BUTTON_VARIANTS.primary.bg,
  borderRadius: BORDER_RADIUS.button,
  minHeight: COMPONENT_SIZES.button.md,
};
```

