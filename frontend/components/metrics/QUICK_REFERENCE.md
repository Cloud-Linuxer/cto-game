# TrustGauge Quick Reference Card

## Import

```typescript
import TrustGauge from '@/components/metrics/TrustGauge';
// or
import { TrustGauge } from '@/components/metrics';
```

## Basic Usage

```tsx
<TrustGauge
  trust={gameState.trust}
  difficultyMode="NORMAL"
  vertical={true}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trust` | `number` | - | 신뢰도 값 (0-100) **Required** |
| `difficultyMode` | `'EASY' \| 'NORMAL' \| 'HARD'` | `'NORMAL'` | 난이도 모드 |
| `className` | `string` | `''` | 추가 CSS 클래스 |
| `vertical` | `boolean` | `false` | 세로 레이아웃 여부 |

## Color Zones

| Range | Color | Status | Animation |
|-------|-------|--------|-----------|
| 70-100% | Green | 안정적 신뢰 | - |
| 50-69% | Blue | 보통 | - |
| 30-49% | Yellow | 주의 필요 | - |
| 15-29% | Orange | 위기 경고 | - |
| 0-14% | Red | 즉시 대응! | Pulse |

## Thresholds by Difficulty

| Difficulty | Series C | Series B | Series A | Game Over |
|------------|----------|----------|----------|-----------|
| EASY | 55% | 35% | 20% | 5% |
| NORMAL | 65% | 45% | 25% | 10% |
| HARD | 75% | 55% | 35% | 15% |

## Layout Examples

### Desktop (Vertical)

```tsx
<div className="bg-white p-5 rounded-xl shadow-lg">
  <TrustGauge
    trust={gameState.trust}
    difficultyMode={gameState.difficultyMode}
    vertical={true}
  />
</div>
```

**Size**: Height ~224px

### Mobile (Horizontal)

```tsx
<div className="min-w-[200px] px-3 py-2 bg-purple-50 rounded-lg">
  <TrustGauge
    trust={gameState.trust}
    difficultyMode={gameState.difficultyMode}
    vertical={false}
  />
</div>
```

**Size**: Height ~32px

## Common Patterns

### With Dynamic Difficulty

```tsx
const mode = gameState.difficultyMode || 'NORMAL';

<TrustGauge
  trust={gameState.trust}
  difficultyMode={mode}
  vertical={true}
/>
```

### With Custom Styling

```tsx
<TrustGauge
  trust={gameState.trust}
  difficultyMode="HARD"
  vertical={false}
  className="my-4 shadow-xl"
/>
```

### Conditional Rendering

```tsx
{gameState.trust < 30 && (
  <div className="bg-red-50 p-4 rounded-lg">
    <p className="text-red-700 font-bold mb-2">⚠️ 신뢰도 위기!</p>
    <TrustGauge
      trust={gameState.trust}
      difficultyMode={gameState.difficultyMode}
      vertical={false}
    />
  </div>
)}
```

## Test Scenarios

```tsx
// Safe zone
<TrustGauge trust={85} difficultyMode="NORMAL" />

// Series C threshold
<TrustGauge trust={65} difficultyMode="NORMAL" />

// Series B threshold
<TrustGauge trust={45} difficultyMode="NORMAL" />

// Series A threshold
<TrustGauge trust={25} difficultyMode="NORMAL" />

// Danger zone (with pulse)
<TrustGauge trust={10} difficultyMode="NORMAL" />

// Critical (game over risk)
<TrustGauge trust={5} difficultyMode="NORMAL" />
```

## Animations

- **Transition**: 500ms ease when trust value changes
- **Pulse**: Activated when trust < 15%
- **Shimmer**: Always active on gauge fill

## Accessibility

- Color + text status message (color-blind friendly)
- Clear threshold markers
- Sufficient contrast ratios (WCAG AA)
- Semantic HTML structure

## Performance

- Uses `useMemo` for zone/threshold calculations
- GPU-accelerated CSS transitions
- Minimal re-renders (only on prop changes)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Troubleshooting

### Gauge not showing
- Check `trust` prop is a valid number (0-100)
- Ensure component is imported correctly

### Thresholds at wrong positions
- Verify `difficultyMode` prop matches game state
- Check backend constants alignment

### Animations not working
- Ensure no CSS conflicts with transitions
- Check browser dev tools for errors

### Layout issues
- Use `vertical` prop appropriately for context
- Ensure parent container has sufficient space

## Files

- **Component**: `/home/cto-game/frontend/components/metrics/TrustGauge.tsx`
- **Docs**: `/home/cto-game/frontend/components/metrics/README.md`
- **Test Page**: `/home/cto-game/frontend/app/test/trust-gauge/page.tsx`

## Test Page

**Local**: http://localhost:3001/test/trust-gauge
**Public**: https://labor-value-cds-hobbies.trycloudflare.com/test/trust-gauge

## Version

**1.0.0** - Initial release (2026-02-04)
