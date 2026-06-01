interface TaskStatusDotProps {
  label: string
  className: string
  expanded?: boolean
}

export function TaskStatusDot({ label, className, expanded = false }: TaskStatusDotProps) {
  const containerClassName = expanded
    ? 'group inline-flex max-w-40 cursor-default items-center overflow-hidden whitespace-nowrap rounded-full border border-base-100 px-2 shadow-sm'
    : 'group inline-flex max-w-4 cursor-default items-center overflow-hidden whitespace-nowrap rounded-full border border-base-100 shadow-sm transition-[max-width,padding] duration-200 ease-out hover:max-w-40 hover:px-2 focus-visible:max-w-40 focus-visible:px-2'

  const labelClassName = expanded
    ? 'ml-2 text-[11px] font-medium text-base-content'
    : 'ml-2 max-w-0 overflow-hidden text-[11px] font-medium text-base-content opacity-0 transition-[max-width,opacity] duration-150 group-hover:max-w-32 group-hover:opacity-100 group-focus-visible:max-w-32 group-focus-visible:opacity-100'

  return (
    <span
      className={containerClassName}
      aria-label={label}
      role="img"
      tabIndex={0}
      title={label}
    >
      <span className={className} aria-hidden="true" />
      <span className={labelClassName}>
        {label}
      </span>
    </span>
  )
}