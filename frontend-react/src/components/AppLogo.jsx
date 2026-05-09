/**
 * Shared Leave Desk wordmark + favicon mark (public/leavedesk.svg)
 */
const AppLogo = ({
  inverse = false,
  compact = false,
  titleClassName,
  className = '',
}) => {
  const icon = compact ? 'h-7 w-7' : 'h-9 w-9';
  const w = compact ? 28 : 36;
  const h = compact ? 28 : 36;
  const defaultTitle =
    inverse
      ? 'text-white font-semibold text-lg tracking-tight'
      : compact
        ? 'font-semibold text-slate-900 dark:text-white text-sm'
        : 'font-bold text-base text-slate-900 dark:text-white';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/leavedesk.svg"
        alt=""
        aria-hidden="true"
        width={w}
        height={h}
        draggable={false}
        className={`${icon} flex-shrink-0 rounded-lg shadow-sm`}
      />
      <span className={titleClassName ?? defaultTitle}>Leave Desk</span>
    </span>
  );
};

export default AppLogo;
