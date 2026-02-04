/**
 * Event Popup Animation Variants
 *
 * Framer Motion animation configurations for EventPopup components
 * - Backdrop blur animation
 * - Popup entrance/exit
 * - Choice stagger animations
 * - Selection highlight effects
 * - Icon animations for event types
 */

import { Variants, Transition } from 'framer-motion';

// ---------------------------------------------------------------------------
// Backdrop (배경 블러)
// ---------------------------------------------------------------------------

/**
 * Background blur overlay animation
 * - Entrance: 200ms ease-in
 * - Exit: 200ms ease-out
 */
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// ---------------------------------------------------------------------------
// Popup (팝업)
// ---------------------------------------------------------------------------

/**
 * Popup container animation
 * - Entrance: Scale 0.8 → 1.0, Opacity 0 → 1, Y 50 → 0 (300ms)
 * - Exit: Scale 1.0 → 0.9, Opacity 1 → 0, Y 0 → -20 (300ms)
 */
export const popupVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// ---------------------------------------------------------------------------
// Header (헤더)
// ---------------------------------------------------------------------------

/**
 * Header fade-in animation
 * - Entrance: Opacity 0 → 1 (200ms) after 100ms delay
 */
export const headerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
};

// ---------------------------------------------------------------------------
// Content (본문)
// ---------------------------------------------------------------------------

/**
 * Content fade-in animation
 * - Entrance: Opacity 0 → 1, Y 10 → 0 (200ms) after 150ms delay
 */
export const contentVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      delay: 0.15,
    },
  },
};

// ---------------------------------------------------------------------------
// Choices (선택지)
// ---------------------------------------------------------------------------

/**
 * Choice cards stagger animation
 * - Each card appears sequentially with 50ms delay
 * - Entrance: Opacity 0 → 1, X -20 → 0 (200ms)
 *
 * Usage:
 * ```tsx
 * <motion.div
 *   custom={index}
 *   variants={choiceVariants}
 *   initial="hidden"
 *   animate="visible"
 * >
 * ```
 */
export const choiceVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.2 + index * 0.05, // Base 200ms + 50ms per card
      duration: 0.2,
      ease: 'easeOut',
    },
  }),
};

/**
 * Choice container with stagger children
 * - Parent animation that staggers child elements
 */
export const choiceListVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

// ---------------------------------------------------------------------------
// Selection (선택 후 하이라이트)
// ---------------------------------------------------------------------------

/**
 * Selected choice highlight animation
 * - Scale: 1 → 1.02
 * - Box shadow: None → Blue glow
 * - Duration: 500ms
 */
export const selectedVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
  },
  selected: {
    scale: 1.02,
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)',
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

/**
 * Pulse animation for selected choice
 * - Repeating scale animation
 */
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ---------------------------------------------------------------------------
// Icon Animations (이벤트 타입별 아이콘)
// ---------------------------------------------------------------------------

/**
 * Icon entrance animation
 * - Rotate + bounce effect
 */
export const iconEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
};

/**
 * CRISIS event icon animation
 * - Shake effect (rotation oscillation)
 */
export const crisisIconVariants: Variants = {
  initial: {
    rotate: 0,
  },
  animate: {
    rotate: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

/**
 * OPPORTUNITY event icon animation
 * - Glow pulse effect
 */
export const opportunityIconVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    filter: [
      'brightness(1) drop-shadow(0 0 0px rgba(74, 222, 128, 0))',
      'brightness(1.2) drop-shadow(0 0 8px rgba(74, 222, 128, 0.8))',
      'brightness(1) drop-shadow(0 0 0px rgba(74, 222, 128, 0))',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * RANDOM event icon animation
 * - Rotate continuously (dice roll)
 */
export const randomIconVariants: Variants = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * CHAIN event icon animation
 * - Swing left-right
 */
export const chainIconVariants: Variants = {
  animate: {
    rotate: [-15, 15],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
};

/**
 * SEASONAL event icon animation
 * - Sparkle effect (opacity + scale)
 */
export const seasonalIconVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ---------------------------------------------------------------------------
// Loading (로딩 스피너)
// ---------------------------------------------------------------------------

/**
 * Loading spinner rotation
 */
export const spinnerVariants: Variants = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ---------------------------------------------------------------------------
// Error Message (에러 메시지)
// ---------------------------------------------------------------------------

/**
 * Error message shake animation
 */
export const errorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      y: { duration: 0.2 },
      x: { duration: 0.5 },
    },
  },
};

// ---------------------------------------------------------------------------
// Transition Presets (전환 효과 프리셋)
// ---------------------------------------------------------------------------

/**
 * Spring transition preset
 * - Bouncy effect for entrances
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

/**
 * Smooth transition preset
 * - Smooth easing for exits
 */
export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // cubic-bezier
};

/**
 * Fast transition preset
 * - Quick animations
 */
export const fastTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

// ---------------------------------------------------------------------------
// Animation Timing Constants
// ---------------------------------------------------------------------------

/**
 * Animation timing configuration
 */
export const ANIMATION_TIMING = {
  backdrop: 200, // ms
  popup: 300,
  header: 200,
  content: 200,
  choice: 200,
  choiceStagger: 50,
  selected: 500,
  icon: 500,
  spinner: 1000,
  error: 200,
} as const;

/**
 * Animation delay configuration
 */
export const ANIMATION_DELAYS = {
  header: 100, // ms
  content: 150,
  choices: 200,
} as const;
