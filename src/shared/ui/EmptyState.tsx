type EmptyStateProps = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
