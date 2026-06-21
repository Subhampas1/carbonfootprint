/**
 * LoadingSpinner — accessible animated loading indicator.
 *
 * Uses role="status" and aria-label so screen readers announce
 * the loading state without requiring visible text.
 */

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export const LoadingSpinner = ({ label = 'Loading...', size = 'md' }: LoadingSpinnerProps) => (
  <div role="status" aria-label={label} className="flex items-center gap-2">
    <svg
      className={`animate-spin ${sizeMap[size]} text-primary-600`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);
