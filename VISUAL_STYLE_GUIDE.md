# Visual Style Guide (Minimal Dark)

## Palette

- Base background: `#080809`
- Elevated surfaces: `#0f0f11`
- Subtle contrast layer: `#15151a`
- Primary text: `#e8e8ea`
- Secondary text: `#6b6b70`
- Accent ice blue: `#b8c5d6`
- Accent frost: `#8a9bb0`

## Tonal Hierarchy

```txt
Primary BG      ████████████████  #080809
Elevated BG     ████████████████  #0f0f11
Subtle BG       ████████████████  #15151a
```

```txt
Primary Text    ████████████████  #e8e8ea
Secondary Text  ████████████████  #6b6b70
Accent          ████████████████  #b8c5d6
```

## Typography Scale

- XS: 12
- SM: 14
- MD: 16
- LG: 18
- XL: 24
- 2XL: 32

## Component Anatomy

```txt
Card
┌──────────────────────────────────┐
│ Title (16/600, primary text)     │
│ Subtitle (14/400, secondary text)│
│                                  │
│ Action Button (ice blue accent)  │
└──────────────────────────────────┘
```

## States

- Default border: `rgba(255,255,255,0.04)`
- Hover border: `rgba(255,255,255,0.08)`
- Accent glow: ice-blue shadow presets in `SHADOWS.iceGlowSm` and `SHADOWS.iceGlowMd`

## Layout Rhythm

- Base unit: `4`
- Typical paddings: `12`, `16`, `24`
- Container max content width: `1120`

