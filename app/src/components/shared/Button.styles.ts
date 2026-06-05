/**
 * Professional Button Styles
 * OpenCode-inspired minimalist design constants
 */

// Enhance the existing button variants with professional styling
export const buttonStyles = {
  // Base button styles
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',

  // Size variants
  sizes: {
    xs: 'h-7 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-base',
    lg: 'h-10 px-5 text-base',
    xl: 'h-11 px-6 text-lg',
  },

  // Variant styles with professional color scheme
  variants: {
    default: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md',
    primary: 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200',
    danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 shadow-sm hover:shadow-md',
    ghost: 'text-gray-700 bg-transparent hover:bg-gray-100 hover:text-gray-900',
    link: 'text-blue-600 underline-offset-2 hover:underline',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700',
  },

  // State styles
  states: {
    focus: 'ring-2 ring-blue-500 ring-offset-2',
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'cursor-wait relative',
  },
};

// Professional icon button styles
export const iconButtonStyles = {
  base: 'inline-flex items-center justify-center rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  sizes: {
    xs: 'w-7 h-7',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-10 h-10',
  },
  variants: {
    default: 'text-gray-700 hover:bg-gray-100 border border-transparent',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'text-red-600 hover:bg-red-50',
    ghost: 'text-gray-500 hover:bg-gray-100',
  },
};

