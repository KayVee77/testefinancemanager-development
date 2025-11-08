/**
 * Skeleton Loader (Production-Ready)
 * 
 * Shows loading placeholders for content
 * Used in both environments
 */

export const SkeletonLoader: React.FC<{
  count?: number;
  type?: 'transaction' | 'card' | 'chart';
}> = ({ count = 3, type = 'transaction' }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-lg">
          {type === 'transaction' && (
            <div className="p-4 flex justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-300 rounded w-1/2" />
              </div>
              <div className="h-4 bg-gray-300 rounded w-16" />
            </div>
          )}
          
          {type === 'card' && (
            <div className="p-6">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-300 rounded w-3/4" />
            </div>
          )}
          
          {type === 'chart' && (
            <div className="p-6">
              <div className="h-48 bg-gray-300 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
