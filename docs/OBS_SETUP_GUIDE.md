# AIVlingual OBS Integration Setup Guide

## 🎬 Overview

AIVlingual provides multiple OBS browser source views for educational streaming. Each view is optimized for different streaming scenarios and can be customized through URL parameters.

## 📋 Available Views

### 1. Subtitle View (`mode=subtitle`)
Real-time subtitles with translation support
- **Best for**: Live conversations, language lessons
- **Features**: Speaker indicators, language detection, smooth animations

### 2. Chat View (`mode=chat`)
Scrolling chat display with message history
- **Best for**: Interactive streams, Q&A sessions
- **Features**: Color-coded speakers, timestamps, translations

### 3. Educational View (`mode=educational`)
Vocabulary flashcards and learning content
- **Best for**: Teaching streams, vocabulary lessons
- **Features**: Auto-rotating flashcards, difficulty indicators, progress tracking

### 4. Avatar View (`mode=avatar`)
Animated AI avatar with expression states
- **Best for**: Virtual assistant, entertainment
- **Features**: Emotion detection, lip-sync simulation, status indicators

### 5. Analysis View (`mode=analysis`)
Live video analysis and statistics
- **Best for**: Content review, learning analytics
- **Features**: Expression showcase, topic tags, live statistics

## 🔧 OBS Setup Instructions

### Step 1: Add Browser Source
1. In OBS, click the **+** button in Sources
2. Select **Browser**
3. Name your source (e.g., "AIVlingual Subtitles")

### Step 2: Configure Browser Source

#### Basic URL Format:
```
http://localhost:3000/obs?mode=subtitle
```

#### Full URL with Parameters:
```
http://localhost:3000/obs?mode=subtitle&fontSize=28&fontColor=%23FFFFFF&theme=transparent&position=bottom
```

### Step 3: Browser Source Settings

| Setting | Recommended Value |
|---------|-------------------|
| Width | 1920 |
| Height | 1080 |
| FPS | 30 |
| CSS | Leave empty |
| Shutdown source when not visible | ✓ |
| Refresh browser when scene becomes active | ✓ |

## 🎨 URL Parameters

### Common Parameters (All Views)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `subtitle` | View mode: `subtitle`, `chat`, `educational`, `avatar`, `analysis` |
| `fontSize` | number | `24` | Base font size in pixels |
| `fontColor` | string | `#FFFFFF` | Text color (URL encoded) |
| `bgColor` | string | `transparent` | Background color |
| `theme` | string | `transparent` | Theme: `transparent`, `dark`, `light` |
| `width` | number | `1920` | View width |
| `height` | number | `1080` | View height |
| `animation` | boolean | `true` | Enable/disable animations |

### View-Specific Parameters

#### Subtitle View
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `position` | string | `bottom` | Position: `top`, `center`, `bottom` |
| `showTranslation` | boolean | `true` | Show translations |
| `duration` | number | `auto` | Display duration in ms |

## 📺 Example Configurations

### 1. Bottom Subtitles (Default)
```
http://localhost:3000/obs?mode=subtitle
```

### 2. Large Top Subtitles
```
http://localhost:3000/obs?mode=subtitle&position=top&fontSize=32
```

### 3. Chat with Dark Theme
```
http://localhost:3000/obs?mode=chat&theme=dark
```

### 4. Educational Flashcards
```
http://localhost:3000/obs?mode=educational&fontSize=28
```

### 5. Avatar with Custom Size
```
http://localhost:3000/obs?mode=avatar&width=400&height=400
```

## 🎯 Scene Setup Examples

### Language Learning Scene
1. **Main Camera** - Full screen
2. **AIVlingual Subtitles** - Bottom third
3. **AIVlingual Educational** - Top right corner
4. **Chat** - Left side panel

### Virtual Tutor Scene
1. **Screen Share** - Main content
2. **AIVlingual Avatar** - Bottom right
3. **AIVlingual Analysis** - Top bar

### Interactive Stream Scene
1. **Game/Content** - Main area
2. **AIVlingual Chat** - Right side
3. **Camera** - Bottom left corner

## 🛠️ Troubleshooting

### Browser Source Not Updating
1. Right-click the browser source
2. Select "Interact"
3. Press F5 to refresh

### Connection Issues
- Ensure the backend server is running on port 8000
- Check that WebSocket connection is established
- Verify CORS settings allow OBS user agent

### Performance Optimization
- Disable animations: `&animation=false`
- Reduce update frequency in OBS settings
- Use hardware acceleration in OBS

## 🔌 Advanced Integration

### Custom CSS (OBS Properties)
```css
body { 
  background-color: transparent !important; 
  margin: 0 !important;
}
```

### Hotkey Setup
1. OBS Settings → Hotkeys
2. Find your browser sources
3. Set "Show" and "Hide" hotkeys
4. Use for quick view switching

### StreamDeck Integration
Create multi-actions to:
1. Switch scenes
2. Toggle browser sources
3. Send WebSocket commands

## 📝 WebSocket Commands

For advanced control, connect to WebSocket and send:

```javascript
// Change avatar emotion
{ type: 'control', action: 'setEmotion', emotion: 'excited' }

// Clear subtitles
{ type: 'control', action: 'clearSubtitles' }

// Update analysis data
{ type: 'analysis', data: { ... } }
```

## 🎭 Best Practices

1. **Test Before Streaming**
   - Check all views work correctly
   - Verify font sizes are readable
   - Test animations don't cause lag

2. **Use Transparent Backgrounds**
   - Allows flexibility in scene composition
   - Works well with any stream design

3. **Monitor Performance**
   - Keep OBS stats panel open
   - Watch for rendering lag
   - Adjust quality settings if needed

4. **Create Scene Collections**
   - Save different configurations
   - Quick switching between setups
   - Backup your scenes regularly

## 📚 Example Stream Workflows

### Educational Stream
1. Start with Avatar View for introduction
2. Switch to Subtitle View for conversation
3. Use Educational View for vocabulary review
4. End with Analysis View for summary

### Entertainment Stream
1. Chat View as persistent sidebar
2. Subtitle View for key moments
3. Avatar View for reactions
4. Educational View for teaching moments

---

## Need Help?

- Check the console in OBS browser source for errors
- Ensure all services are running
- Join our Discord for community support
- Report issues on GitHub

Happy Streaming! 🚀