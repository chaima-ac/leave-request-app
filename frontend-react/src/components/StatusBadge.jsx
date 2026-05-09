const STATUS_CONFIG = {
  pending_manager: {
    style: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'Pending manager', dot: 'bg-amber-400',
  },
  pending_hr: {
    style: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Pending HR', dot: 'bg-blue-400',
  },
  approved: {
    style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Approved', dot: 'bg-emerald-500',
  },
  rejected_manager: {
    style: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: 'Rejected (manager)', dot: 'bg-red-500',
  },
  rejected_hr: {
    style: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: 'Rejected (HR)', dot: 'bg-red-600',
  },
  cancelled: {
    style: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    label: 'Cancelled', dot: 'bg-slate-400',
  },
};

const DEFAULT = {
  style: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  label: 'Unknown', dot: 'bg-gray-400',
};

const StatusBadge = ({ status, showDot = true }) => {
  const config = STATUS_CONFIG[status?.toLowerCase() || ''] || DEFAULT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.style}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;