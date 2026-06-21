/**
 * SkipLink — WCAG 2.1 AA skip navigation link.
 *
 * Visually hidden by default. Becomes visible on keyboard focus,
 * allowing keyboard and screen reader users to skip repetitive navigation.
 */
export const SkipLink = () => (
  <a
    href="#main-content"
    className="
      sr-only focus:not-sr-only
      focus:absolute focus:top-4 focus:left-4 focus:z-50
      focus:bg-primary-700 focus:text-white
      focus:px-4 focus:py-2 focus:rounded-md
      focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
      transition-all duration-150
    "
  >
    Skip to main content
  </a>
);
