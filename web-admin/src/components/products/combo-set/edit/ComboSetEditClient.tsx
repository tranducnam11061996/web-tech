'use client';

import { useState } from 'react';
import { Save, X, Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductSelectModal } from '@/components/shared/ProductSelectModal';
import {
  comboEndTimeMode,
  defaultLimitedEndTime,
  formatComboDatetimeLocal,
  parseComboDatetimeLocal,
  resolveComboEndTime,
  type ComboEndTimeMode,
} from './comboSetTime';
import { normalizeComboNumericText, prependComboItem } from './comboSetEditorState';

type ProductConfig = {
  title: string;
  real_id: string;
  discount: string;
  discount_type: 'percent' | 'fixed';
};

type GroupConfig = {
  title: string;
  suggest_list: ProductConfig[];
};

export function ComboSetEditClient({ initialData, isNew }: { initialData: any, isNew: boolean }) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    status: initialData.status.toString(),
    from_time: initialData.from_time ? formatComboDatetimeLocal(initialData.from_time) : '',
    to_time: initialData.to_time ? formatComboDatetimeLocal(initialData.to_time) : '',
  });
  const [endTimeMode, setEndTimeMode] = useState<ComboEndTimeMode>(
    comboEndTimeMode(Number(initialData.to_time || 0)),
  );
  const [endTimeError, setEndTimeError] = useState('');

  const parsedConfig: GroupConfig[] = initialData.parsedConfig || [];
  const [configGroups, setConfigGroups] = useState<GroupConfig[]>(parsedConfig);
  
  const [expandedGroups, setExpandedGroups] = useState<boolean[]>(
    parsedConfig.length === 1 ? [true] : new Array(parsedConfig.length || 0).fill(false)
  );

  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<{gIdx: number, pIdx: number} | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const toggleGroup = (idx: number) => {
    const newExpanded = [...expandedGroups];
    newExpanded[idx] = !newExpanded[idx];
    setExpandedGroups(newExpanded);
  };

  const handleAddGroup = () => {
    setConfigGroups((current) => prependComboItem(current, { title: 'Nhóm sản phẩm mới', suggest_list: [] }));
    setExpandedGroups((current) => prependComboItem(current, true));
  };

  const handleRemoveGroup = (idx: number) => {
    const newGroups = [...configGroups];
    newGroups.splice(idx, 1);
    setConfigGroups(newGroups);
    
    const newExpanded = [...expandedGroups];
    newExpanded.splice(idx, 1);
    setExpandedGroups(newExpanded);
  };

  const handleOpenProductModal = (groupIndex: number) => {
    setActiveGroupIndex(groupIndex);
    setIsModalOpen(true);
  };

  const handleProductsSelected = (selectedProducts: any[]) => {
    if (activeGroupIndex === null) return;
    
    const newGroups = [...configGroups];
    
    // Map db products to ProductConfig format
    const newConfigs: ProductConfig[] = selectedProducts.map(p => ({
      title: p.proName,
      real_id: p.id.toString(),
      discount: '0',
      discount_type: 'fixed'
    }));

    newGroups[activeGroupIndex].suggest_list.push(...newConfigs);
    setConfigGroups(newGroups);
    
    const newExpanded = [...expandedGroups];
    newExpanded[activeGroupIndex] = true;
    setExpandedGroups(newExpanded);
  };

  const handleRemoveProduct = (groupIndex: number, prodIndex: number) => {
    const newGroups = [...configGroups];
    newGroups[groupIndex].suggest_list.splice(prodIndex, 1);
    setConfigGroups(newGroups);
  };

  const handleProductChange = (groupIndex: number, prodIndex: number, field: keyof ProductConfig, value: string) => {
    const newGroups = [...configGroups];
    newGroups[groupIndex].suggest_list[prodIndex] = {
      ...newGroups[groupIndex].suggest_list[prodIndex],
      [field]: value
    };
    setConfigGroups(newGroups);
  };

  const handleGroupTitleChange = (groupIndex: number, value: string) => {
    const newGroups = [...configGroups];
    newGroups[groupIndex].title = value;
    setConfigGroups(newGroups);
  };

  // --- Drag & Drop Handlers ---
  const handleGroupDragStart = (e: React.DragEvent, gIdx: number) => {
    e.stopPropagation();
    setDraggedGroupIdx(gIdx);
    e.dataTransfer.effectAllowed = 'move';
    // Visual tweak
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleGroupDrop = (e: React.DragEvent, targetGIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (draggedGroupIdx === null || draggedGroupIdx === targetGIdx) return;
    
    const newGroups = [...configGroups];
    const newExpanded = [...expandedGroups];
    
    const [movedGroup] = newGroups.splice(draggedGroupIdx, 1);
    newGroups.splice(targetGIdx, 0, movedGroup);
    
    const [movedExpanded] = newExpanded.splice(draggedGroupIdx, 1);
    newExpanded.splice(targetGIdx, 0, movedExpanded);
    
    setConfigGroups(newGroups);
    setExpandedGroups(newExpanded);
    setDraggedGroupIdx(null);
  };

  const handleProductDragStart = (e: React.DragEvent, gIdx: number, pIdx: number) => {
    e.stopPropagation();
    setDraggedProduct({ gIdx, pIdx });
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleProductDrop = (e: React.DragEvent, targetGIdx: number, targetPIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!draggedProduct) return;
    
    const { gIdx: sourceGIdx, pIdx: sourcePIdx } = draggedProduct;
    
    if (sourceGIdx !== targetGIdx || sourcePIdx === targetPIdx) {
      setDraggedProduct(null);
      return;
    }
    
    const newGroups = [...configGroups];
    const groupList = newGroups[sourceGIdx].suggest_list;
    const [movedProduct] = groupList.splice(sourcePIdx, 1);
    groupList.splice(targetPIdx, 0, movedProduct);
    
    setConfigGroups(newGroups);
    setDraggedProduct(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedGroupIdx(null);
    setDraggedProduct(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSave = async () => {
    const resolvedEndTime = resolveComboEndTime({
      mode: endTimeMode,
      fromTimeValue: formData.from_time,
      toTimeValue: formData.to_time,
    });
    if (resolvedEndTime.error) {
      setEndTimeError(resolvedEndTime.error);
      setSaveError('Vui lòng kiểm tra lại thời gian áp dụng.');
      setSaveMessage('');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    setEndTimeError('');
    try {
      const payload = {
        title: formData.title,
        description: initialData.description || '',
        status: Number(formData.status),
        fromTime: parseComboDatetimeLocal(formData.from_time),
        toTime: resolvedEndTime.toTime,
        groups: configGroups.map((group) => ({
          title: group.title,
          products: group.suggest_list.map((product) => ({
            title: product.title,
            productId: Number(product.real_id),
            discount: Number(product.discount || 0),
            discountType: product.discount_type,
          })),
        })),
      };
      const response = await fetch(isNew ? '/api/admin/combo-sets' : `/api/admin/combo-sets/${initialData.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error?.message || 'Không thể lưu combo set.');
      const warnings = Array.isArray(result.data?.warnings) ? ` ${result.data.warnings.join(' ')}` : '';
      setSaveMessage(`${isNew ? 'Đã tạo combo set.' : 'Đã cập nhật combo set.'}${warnings}`);
      if (isNew && result.data?.id) router.replace(`/product/combo-set/edit?id=${result.data.id}`);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể lưu combo set.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <h1 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-3">
          <span className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          {isNew ? 'THÊM MỚI COMBO SET' : 'CẬP NHẬT COMBO SET'}
        </h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-800 text-gray-300 font-bold uppercase tracking-wider text-sm rounded-sm border border-gray-700 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-blue-600 text-white font-bold uppercase tracking-wider text-sm rounded-sm border border-blue-500 hover:bg-blue-500 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu Combo'}
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0f] p-6 relative">
        {(saveError || saveMessage) && (
          <div role="status" className={`mx-auto mb-4 max-w-5xl rounded border px-4 py-3 text-sm ${saveError ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-green-500/40 bg-green-500/10 text-green-300'}`}>
            {saveError || saveMessage}
          </div>
        )}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-10">
          
          {/* Thông tin cơ bản */}
          <div className="glass-panel border-gray-800 p-6 rounded-lg space-y-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-800 pb-4">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              Thông tin cơ bản
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tên Combo Set <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-sm px-4 py-2.5 text-gray-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all font-medium" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thời gian bắt đầu</label>
                <input 
                  type="datetime-local" 
                  value={formData.from_time}
                  onChange={(e) => setFormData({...formData, from_time: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-sm px-4 py-2.5 text-gray-200 focus:outline-none focus:border-red-500/50 transition-all font-mono text-sm" 
                />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-700 rounded-sm px-4 py-2.5 text-gray-200 focus:outline-none focus:border-red-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="1">Đang hoạt động</option>
                  <option value="0">Tạm ngưng</option>
                </select>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Thời gian kết thúc
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      name="combo-end-time-mode"
                      value="unlimited"
                      checked={endTimeMode === 'unlimited'}
                      onChange={() => {
                        setEndTimeMode('unlimited');
                        setEndTimeError('');
                      }}
                      className="size-4 accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                    />
                    Không giới hạn thời gian
                  </label>
                  <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      name="combo-end-time-mode"
                      value="limited"
                      checked={endTimeMode === 'limited'}
                      onChange={() => {
                        setEndTimeMode('limited');
                        setEndTimeError('');
                        setFormData((current) => ({
                          ...current,
                          to_time: current.to_time || defaultLimitedEndTime(current.from_time),
                        }));
                      }}
                      className="size-4 accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                    />
                    Chọn ngày kết thúc
                  </label>
                </div>
                {endTimeMode === 'limited' ? (
                  <div className="space-y-2">
                    <label htmlFor="combo-end-time" className="block text-xs font-medium text-gray-400">
                      Ngày và giờ kết thúc
                    </label>
                    <input
                      id="combo-end-time"
                      type="datetime-local"
                      value={formData.to_time}
                      aria-invalid={Boolean(endTimeError)}
                      aria-describedby={endTimeError ? 'combo-end-time-error' : undefined}
                      onChange={(event) => {
                        setFormData({ ...formData, to_time: event.target.value });
                        setEndTimeError('');
                      }}
                      className={`w-full rounded-sm border bg-gray-950 px-4 py-2.5 font-mono text-sm text-gray-200 focus:outline-none focus:ring-1 ${
                        endTimeError
                          ? 'border-red-500 focus:border-red-400 focus:ring-red-500/30'
                          : 'border-gray-700 focus:border-red-500/50 focus:ring-red-500/30'
                      }`}
                    />
                    {endTimeError ? (
                      <p id="combo-end-time-error" role="alert" className="text-xs text-red-400">
                        {endTimeError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            </div>
          </div>

          {/* Cấu hình các nhóm sản phẩm */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-500 rounded-full inline-block shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                Cấu hình các nhóm sản phẩm trong Combo
              </h2>
              <button 
                onClick={handleAddGroup}
                className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 font-bold uppercase tracking-wider text-xs rounded-sm hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Nhóm Sản Phẩm
              </button>
            </div>

            {configGroups.length === 0 ? (
              <div className="p-10 border border-dashed border-gray-800 bg-gray-950/50 rounded-lg text-center text-gray-500">
                <p className="font-mono mb-4">Combo Set này chưa có cấu hình nhóm sản phẩm nào.</p>
                <button 
                  onClick={handleAddGroup}
                  className="mx-auto px-6 py-2 bg-blue-600 text-white font-bold uppercase tracking-wider text-xs rounded-sm border border-blue-500 hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                >
                  Tạo Nhóm Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {configGroups.map((group, gIdx) => (
                  <div 
                    key={gIdx} 
                    className="glass-panel border-gray-800 rounded-lg overflow-hidden shadow-lg border"
                    draggable
                    onDragStart={(e) => handleGroupDragStart(e, gIdx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleGroupDrop(e, gIdx)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Group Header */}
                    <div className="bg-gray-900/80 border-b border-gray-800 p-4 flex items-center gap-4 group/header">
                      <div className="cursor-move p-1 text-gray-600 hover:text-gray-300 transition-colors" title="Kéo để sắp xếp nhóm">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      
                      <button 
                        onClick={() => toggleGroup(gIdx)}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                      >
                        {expandedGroups[gIdx] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>

                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500 bg-gray-950 px-2 py-1 rounded">Nhóm {gIdx + 1}</span>
                        <input 
                          type="text" 
                          value={group.title}
                          onChange={(e) => handleGroupTitleChange(gIdx, e.target.value)}
                          placeholder="Nhập tên nhóm (VD: Máy in hóa đơn, Tay cầm PS4...)"
                          className="flex-1 bg-transparent border-b border-transparent hover:border-gray-700 focus:border-blue-500 px-2 py-1 text-gray-200 focus:outline-none transition-colors font-bold text-sm"
                        />
                      </div>
                      
                      <span className="text-xs text-gray-500 mr-2">{group.suggest_list.length} sản phẩm</span>

                      <button 
                        onClick={() => handleRemoveGroup(gIdx)}
                        className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Xóa nhóm này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Products inside Group */}
                    {expandedGroups[gIdx] && (
                      <div className="p-4 bg-gray-950/30">
                        {group.suggest_list.length > 0 ? (
                          <table className="w-full text-left border-collapse mb-4">
                            <thead>
                              <tr className="border-b border-gray-800 text-gray-500 text-[10px] uppercase tracking-wider font-mono">
                                <th className="pb-2 w-10"></th>
                                <th className="pb-2">Tên sản phẩm hiển thị</th>
                                <th className="pb-2 w-40">Giảm giá</th>
                                <th className="pb-2 w-40">Loại giảm</th>
                                <th className="pb-2 w-16 text-center">Xóa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/30">
                              {group.suggest_list.map((prod, pIdx) => (
                                <tr 
                                  key={pIdx} 
                                  className="hover:bg-gray-900/50 transition-colors group"
                                  draggable
                                  onDragStart={(e) => handleProductDragStart(e, gIdx, pIdx)}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleProductDrop(e, gIdx, pIdx)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <td className="py-2">
                                    <div className="cursor-move p-1 text-gray-700 hover:text-gray-400 transition-colors" title="Kéo để sắp xếp sản phẩm">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input 
                                      type="text" 
                                      value={prod.title}
                                      onChange={(e) => handleProductChange(gIdx, pIdx, 'title', e.target.value)}
                                      placeholder="Tên hiển thị..."
                                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all"
                                    />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <input 
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={prod.discount}
                                      aria-label={`Giảm giá cho ${prod.title}`}
                                      onChange={(e) => handleProductChange(
                                        gIdx,
                                        pIdx,
                                        'discount',
                                        normalizeComboNumericText(e.target.value),
                                      )}
                                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-green-400 font-mono focus:outline-none focus:border-green-500/50 transition-all"
                                    />
                                  </td>
                                  <td className="py-2 pr-2">
                                    <select 
                                      value={prod.discount_type}
                                      onChange={(e) => handleProductChange(gIdx, pIdx, 'discount_type', e.target.value as any)}
                                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                                    >
                                      <option value="percent">% Phần trăm</option>
                                      <option value="fixed">Tiền cố định</option>
                                    </select>
                                  </td>
                                  <td className="py-2 text-center">
                                    <button 
                                      onClick={() => handleRemoveProduct(gIdx, pIdx)}
                                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors mx-auto"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center p-4 text-xs font-mono text-gray-600 mb-4 border border-dashed border-gray-800 rounded">
                            Chưa có sản phẩm trong nhóm này
                          </div>
                        )}

                        <button 
                          onClick={() => handleOpenProductModal(gIdx)}
                          className="w-full py-2.5 border border-dashed border-gray-700 rounded text-xs font-bold text-gray-500 hover:text-gray-300 hover:border-gray-500 hover:bg-gray-800/50 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm vào nhóm {gIdx + 1}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductSelectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleProductsSelected}
        multiple={true}
      />
    </div>
  );
}
