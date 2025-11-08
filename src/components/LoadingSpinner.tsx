/**
 * Loading Spinner (Production-Ready)
 * 
 * Used in both environments
 * More visible in PROD AWS due to network latency
 */

export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div 
        className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`} 
      />
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};
