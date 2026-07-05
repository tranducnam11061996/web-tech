'use client';

import { PlusSquare, MinusSquare, CheckSquare, Square } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

export function TabCategory({ product, categories = [] }: { product?: any, categories?: any[] }) {
  // Parse initial selected categories
  const initialCatIds = useMemo(() => {
    const ids = (product?.product_cat || '').split(',').filter(Boolean).map(Number);
    return new Set<number>(ids);
  }, [product]);

  const [checkedIds, setCheckedIds] = useState<Set<number>>(initialCatIds);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  // Update when product changes
  useEffect(() => {
    setCheckedIds(initialCatIds);
  }, [initialCatIds]);

  // Build tree from flat categories
  const tree = useMemo(() => {
    const map = new Map();
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));
    const roots: any[] = [];
    categories.forEach(c => {
      if (c.parentId === 0) {
        roots.push(map.get(c.id));
      } else {
        const parent = map.get(c.parentId);
        if (parent) {
          parent.children.push(map.get(c.id));
        } else {
          // If parent not found, put it in root to avoid losing data
          roots.push(map.get(c.id));
        }
      }
    });
    return roots;
  }, [categories]);

  const catMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const toggleOpen = (id: number) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
  };

  const toggleCheck = (id: number) => {
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIds(next);
  };

  const isAllExpanded = openIds.size > 0 && openIds.size >= categories.filter(c => tree.some(r => c.id !== r.id)).length / 2; // Rough heuristic

  const handleExpandAll = () => {
    if (isAllExpanded) {
      setOpenIds(new Set());
    } else {
      setOpenIds(new Set(categories.map(c => c.id)));
    }
  };

  // Render tree recursively
  const renderTree = (nodes: any[]) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isOpen = openIds.has(node.id);
      const isChecked = checkedIds.has(node.id);

      return (
        <div key={node.id} className="flex flex-col">
          <div className="flex items-center gap-2 py-1 hover:bg-gray-800/30 rounded px-1 transition-colors">
            {hasChildren ? (
              <button onClick={() => toggleOpen(node.id)} className="text-gray-500 hover:text-gray-300">
                {isOpen ? <MinusSquare className="w-4 h-4" /> : <PlusSquare className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-4 h-4"></div>
            )}
            <button onClick={() => toggleCheck(node.id)} className="text-gray-400 hover:text-blue-400 transition-colors">
              {isChecked ? <CheckSquare className="w-4 h-4 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> : <Square className="w-4 h-4" />}
            </button>
            <span 
              className={isChecked ? "text-gray-200 font-medium cursor-pointer" : "text-gray-400 hover:text-gray-200 cursor-pointer"}
              onClick={() => toggleCheck(node.id)}
            >
              {node.name}
            </span>
          </div>
          
          {isOpen && hasChildren && (
            <div className="ml-6 border-l border-gray-800 pl-2 space-y-1 my-1">
              {renderTree(node.children)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
      
      {/* Current Categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          Hiện tại sản phẩm đang được đặt trong các danh mục sau:
        </h3>
        <div className="glass-panel border-gray-800 rounded-sm p-4 space-y-2 text-sm max-h-[500px] overflow-y-auto custom-scrollbar">
          {Array.from(checkedIds).map(id => {
            const name = catMap.get(id);
            if (!name) return null;
            return (
              <div key={id} className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium flex items-center gap-2 group" onClick={() => toggleCheck(id)}>
                <span>- {name}</span>
                <span className="text-gray-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">(Bỏ)</span>
              </div>
            );
          })}
          {checkedIds.size === 0 && (
            <div className="text-gray-500 italic">Sản phẩm chưa thuộc danh mục nào.</div>
          )}
        </div>
      </div>

      {/* Select Categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-500 rounded-full inline-block shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          Hãy chọn danh mục cho sản phẩm
        </h3>
        <button 
          onClick={handleExpandAll}
          className="px-3 py-1.5 text-xs font-bold text-blue-400 border border-blue-900 rounded-sm hover:bg-blue-900/30 transition-colors uppercase tracking-wider mb-2"
        >
          {isAllExpanded ? 'Thu gọn tất cả danh mục con' : 'Hiển thị tất cả danh mục con'}
        </button>
        
        <div className="glass-panel border-gray-800 rounded-sm p-4 h-[500px] overflow-y-auto custom-scrollbar text-sm">
          <div className="space-y-1">
            {renderTree(tree)}
          </div>
        </div>
      </div>

    </div>
  );
}
