interface TaskStatusDotProps {
  label: string
  className: string
}

export function TaskStatusDot({ label, className }: TaskStatusDotProps) {
  return (
    <span
      className="inline-flex max-w-40 cursor-default items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-base-100 px-2 shadow-sm"
      aria-label={label}
      role="img"
      tabIndex={0}
      title={label}
    >
      <span className={className} aria-hidden="true" />
      <span className="text-[11px] font-medium text-base-content">{label}</span>
    </span>
  )
}
