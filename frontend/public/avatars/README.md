# Avatar Assets Directory

This directory should contain static avatar images for the OBS Avatar View.

## Required Images (All PNG format)

Place the following static image files here:
- `idle.png` - Default idle state
- `listening.png` - Listening state
- `thinking.png` - Thinking state
- `speaking.png` - Speaking/talking state
- `excited.png` - Excited state
- `confused.png` - Confused expression

## Image Requirements

- **Format**: PNG with transparent background
- **Size**: 512x512px recommended
- **Optimization**: Use tools like ImageOptim or TinyPNG to reduce file size
- **Style**: Consistent art style across all states

## Example Structure
```
avatars/
├── idle.png
├── listening.png
├── thinking.png
├── speaking.png
├── excited.png
└── confused.png
```

## Animation Notes

Even though we use static images, the application adds dynamic effects:
- **Speaking**: Gentle up/down movement
- **Excited**: Slight scale pulsing with sparkle effects
- **Thinking**: Thought bubble overlay
- **Idle/Listening**: Simulated blinking effect
- **All states**: Smooth transitions between image changes