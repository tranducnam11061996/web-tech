'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, Loader2, Plus, Save, Trash2 } from 'lucide-react';

type GuideItem = {
  key: string;
  id?: number;
  question: string;
  answer: string;
  isActive: boolean;
  defaultExpanded: boolean;
};

type GuideForm = {
  enabled: boolean;
  heading: string;
  introduction: string;
  items: GuideItem[];
};

const EMPTY_GUIDE: GuideForm = { enabled: false, heading: '', introduction: '', items: [] };

function itemKey(id?: number) {
  if (id) return `saved-${id}`;
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `new-${Date.now()}-${Math.random()}`;
}

function normalizeGuide(value: any): GuideForm {
  return {
    enabled: Boolean(value?.enabled),
    heading: String(value?.heading || ''),
    introduction: String(value?.introduction || ''),
    items: Array.isArray(value?.items)
      ? value.items.slice(0, 50).map((item: any) => ({
          key: itemKey(Number(item?.id) || undefined),
          id: Number(item?.id) || undefined,
          question: String(item?.question || ''),
          answer: String(item?.answer || ''),
          isActive: item?.isActive !== false,
          defaultExpanded: Boolean(item?.defaultExpanded),
        }))
      : [],
  };
}

function payloadOf(form: GuideForm) {
  return {
    enabled: form.enabled,
    heading: form.heading,
    introduction: form.introduction,
    items: form.items.map(({ question, answer, isActive, defaultExpanded }) => ({
      question,
      answer,
      isActive,
      defaultExpanded,
    })),
  };
}

function snapshot(form: GuideForm) {
  return JSON.stringify(payloadOf(form));
}

export function BuyingGuideEditor({
  entityId,
  endpoint,
}: {
  entityId?: number;
  endpoint: string;
}) {
  const [form, setForm] = useState<GuideForm>(EMPTY_GUIDE);
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot(EMPTY_GUIDE));
  const [loading, setLoading] = useState(Boolean(entityId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const questionRefs = useRef<Array<HTMLInputElement | null>>([]);

  const dirty = useMemo(() => snapshot(form) !== savedSnapshot, [form, savedSnapshot]);
  const activeCount = useMemo(() => form.items.filter((item) => item.isActive).length, [form.items]);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải nội dung Lý do nên mua');
        const next = normalizeGuide(payload.data);
        setForm(next);
        setSavedSnapshot(snapshot(next));
      })
      .catch((loadError) => {
        if (loadError?.name !== 'AbortError') setError(loadError?.message || 'Không thể tải nội dung Lý do nên mua');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [endpoint, entityId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const updateItem = (index: number, patch: Partial<GuideItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const addItem = () => {
    if (form.items.length >= 50) return;
    const index = form.items.length;
    setForm((current) => ({
      ...current,
      items: [...current.items, { key: itemKey(), question: '', answer: '', isActive: true, defaultExpanded: false }],
    }));
    requestAnimationFrame(() => questionRefs.current[index]?.focus());
  };

  const moveItem = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= form.items.length) return;
    setForm((current) => {
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...current, items };
    });
  };

  const duplicateItem = (index: number) => {
    if (form.items.length >= 50) return;
    setForm((current) => {
      const source = current.items[index];
      const copy = { ...source, id: undefined, key: itemKey(), question: `${source.question} (bản sao)` };
      const items = [...current.items];
      items.splice(index + 1, 0, copy);
      return { ...current, items };
    });
    requestAnimationFrame(() => questionRefs.current[index + 1]?.focus());
  };

  const removeItem = (index: number) => {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const save = async () => {
    if (!entityId || !dirty || saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    setFieldErrors({});
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadOf(form)),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setFieldErrors(payload?.error?.fields || {});
        throw new Error(payload?.error?.message || 'Không thể lưu nội dung Lý do nên mua');
      }
      const next = normalizeGuide(payload.data?.guide || form);
      setForm(next);
      setSavedSnapshot(snapshot(next));
      setMessage(payload.message || 'Đã lưu nội dung Lý do nên mua');
    } catch (saveError: any) {
      setError(saveError?.message || 'Không thể lưu nội dung Lý do nên mua');
    } finally {
      setSaving(false);
    }
  };

  if (!entityId) {
    return (
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-5 text-sm text-amber-200">
        Hãy tạo và lưu đối tượng trước khi nhập nội dung Lý do nên mua.
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400" aria-busy="true"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Đang tải nội dung...</div>;
  }

  return (
    <section className="space-y-6" aria-labelledby="buying-guide-editor-title">
      <div className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-950/45 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Nội dung theo từng đối tượng</p>
          <h2 id="buying-guide-editor-title" className="mt-1 text-xl font-black text-white">Lý do nên mua</h2>
          <p className="mt-1 text-sm text-gray-400">{form.items.length} câu hỏi · {activeCount} đang hiển thị</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-bold text-gray-200">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            className="h-5 w-5 accent-emerald-500"
          />
          Hiển thị trên storefront
        </label>
      </div>

      <div aria-live="polite" className="space-y-2">
        {message ? <div role="status" className="rounded-md border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
        {error ? <div role="alert" className="rounded-md border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-800 bg-[#101521] p-5">
            <label htmlFor="buying-guide-heading" className="block text-sm font-bold text-gray-200">Tiêu đề</label>
            <input
              id="buying-guide-heading"
              value={form.heading}
              maxLength={255}
              aria-invalid={Boolean(fieldErrors.heading)}
              aria-describedby={fieldErrors.heading ? 'buying-guide-heading-error' : undefined}
              onChange={(event) => setForm((current) => ({ ...current, heading: event.target.value }))}
              className="mt-2 h-11 w-full rounded-md border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
              placeholder="Ví dụ: 5 lý do nên chọn sản phẩm này"
            />
            <div className="mt-2 flex justify-between gap-4 text-xs text-gray-500">
              <span id="buying-guide-heading-error" className="text-red-300">{fieldErrors.heading || ''}</span>
              <span className="tabular-nums">{form.heading.length}/255</span>
            </div>

            <label htmlFor="buying-guide-introduction" className="mt-4 block text-sm font-bold text-gray-200">Đoạn giới thiệu</label>
            <textarea
              id="buying-guide-introduction"
              value={form.introduction}
              maxLength={2000}
              rows={4}
              aria-invalid={Boolean(fieldErrors.introduction)}
              aria-describedby={fieldErrors.introduction ? 'buying-guide-introduction-error' : undefined}
              onChange={(event) => setForm((current) => ({ ...current, introduction: event.target.value }))}
              className="mt-2 w-full resize-y rounded-md border border-gray-700 bg-gray-950 px-3 py-3 text-sm leading-relaxed text-gray-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
              placeholder="Tóm tắt giá trị chính trước danh sách câu hỏi..."
            />
            <div className="mt-2 flex justify-between gap-4 text-xs">
              <span id="buying-guide-introduction-error" className="text-red-300">{fieldErrors.introduction || ''}</span>
              <span className="tabular-nums text-gray-500">{form.introduction.length}/2000</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white">Danh sách câu hỏi</h3>
              <p className="text-xs text-gray-500">Thứ tự bên dưới cũng là thứ tự hiển thị ngoài storefront.</p>
            </div>
            <button
              type="button"
              onClick={addItem}
              disabled={form.items.length >= 50}
              className="flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm câu hỏi
            </button>
          </div>

          {form.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950/30 px-6 py-12 text-center text-sm text-gray-500">
              Chưa có câu hỏi. Hãy thêm câu đầu tiên để bắt đầu.
            </div>
          ) : (
            <ol className="space-y-4">
              {form.items.map((item, index) => {
                const questionError = fieldErrors[`items.${index}.question`];
                const answerError = fieldErrors[`items.${index}.answer`];
                const questionId = `buying-guide-question-${index}`;
                const answerId = `buying-guide-answer-${index}`;
                return (
                  <li key={item.key} className="rounded-xl border border-gray-800 bg-[#101521] p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-gray-800 px-2 text-xs font-black tabular-nums text-gray-300">{String(index + 1).padStart(2, '0')}</span>
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label={`Di chuyển câu ${index + 1} lên`} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => moveItem(index, 1)} disabled={index === form.items.length - 1} aria-label={`Di chuyển câu ${index + 1} xuống`} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => duplicateItem(index)} disabled={form.items.length >= 50} aria-label={`Nhân bản câu ${index + 1}`} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30"><Copy className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" onClick={() => removeItem(index)} aria-label={`Xóa câu ${index + 1}`} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-red-950/50 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </div>

                    <label htmlFor={questionId} className="block text-sm font-bold text-gray-200">Câu hỏi</label>
                    <input
                      ref={(element) => { questionRefs.current[index] = element; }}
                      id={questionId}
                      value={item.question}
                      maxLength={300}
                      aria-invalid={Boolean(questionError)}
                      aria-describedby={questionError ? `${questionId}-error` : undefined}
                      onChange={(event) => updateItem(index, { question: event.target.value })}
                      className="mt-2 h-11 w-full rounded-md border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                    />
                    <div className="mt-1 flex justify-between gap-4 text-xs">
                      <span id={`${questionId}-error`} className="text-red-300">{questionError || ''}</span>
                      <span className="tabular-nums text-gray-500">{item.question.length}/300</span>
                    </div>

                    <label htmlFor={answerId} className="mt-3 block text-sm font-bold text-gray-200">Câu trả lời</label>
                    <textarea
                      id={answerId}
                      value={item.answer}
                      maxLength={10000}
                      rows={5}
                      aria-invalid={Boolean(answerError)}
                      aria-describedby={answerError ? `${answerId}-error` : undefined}
                      onChange={(event) => updateItem(index, { answer: event.target.value })}
                      className="mt-2 w-full resize-y rounded-md border border-gray-700 bg-gray-950 px-3 py-3 text-sm leading-relaxed text-gray-100 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                    />
                    <div className="mt-1 flex justify-between gap-4 text-xs">
                      <span id={`${answerId}-error`} className="text-red-300">{answerError || ''}</span>
                      <span className="tabular-nums text-gray-500">{item.answer.length}/10000</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-5 border-t border-gray-800 pt-4">
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={item.isActive} onChange={(event) => updateItem(index, { isActive: event.target.checked })} className="h-4 w-4 accent-emerald-500" /> Đang hiển thị</label>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={item.defaultExpanded} onChange={(event) => updateItem(index, { defaultExpanded: event.target.checked })} className="h-4 w-4 accent-cyan-500" /> Mở sẵn</label>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start" aria-label="Xem trước nội dung">
          <div className="rounded-xl border border-gray-800 bg-gray-950/55 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-white"><Eye className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Xem trước</div>
            {form.heading || form.introduction || form.items.some((item) => item.isActive) ? (
              <div className="rounded-lg border border-gray-800 bg-[#111115] p-4">
                <h3 className="text-lg font-black text-white">{form.heading || 'Tiêu đề sẽ hiển thị tại đây'}</h3>
                {form.introduction ? <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-400">{form.introduction}</p> : null}
                <div className="mt-4 space-y-2">
                  {form.items.filter((item) => item.isActive).map((item, index) => (
                    <details key={item.key} open={item.defaultExpanded} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
                      <summary className="cursor-pointer text-sm font-bold text-gray-200">{String(index + 1).padStart(2, '0')} · {item.question || 'Câu hỏi chưa nhập'}</summary>
                      <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-400">{item.answer || 'Câu trả lời chưa nhập'}</p>
                    </details>
                  ))}
                </div>
              </div>
            ) : <p className="rounded-lg border border-dashed border-gray-800 px-4 py-8 text-center text-xs text-gray-500">Nội dung xem trước sẽ xuất hiện khi bạn bắt đầu nhập.</p>}
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">{dirty ? 'Có thay đổi chưa lưu.' : 'Nội dung đã đồng bộ.'}</p>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          title={!dirty ? 'Không có thay đổi cần lưu' : undefined}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {saving ? 'Đang lưu...' : 'Lưu phần Lý do nên mua'}
        </button>
      </div>
    </section>
  );
}
