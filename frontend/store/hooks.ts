/**
 * Typed Redux Hooks
 *
 * Pre-typed versions of useDispatch and useSelector
 */

import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

/**
 * Typed useDispatch hook
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Typed useSelector hook
 */
export const useAppSelector = useSelector.withTypes<RootState>();
