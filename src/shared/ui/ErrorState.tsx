interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="alert alert-error">
      <span role="alert">{message}</span>
    </div>
  )
}
