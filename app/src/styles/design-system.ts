/**
 * Professional Design System for OpenSkynet Desktop
 * Inspired by OpenCode's minimalist, professional design language
 */

/* ===== COLOR SYSTEM ===== */
export const colors = {
  // Primary colors - professional blues
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Accent colors - subtle highlights
  accent: {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    green: '#10b981',
    rose: '#f43f5e',
    cyan: '#06b6d4',
  },

  // Neutral colors - sophisticated grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Semantic colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Background colors
  background: {
    default: '#ffffff',
    muted: '#f9fafb',
    elevated: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
    'overlay-hover': 'rgba(0, 0, 0, 0.7)',
  },

  // Border colors
  border: {
    default: '#e5e7eb',
    muted: '#f3f4f6',
    strong: '#d1d5db',
    focus: '#3b82f6',
  },

  // Text colors
  text: {
    primary: '#09090b',
    secondary: '#525252',
    muted: '#737373',
    inverse: '#ffffff',
  },
};

/* ===== TYPOGRAPHY SYSTEM ===== */
export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

/* ===== SPACING SYSTEM ===== */
export const spacing = {
  unit: 4, // Base unit in pixels

  // Predefined spacing values
  xs: '4px',    // 1 unit
  sm: '8px',    // 2 units
  md: '16px',   // 4 units
  lg: '24px',   // 6 units
  xl: '32px',   // 8 units
  '2xl': '48px', // 12 units
  '3xl': '64px', // 16 units
  '4xl': '96px', // 24 units
  '5xl': '128px', // 32 units
};

/* ===== BORDER RADIUS ===== */
export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

/* ===== SHADOW SYSTEM ===== */
export const shadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

/* ===== Z-INDEX LAYERS ===== */
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

/* ===== TRANSITION TIMING ===== */
export const transition = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

/* ===== BREAKPOINTS ===== */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/* ===== CSS VARIABLES FOR TAILWIND ===== */
export const cssVariables = `
:root {
  /* Colors */
  --color-primary-50: ${colors.primary[50]};
  --color-primary-500: ${colors.primary[500]};
  --color-primary-600: ${colors.primary[600]};
  --color-primary-700: ${colors.primary[700]};

  --color-neutral-50: ${colors.neutral[50]};
  --color-neutral-100: ${colors.neutral[100]};
  --color-neutral-200: ${colors.neutral[200]};
  --color-neutral-300: ${colors.neutral[300]};
  --color-neutral-400: ${colors.neutral[400]};
  --color-neutral-500: ${colors.neutral[500]};
  --color-neutral-600: ${colors.neutral[600]};
  --color-neutral-700: ${colors.neutral[700]};
  --color-neutral-800: ${colors.neutral[800]};
  --color-neutral-900: ${colors.neutral[900]};

  /* Semantic colors */
  --color-success: ${colors.semantic.success};
  --color-warning: ${colors.semantic.warning};
  --color-error: ${colors.semantic.error};
  --color-info: ${colors.semantic.info};

  /* Backgrounds */
  --color-bg-default: ${colors.background.default};
  --color-bg-muted: ${colors.background.muted};
  --color-bg-elevated: ${colors.background.elevated};

  /* Borders */
  --color-border-default: ${colors.border.default};
  --color-border-muted: ${colors.border.muted};
  --color-border-strong: ${colors.border.strong};

  /* Text */
  --color-text-primary: ${colors.text.primary};
  --color-text-secondary: ${colors.text.secondary};
  --color-text-muted: ${colors.text.muted};

  /* Spacing */
  --spacing-xs: ${spacing.xs};
  --spacing-sm: ${spacing.sm};
  --spacing-md: ${spacing.md};
  --spacing-lg: ${spacing.lg};

  /* Border radius */
  --radius-sm: ${borderRadius.sm};
  --radius-base: ${borderRadius.base};
  --radius-md: ${borderRadius.md};
  --radius-lg: ${borderRadius.lg};

  /* Shadows */
  --shadow-sm: ${shadow.sm};
  --shadow-base: ${shadow.base};
  --shadow-md: ${shadow.md};
  --shadow-lg: ${shadow.lg};

  /* Z-index */
  --z-dropdown: ${zIndex.dropdown};
  --z-modal: ${zIndex.modal};
  --z-tooltip: ${zIndex.tooltip};

  /* Transitions */
  --transition-fast: ${transition.fast};
  --transition-base: ${transition.base};
  --transition-slow: ${transition.slow};
}
`;

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadow,
  zIndex,
  transition,
  breakpoints,
  cssVariables,
};
