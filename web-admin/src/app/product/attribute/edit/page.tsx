import { AttributeEditTabs } from '@/components/attribute/edit/AttributeEditTabs';

export default function AttributeEditPage() {
  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0 bg-gray-950/30 rounded-lg border border-gray-800/60 shadow-xl overflow-hidden backdrop-blur-xl">
        <AttributeEditTabs />
      </div>
    </div>
  );
}
