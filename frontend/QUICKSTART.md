# Quick Start Guide

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm, yarn, or pnpm**
- **Backend API** running at `http://localhost:8000`

## 5-Minute Setup

### 1. Install Dependencies (2 minutes)

```bash
cd frontend
npm install
```

### 2. Configure Environment (30 seconds)

```bash
# Create .env file
cp .env.example .env

# Edit .env if backend URL is different
# VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. Start Development Server (30 seconds)

```bash
npm run dev
```

Expected output:
```
  VITE v5.1.4  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 4. Open Browser (1 minute)

Navigate to: **http://localhost:3000**

You should see the AWS CTO Strategy Game main menu.

### 5. Play the Game! (1 minute)

1. Click **"New Game"**
2. Wait for game to initialize
3. See the game board with AWS infrastructure diagram
4. Execute actions (add EC2, enable services)
5. Click **"End Turn"** to progress
6. Handle events when they appear

## Troubleshooting

### Port 3000 Already in Use

```bash
# Edit vite.config.js and change port
server: {
  port: 3001,  // Change this
}
```

### Backend Connection Failed

1. Verify backend is running:
   ```bash
   curl http://localhost:8000/api/games
   ```

2. Check CORS settings on backend
3. Verify API URL in `.env`

### Dependencies Won't Install

```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
```

### Browser Shows Blank Screen

1. Open browser console (F12)
2. Look for error messages
3. Common issues:
   - Missing `.env` file
   - Wrong API URL
   - Backend not running

## Development Workflow

### Hot Reload

Edit any file in `src/` and save - changes appear instantly in browser.

### Redux DevTools

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools)
2. Open DevTools (F12)
3. Click "Redux" tab
4. See all state and actions

### React DevTools

1. Install [React DevTools Extension](https://react.dev/learn/react-developer-tools)
2. Open DevTools (F12)
3. Click "Components" tab
4. Inspect component tree

## Common Tasks

### Add New Translation

```bash
# Edit src/i18n/locales/en.json
{
  "myNewKey": "My new text"
}

# Use in component
const { t } = useTranslation();
<div>{t('myNewKey')}</div>
```

### Add New Redux State

```bash
# Edit src/features/game/gameSlice.js
// Add to initialState
newField: null,

// Add reducer
setNewField: (state, action) => {
  state.newField = action.payload;
}

# Use in component
const newField = useSelector(state => state.game.newField);
dispatch(setNewField('value'));
```

### Add New Component

```bash
# Create src/components/myFeature/MyComponent.jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <div>{t('common.hello')}</div>;
};

export default MyComponent;

# Use it
import MyComponent from '@/components/myFeature/MyComponent';
<MyComponent />
```

## Building for Production

```bash
# Build
npm run build

# Preview build
npm run preview

# Output in dist/ folder
ls -la dist/
```

## Testing Checklist

Before committing changes:

- [ ] App starts without errors
- [ ] Can create new game
- [ ] Can execute actions
- [ ] Can end turn
- [ ] Events display correctly
- [ ] Translations work
- [ ] No console errors
- [ ] Responsive on mobile

## Getting Help

1. Check **README.md** for full documentation
2. Check **DEVELOPMENT.md** for detailed dev guide
3. Check browser console for errors
4. Check Redux DevTools for state issues
5. Check Network tab for API issues

## Next Steps

1. Read **DEVELOPMENT.md** for architecture details
2. Explore components in `src/components/`
3. Understand Redux flow in `src/features/`
4. Add new features following existing patterns

---

**Time to First Render**: ~5 minutes
**Time to Understanding**: ~30 minutes
**Time to Contributing**: ~1 hour