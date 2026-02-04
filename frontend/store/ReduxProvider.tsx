/**
 * Redux Provider Component
 *
 * Wraps the app with Redux store provider
 */

'use client';

import { Provider } from 'react-redux';
import { store } from './index';

/**
 * Redux Provider for Next.js App Router
 *
 * Usage:
 * ```tsx
 * // app/layout.tsx
 * import ReduxProvider from '@/store/ReduxProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ReduxProvider>
 *           {children}
 *         </ReduxProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>{children}</Provider>;
}
