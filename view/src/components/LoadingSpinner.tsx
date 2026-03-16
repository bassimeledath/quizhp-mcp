interface LoadingSpinnerProps {
  message: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
        />
        <p style={{ color: "var(--qz-text-secondary)" }}>{message}</p>
      </div>
    </div>
  );
}
