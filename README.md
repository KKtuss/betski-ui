# Betski UI

A modern betting website UI with TikTok-style video scrolling interface.

## Features

- **Horizontal Video Scrolling**: TikTok-style card-based video container with smooth horizontal scrolling
- **Long/Short Actions**: Green and red buttons on each video for betting actions
- **Infographic Panels**: 
  - Chart panel (left top)
  - Rules panel (left bottom)
  - Stats panel (right top)
  - Orderbook panel (right bottom) with buy/sell order visualization
- **Bottom Play Button**: Central play button for main actions
- **Dark Theme**: Modern dark theme with clean white panels

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Main layout component
│   ├── VideoContainer.tsx  # Horizontal scrolling video container
│   ├── VideoCard.tsx       # Individual video card with long/short buttons
│   ├── ChartPanel.tsx      # Chart display panel
│   ├── RulesPanel.tsx      # Rules information panel
│   ├── StatsPanel.tsx      # Statistics panel
│   ├── OrderbookPanel.tsx  # Orderbook with buy/sell orders
│   └── BottomBar.tsx       # Bottom bar with play button
├── App.tsx
└── main.tsx
```

## Customization

### Adding Videos

Edit the `videos` array in `src/components/Layout.tsx` to add or modify videos:

```typescript
const [videos] = useState([
  { id: 1, title: 'Video 1', url: 'YOUR_VIDEO_URL' },
  // Add more videos...
])
```

### Customizing Long/Short Actions

Edit the `handleLong` and `handleShort` functions in `src/components/VideoContainer.tsx` to implement your betting logic.

### Styling

All component styles are in their respective `.css` files. The main theme colors can be adjusted in:
- `src/index.css` - Global styles and background
- Component-specific CSS files for panel and button colors

## Technologies Used

- React 18
- TypeScript
- Vite
- CSS3

## License

MIT
