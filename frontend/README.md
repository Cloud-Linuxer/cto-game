# AWS CTO Infrastructure Strategy Game - Frontend

A turn-based strategy game for learning AWS cloud architecture through gameplay. Built with React, TailwindCSS, and shadcn/ui.

## Features

- **Interactive AWS Infrastructure Diagram**: Build and visualize cloud architecture with React Flow
- **Turn-Based Strategy**: 36 turns representing 3 years of infrastructure management
- **Real-Time Metrics**: Monitor MAU, latency, security, and costs
- **Event System**: Handle major and micro events that test your architecture
- **Multi-Language Support**: English and Korean translations with i18next
- **Mobile-First Design**: Fully responsive with TailwindCSS breakpoints
- **Redux State Management**: Predictable state management with Redux Toolkit

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Redux Toolkit**: State management
- **React Router**: Client-side routing
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **React Flow**: Interactive node-based diagrams
- **Recharts**: Data visualization
- **react-i18next**: Internationalization
- **Axios**: HTTP client

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API client and services
│   │   ├── client.js
│   │   └── gameService.js
│   ├── components/     # Reusable components
│   │   ├── common/    # Button, Card, Dialog, Toast, Tooltip
│   │   ├── diagram/   # DiagramCanvas, ServiceNode, NodePalette
│   │   ├── game/      # EventDialog, TurnSummaryDialog
│   │   └── hud/       # ResourceBar, TurnCounter, ActionPanel, EventLog, MetricsChart
│   ├── features/      # Redux slices
│   │   ├── game/      # Game state management
│   │   ├── diagram/   # Diagram state management
│   │   ├── ui/        # UI state (modals, toasts)
│   │   └── user/      # User preferences
│   ├── i18n/          # Internationalization
│   │   ├── config.js
│   │   └── locales/   # en.json, ko.json
│   ├── pages/         # Page components
│   │   ├── MenuPage.jsx
│   │   ├── GamePage.jsx
│   │   └── ResultsPage.jsx
│   ├── store/         # Redux store configuration
│   ├── styles/        # Global styles
│   ├── utils/         # Utility functions
│   ├── App.jsx        # Root component
│   └── main.jsx       # Entry point
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running at `http://localhost:8000` (or configure `VITE_API_BASE_URL`)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env to set your API URL if different from default
   ```

3. **Start development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open browser**:
   Navigate to `http://localhost:3000`

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

### Development Features

- **Hot Module Replacement (HMR)**: Instant updates without full reload
- **Redux DevTools**: Time-travel debugging in browser
- **React DevTools**: Component inspection and profiling
- **Vite Dev Server**: Lightning-fast development experience

### Key Development Patterns

**Component Structure**:
```jsx
// Functional components with hooks
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const MyComponent = () => {
  const dispatch = useDispatch();
  const data = useSelector(state => state.game.data);

  // Component logic

  return <div>...</div>;
};

export default MyComponent;
```

**Redux Actions**:
```javascript
// Dispatch async thunks
dispatch(executeGameAction({ gameId, actionCode }));

// Update local state
dispatch(setSelectedNode(nodeId));
```

**API Calls**:
```javascript
import { gameService } from '@/api/gameService';

const response = await gameService.getGameState(gameId);
```

**Translations**:
```javascript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<button>{t('common.start')}</button>
```

## Building for Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Preview build locally**:
   ```bash
   npm run preview
   ```

3. **Deploy**:
   The `dist` folder contains the production build. Deploy to:
   - AWS S3 + CloudFront
   - Vercel
   - Netlify
   - Any static hosting service

## Configuration

### API Endpoint

Set the backend API URL in `.env`:
```
VITE_API_BASE_URL=https://api.example.com/api
```

### TailwindCSS Theme

Customize colors and theme in `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      aws: {
        orange: '#FF9900',
        blue: '#232F3E',
      },
    },
  },
}
```

### Internationalization

Add new languages in `src/i18n/locales/`:
```javascript
// locales/es.json
{
  "common": {
    "start": "Comenzar",
    ...
  }
}
```

Then import in `src/i18n/config.js`:
```javascript
import esTranslations from './locales/es.json';

i18n.init({
  resources: {
    en: { translation: enTranslations },
    ko: { translation: koTranslations },
    es: { translation: esTranslations },
  },
});
```

## Game Features

### Interactive Diagram

- **Drag & Drop**: Add AWS services from palette to canvas
- **Connections**: Link services by dragging node handles
- **Zoom & Pan**: Navigate large architectures
- **Node Selection**: Click nodes to view details
- **React Flow**: Powered by React Flow library

### HUD Components

- **Resource Bar**: Real-time metrics (MAU, latency, security, cash)
- **Turn Counter**: Progress through 36 turns
- **Action Panel**: Available infrastructure actions
- **Event Log**: History of turn events
- **Metrics Chart**: Performance trends over time

### Event System

- **Major Events**: Every 3 turns (traffic surge, security audit, etc.)
- **Micro Events**: Random events each turn
- **Choice Dialogs**: Make strategic decisions with consequences

### Grading System

- **Bronze**: Basic completion (100K MAU, <400ms, >50 security)
- **Silver**: Strong performance (500K MAU, <250ms, >70 security)
- **Gold**: Excellence (1M MAU, <150ms, >85 security)

## Mobile Support

The UI is fully responsive:
- **Mobile (< 640px)**: Stacked layout, touch-friendly controls
- **Tablet (640-1024px)**: Mixed layout with collapsible sidebars
- **Desktop (> 1024px)**: Full three-column layout with all panels

Mobile-specific features:
- Touch gestures for diagram navigation
- Swipe-to-close modals
- Optimized button sizes (minimum 44x44px)
- Hamburger menus for navigation

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper semantic HTML and ARIA attributes
- **Screen Reader Support**: Descriptive labels and alt text
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color combinations

## Performance

Optimization techniques:
- **Code Splitting**: Lazy-loaded routes
- **Memoization**: React.memo for expensive components
- **Virtualization**: Long lists use virtual scrolling
- **Asset Optimization**: Compressed images and lazy loading
- **Bundle Analysis**: Vite bundle analyzer for size optimization

## Troubleshooting

**Port already in use**:
```bash
# Change port in vite.config.js
server: {
  port: 3001,
}
```

**API connection failed**:
- Verify backend is running
- Check CORS settings on backend
- Confirm API URL in `.env`

**Build errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Follow existing code style
2. Write meaningful commit messages
3. Test on multiple browsers and devices
4. Update documentation for new features

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## License

Educational project for learning AWS architecture.

## Resources

- [React Documentation](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Flow](https://reactflow.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30