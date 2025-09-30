# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:3000
```

## Project Architecture

### State Management Flow

```
User Action → Component → Redux Action → Thunk/API → State Update → Re-render
```

Example:
```javascript
// 1. User clicks "End Turn" button
<Button onClick={handleEndTurn}>End Turn</Button>

// 2. Component dispatches action
const handleEndTurn = () => {
  dispatch(endGameTurn(gameId));
};

// 3. Thunk makes API call
export const endGameTurn = createAsyncThunk(
  'game/endTurn',
  async (gameId) => {
    const response = await gameService.endTurn(gameId);
    return response;
  }
);

// 4. State updates
builder.addCase(endGameTurn.fulfilled, (state, action) => {
  state.state = action.payload.state;
});

// 5. Component re-renders with new state
const gameState = useSelector(state => state.game.state);
```

### Component Hierarchy

```
App
├── MenuPage
├── GamePage
│   ├── ResourceBar
│   ├── TurnCounter
│   ├── NodePalette
│   ├── DiagramCanvas
│   │   └── ServiceNode (multiple)
│   ├── ActionPanel
│   ├── EventLog
│   └── Modals
│       ├── EventDialog
│       └── TurnSummaryDialog
└── ResultsPage
    └── MetricsChart
```

## Adding New Features

### 1. New Action Type

**Step 1**: Add to constants
```javascript
// src/utils/constants.js
export const AWS_SERVICES = {
  ...existing,
  lambda: { name: 'Lambda', icon: 'Zap', category: 'compute' },
};
```

**Step 2**: Add translation
```json
// src/i18n/locales/en.json
{
  "actions": {
    "enable_lambda": "Enable Lambda"
  }
}
```

**Step 3**: Handle in ActionPanel
```javascript
// Component automatically picks up from availableActions prop
```

### 2. New Metric

**Step 1**: Add to ResourceBar
```javascript
// src/components/hud/ResourceBar.jsx
<MetricItem
  icon={NewIcon}
  label={t('metrics.newMetric')}
  value={gameState.newMetric}
  tooltip={t('tooltips.newMetric')}
/>
```

**Step 2**: Add thresholds
```javascript
// src/utils/constants.js
export const METRIC_THRESHOLDS = {
  newMetric: {
    excellent: 100,
    good: 75,
    warning: 50,
    critical: 25,
  },
};
```

### 3. New Event Type

**Step 1**: Backend implements event
**Step 2**: Frontend handles in EventDialog (automatic)
**Step 3**: Add specific styling if needed

### 4. New Page

**Step 1**: Create page component
```javascript
// src/pages/NewPage.jsx
const NewPage = () => {
  return <div>New Page</div>;
};

export default NewPage;
```

**Step 2**: Add route
```javascript
// src/App.jsx
<Route path="/new" element={<NewPage />} />
```

## Testing

### Manual Testing Checklist

**Game Flow**:
- [ ] Start new game
- [ ] Execute actions
- [ ] End turn
- [ ] Handle events
- [ ] View results

**UI/UX**:
- [ ] Responsive on mobile/tablet/desktop
- [ ] Keyboard shortcuts work (E for end turn)
- [ ] Tooltips display correctly
- [ ] Modals open/close properly
- [ ] Toast notifications appear

**Internationalization**:
- [ ] Switch language (EN/KO)
- [ ] All text translates
- [ ] No missing translation keys

**Edge Cases**:
- [ ] Insufficient funds
- [ ] Network errors
- [ ] Invalid actions
- [ ] Game over conditions

### Unit Testing (Future)

```javascript
// Example test structure
import { render, screen } from '@testing-library/react';
import ResourceBar from '@/components/hud/ResourceBar';

test('displays metrics correctly', () => {
  const gameState = {
    mau: 10000,
    latency_ms: 200,
    security: 75,
    cash: 500,
    burn_monthly: 50,
  };

  render(<ResourceBar gameState={gameState} />);

  expect(screen.getByText('10,000')).toBeInTheDocument();
  expect(screen.getByText('200ms')).toBeInTheDocument();
});
```

## Performance Optimization

### Code Splitting

```javascript
// Lazy load pages
const GamePage = lazy(() => import('./pages/GamePage'));

<Suspense fallback={<Loading />}>
  <GamePage />
</Suspense>
```

### Memoization

```javascript
// Prevent unnecessary re-renders
const MemoizedComponent = React.memo(ExpensiveComponent);

// Memoize expensive computations
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### Virtual Scrolling

```javascript
// For long event logs
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={events.length}
  itemSize={50}
>
  {EventRow}
</FixedSizeList>
```

## Debugging Tips

### Redux DevTools

```javascript
// Time travel debugging
1. Open Redux DevTools in browser
2. See all actions dispatched
3. Jump to any previous state
4. Export/import state for testing
```

### React DevTools

```javascript
// Inspect components
1. Open React DevTools
2. Select component
3. View props and state
4. Profile performance
```

### Network Debugging

```javascript
// Axios interceptor logging
apiClient.interceptors.request.use((config) => {
  console.log('Request:', config);
  return config;
});

apiClient.interceptors.response.use((response) => {
  console.log('Response:', response);
  return response;
});
```

### Common Issues

**State not updating**:
- Check Redux DevTools for action dispatch
- Verify reducer is handling action
- Ensure component is connected to store

**API call failing**:
- Check network tab for request/response
- Verify backend is running
- Check CORS settings

**Component not re-rendering**:
- Ensure state is properly immutable
- Check dependencies in useEffect/useMemo
- Verify selector is returning new reference

## Code Style

### Component Structure

```javascript
// 1. Imports
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Button from '@/components/common/Button';

// 2. Component
const MyComponent = ({ prop1, prop2 }) => {
  // 3. Hooks
  const dispatch = useDispatch();
  const [state, setState] = useState();

  // 4. Event handlers
  const handleClick = () => {
    // ...
  };

  // 5. Render
  return (
    <div>
      <Button onClick={handleClick}>Click</Button>
    </div>
  );
};

// 6. Export
export default MyComponent;
```

### Naming Conventions

- Components: PascalCase (`ResourceBar.jsx`)
- Functions: camelCase (`handleEndTurn`)
- Constants: UPPER_SNAKE_CASE (`MAX_TURNS`)
- CSS classes: kebab-case (via TailwindCSS)

### File Organization

```
feature/
├── FeatureComponent.jsx    # Main component
├── FeatureItem.jsx          # Sub-component
├── featureSlice.js          # Redux slice
├── featureService.js        # API service
└── featureUtils.js          # Utilities
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-metric

# Make changes
git add .
git commit -m "feat: add new metric display"

# Push
git push origin feature/new-metric

# Create PR
```

### Commit Message Format

```
type(scope): subject

feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructure
test: add tests
chore: maintenance
```

## Deployment

### Environment Variables

```bash
# .env.production
VITE_API_BASE_URL=https://api.production.com/api
```

### Build

```bash
# Build for production
npm run build

# Output in dist/
# Deploy dist/ folder to hosting service
```

### AWS S3 Deployment

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## Resources

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [TailwindCSS Docs](https://tailwindcss.com/)
- [React Flow Docs](https://reactflow.dev/)