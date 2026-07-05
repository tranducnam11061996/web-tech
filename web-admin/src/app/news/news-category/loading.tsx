export default function Loading() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
        {/* Filter Skeleton */}
        <div className="h-16 w-full glass-panel rounded-lg animate-pulse" />
        
        {/* Table Skeleton */}
        <div className="flex-1 glass-panel rounded-lg animate-pulse bg-[#0a0a0f]/40">
          <div className="p-4 space-y-3">
            <div className="h-10 bg-gray-900/60 rounded" />
            <div className="h-10 bg-gray-900/50 rounded" />
            <div className="h-10 bg-gray-900/50 rounded" />
            <div className="h-10 bg-gray-900/50 rounded" />
            <div className="h-10 bg-gray-900/50 rounded" />
            <div className="h-10 bg-gray-900/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
