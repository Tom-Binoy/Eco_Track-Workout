export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-sm text-gray-600">Thinking...</span>
    </div>
  );
}
