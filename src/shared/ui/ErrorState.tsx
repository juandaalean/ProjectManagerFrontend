interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 font-medium" role="alert">
        {message}
      </p>
    </div>
  )
}
