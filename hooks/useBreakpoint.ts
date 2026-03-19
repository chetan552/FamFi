import { useWindowDimensions, Platform } from 'react-native';
import { breakpoints, contentMaxWidth, sidebarWidth } from '@/constants/theme';

export interface Breakpoint {
  /** Raw window width */
  width: number;
  /** True on web when width ≥ md (768px) — shows sidebar + wide layout */
  isDesktop: boolean;
  /** True on web when width ≥ lg (1024px) — wider content / more columns */
  isWide: boolean;
  /**
   * Max-width for content areas on desktop.
   * Accounts for the sidebar on the parent layout.
   */
  contentMaxWidth: number;
  /** Number of columns to use in grids (2 on mobile, 3 on tablet, 4 on desktop) */
  gridColumns: number;
}

/**
 * Responsive breakpoint hook.
 * Returns layout hints derived from the current window width.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && width >= breakpoints.md;
  const isWide    = Platform.OS === 'web' && width >= breakpoints.lg;

  // On desktop, the sidebar takes 240px; cap content at contentMaxWidth
  const availableWidth = isDesktop ? width - sidebarWidth : width;
  const cappedWidth    = Math.min(availableWidth, contentMaxWidth);

  const gridColumns = isWide ? 4 : isDesktop ? 3 : 2;

  return {
    width,
    isDesktop,
    isWide,
    contentMaxWidth: cappedWidth,
    gridColumns,
  };
}
