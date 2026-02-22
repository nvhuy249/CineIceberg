# Design Tokens Guide

This project uses a centralized token file:

- `app/constants/designTokens.ts`

## Imports

```ts
import { DESIGN_TOKENS } from "@/app/constants/designTokens";
```

```ts
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  BUTTON_VARIANTS,
  getMatchScoreColors,
} from "@/app/constants/designTokens";
```

If your environment does not support `@/`, use:

```ts
import { COLORS } from "../constants/designTokens";
```

## Token Groups

- `COLORS`: background, text, accent, borders, status
- `TYPOGRAPHY`: families, sizes, weights, line-heights, spacing
- `SPACING`: sizing scale and padding/gap presets
- `BORDER_RADIUS`: shared rounded values
- `SHADOWS`: regular and ice-blue glow shadows
- `ANIMATION`: durations, easing, transition presets
- `Z_INDEX`: layer model
- `COMPONENT_SIZES`: icon/button/logo/card dimensions
- `LAYOUT`: widths, header sizes, container padding
- `OPACITY`: common alpha values
- `BUTTON_VARIANTS`: primary/secondary/ghost/destructive
- `TASTE_TAG_VARIANTS`: default and accent tag styles
- `MATCH_SCORE_COLORS`: high/medium/low score colors
- `ICEBERG_LOGO`: logo tones and opacity levels

## Helper Functions

```ts
withOpacity("#b8c5d6", 0.3); // "rgba(184, 197, 214, 0.3)"
```

```ts
const scoreStyle = getMatchScoreColors(87);
```

## Example Patterns

```ts
const cardStyle = {
  backgroundColor: COLORS.background.elevated,
  borderColor: COLORS.border.default,
  borderWidth: 1,
  borderRadius: BORDER_RADIUS.card,
  padding: SPACING.padding.card,
};
```

```ts
const buttonStyle = {
  backgroundColor: BUTTON_VARIANTS.primary.bg,
  borderRadius: BORDER_RADIUS.button,
  minHeight: 42,
  paddingHorizontal: SPACING.xl,
};
```

