'use client';

import Script from 'next/script';
import { useEffect, useRef, useId, useState, type MutableRefObject } from 'react';
import type { RichTextImageScope } from '@/lib/admin/rich-text-image-scopes';

const MAX_EDITOR_IMAGE_SIZE = 10 * 1024 * 1024;
const EDITOR_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EDITOR_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

declare global {
  interface Window {
    tinymce: any;
  }
}

export type RichTextEditorHandle = {
  insertHtmlAtCursor: (html: string) => void;
};

export function RichTextEditor({ 
  title, 
  defaultValue, 
  value,
  onChange,
  minHeight = "240px",
  id,
  editorHandleRef,
  resizable = false,
  imageUploadScope,
}: { 
  title?: string; 
  defaultValue?: string; 
  value?: string;
  onChange?: (value: string) => void;
  minHeight?: string;
  id?: string;
  editorHandleRef?: MutableRefObject<RichTextEditorHandle | null>;
  resizable?: boolean;
  imageUploadScope: RichTextImageScope;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tinyEditorRef = useRef<any>(null);
  const lastBookmarkRef = useRef<any>(null);
  const valueRef = useRef(value ?? defaultValue ?? '');
  const onChangeRef = useRef(onChange);
  const imageUploadInProgressRef = useRef(false);
  const imageUploadAbortRef = useRef<AbortController | null>(null);
  const reactId = useId();
  const editorId = id || `tinymce-${reactId.replace(/:/g, '')}`;
  const initialized = useRef(false);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.tinymce)
  );

  useEffect(() => {
    valueRef.current = value ?? defaultValue ?? '';
    onChangeRef.current = onChange;
  }, [defaultValue, onChange, value]);

  const rememberSelection = (editor: any) => {
    try {
      if (editor?.selection) lastBookmarkRef.current = editor.selection.getBookmark(2, true);
    } catch {
      lastBookmarkRef.current = null;
    }
  };

  const syncContent = (editor: any) => {
    const content = editor.getContent();
    valueRef.current = content;
    onChangeRef.current?.(content);
  };

  const insertHtmlAtCursor = (html: string) => {
    const editor = tinyEditorRef.current;
    if (!editor || !initialized.current || !editor.initialized) {
      const nextValue = `${valueRef.current || ''}${html}`;
      valueRef.current = nextValue;
      onChangeRef.current?.(nextValue);
      return;
    }

    editor.focus();
    try {
      if (lastBookmarkRef.current) {
        editor.selection.moveToBookmark(lastBookmarkRef.current);
      } else {
        editor.selection.select(editor.getBody(), true);
        editor.selection.collapse(false);
      }
    } catch {
      editor.selection.select(editor.getBody(), true);
      editor.selection.collapse(false);
    }

    editor.insertContent(html);
    rememberSelection(editor);
    syncContent(editor);
  };

  useEffect(() => {
    if (scriptReady || typeof window === 'undefined') return;

    const detectTinyMce = () => {
      if (window.tinymce) setScriptReady(true);
    };
    detectTinyMce();
    const interval = window.setInterval(detectTinyMce, 50);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 10000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [scriptReady]);

  useEffect(() => {
    if (scriptReady && typeof window !== 'undefined' && window.tinymce && editorRef.current && !initialized.current) {
      initialized.current = true;
      
      window.tinymce.init({
        target: editorRef.current,
        license_key: 'gpl',
        promotion: false,
        height: minHeight,
        skin: 'oxide-dark',
        content_css: 'dark',
        content_style: `
          body { 
            background-color: #0a0a0f; 
            color: #d1d5db; 
            font-family: 'Inter', sans-serif; 
            font-size: 14px; 
            line-height: 1.6;
          }
          body::-webkit-scrollbar { width: 8px; }
          body::-webkit-scrollbar-track { background: #0a0a0f; }
          body::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
          body::-webkit-scrollbar-thumb:hover { background: #374151; }
          ::selection { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
          a { color: #3b82f6; text-decoration: none; }
          a:hover { color: #60a5fa; text-decoration: underline; text-shadow: 0 0 8px rgba(59,130,246,0.5); }
          img { max-width: 100%; height: auto; }
        `,
        menubar: 'file edit view insert format tools table help',
        toolbar_mode: 'wrap',
        resize: resizable ? 'vertical' : false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor backcolor | link | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | image media table | code fullscreen | help',
        file_picker_types: 'image',
        images_file_types: 'jpeg,jpg,png,webp,gif',
        file_picker_callback: (callback: (url: string) => void, _value: string, meta: { filetype?: string }) => {
          if (meta.filetype !== 'image') return;
          const editor = tinyEditorRef.current;
          if (!editor) return;
          if (imageUploadInProgressRef.current) {
            editor.notificationManager.open({
              text: 'Một ảnh khác đang được tải lên. Vui lòng đợi trong giây lát.',
              type: 'warning',
            });
            return;
          }

          const input = document.createElement('input');
          input.type = 'file';
          input.accept = EDITOR_IMAGE_ACCEPT;
          input.setAttribute('aria-label', 'Chọn ảnh tải lên');
          input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!EDITOR_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
              editor.notificationManager.open({
                text: 'Chỉ hỗ trợ ảnh jpg, png, webp hoặc gif.',
                type: 'error',
              });
              return;
            }
            if (file.size <= 0 || file.size > MAX_EDITOR_IMAGE_SIZE) {
              editor.notificationManager.open({
                text: file.size <= 0 ? 'File ảnh không có nội dung.' : 'Dung lượng ảnh tối đa là 10MB.',
                type: 'error',
              });
              return;
            }

            imageUploadInProgressRef.current = true;
            const abortController = new AbortController();
            imageUploadAbortRef.current = abortController;
            const uploadingNotification = editor.notificationManager.open({
              text: 'Đang tải ảnh lên…',
              type: 'info',
              timeout: 0,
              closeButton: false,
            });

            try {
              const formData = new FormData();
              formData.append('file', file);
              const response = await fetch(`/api/admin/editor-images/${imageUploadScope}/upload`, {
                method: 'POST',
                body: formData,
                signal: abortController.signal,
              });
              const payload = await response.json().catch(() => null);
              if (!response.ok || !payload?.success) {
                throw new Error(payload?.error?.message || 'Không thể tải ảnh lên');
              }

              const url = String(payload.data?.url || '').trim();
              if (!url.startsWith('/api/media/')) {
                throw new Error('Máy chủ trả về URL ảnh không hợp lệ');
              }
              callback(url);
              editor.notificationManager.open({ text: 'Tải ảnh thành công.', type: 'success' });
            } catch (error) {
              if (!(error instanceof DOMException && error.name === 'AbortError')) {
                editor.notificationManager.open({
                  text: error instanceof Error ? error.message : 'Không thể tải ảnh lên',
                  type: 'error',
                });
              }
            } finally {
              uploadingNotification.close();
              if (imageUploadAbortRef.current === abortController) imageUploadAbortRef.current = null;
              imageUploadInProgressRef.current = false;
            }
          }, { once: true });
          input.click();
        },
        setup: (editor: any) => {
          tinyEditorRef.current = editor;
          if (editorHandleRef) {
            editorHandleRef.current = { insertHtmlAtCursor };
          }
          editor.on('init', () => {
            const initialValue = valueRef.current;
            if (initialValue) {
              // If content already contains HTML tags, set it directly
              // Only convert \n to <br/> for plain text content
              const isHtml = /<[a-z][\s\S]*>/i.test(initialValue);
              editor.setContent(isHtml ? initialValue : initialValue.replace(/\n/g, '<br/>'));
            }
            rememberSelection(editor);
          });
          editor.on('change keyup undo redo setcontent', () => {
            syncContent(editor);
          });
          editor.on('click mouseup keyup focus nodechange', () => {
            rememberSelection(editor);
          });
        }
      }).catch(() => {
        initialized.current = false;
        tinyEditorRef.current = null;
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.tinymce && initialized.current) {
        imageUploadAbortRef.current?.abort();
        imageUploadAbortRef.current = null;
        imageUploadInProgressRef.current = false;
        if (tinyEditorRef.current) window.tinymce.remove(tinyEditorRef.current);
        tinyEditorRef.current = null;
        lastBookmarkRef.current = null;
        if (editorHandleRef) editorHandleRef.current = null;
        initialized.current = false;
      }
    };
  }, [editorHandleRef, imageUploadScope, minHeight, resizable, scriptReady]);

  useEffect(() => {
    const editor = tinyEditorRef.current;
    if (!editor || !initialized.current || !editor.initialized) return;
    const nextValue = value ?? defaultValue ?? '';
    if (editor.getContent() !== nextValue) editor.setContent(nextValue);
  }, [defaultValue, value]);

  return (
    <>
      <Script
        src="/tinymce.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div className="space-y-2 w-full">
        {title && (
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2 mb-2">
            <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            {title}
          </h3>
        )}
        <div className="relative z-0 w-full overflow-hidden text-black tinymce-gaming-wrapper rounded-sm border border-gray-800 bg-[#0a0a0f]" style={{ minHeight }}>
          <textarea
            id={editorId}
            ref={editorRef}
            defaultValue={value ?? defaultValue ?? ''}
            className="block w-full resize-none border-0 bg-[#0a0a0f] p-3 text-sm text-gray-300 outline-none"
            style={{ minHeight }}
            aria-label={title || 'Nội dung'}
          />
        </div>

        {/* Override Default TinyMCE Dark Theme to match Gaming UI */}
        <style dangerouslySetInnerHTML={{ __html: `
        .tinymce-gaming-wrapper .tox-tinymce {
          border: 1px solid #1f2937 !important;
          border-radius: 0.125rem !important;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05) !important;
          transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
          max-width: 100% !important;
          position: relative !important;
          z-index: 0 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-edit-area,
        .tinymce-gaming-wrapper .tox .tox-edit-area__iframe {
          background-color: #0a0a0f !important;
        }
        .tinymce-gaming-wrapper .tox-tinymce:focus-within {
          border-color: rgba(239, 68, 68, 0.5) !important;
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.3) !important;
        }
        .tinymce-gaming-wrapper .tox .tox-promotion {
          display: none !important;
        }
        .tinymce-gaming-wrapper .tox .tox-promotion + .tox-menubar,
        .tinymce-gaming-wrapper .tox .tox-menubar + .tox-toolbar,
        .tinymce-gaming-wrapper .tox .tox-menubar + .tox-toolbar-overlord {
          grid-column: 1 / -1 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-menubar {
          background-color: rgba(17, 24, 39, 0.96) !important;
          border-bottom: 1px solid #1f2937 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-toolbar,
        .tinymce-gaming-wrapper .tox .tox-toolbar__overflow,
        .tinymce-gaming-wrapper .tox .tox-toolbar__primary {
          background-color: rgba(17, 24, 39, 0.8) !important;
          backdrop-filter: blur(4px) !important;
          border-bottom: 1px solid #1f2937 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-tbtn {
          color: #9ca3af !important;
          border-radius: 0.125rem !important;
          transition: all 0.2s !important;
        }
        .tinymce-gaming-wrapper .tox .tox-tbtn:hover {
          background-color: rgba(31, 41, 55, 0.8) !important;
          color: #f87171 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-tbtn--enabled,
        .tinymce-gaming-wrapper .tox .tox-tbtn--enabled:hover {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-statusbar {
          background-color: rgba(17, 24, 39, 0.8) !important;
          border-top: 1px solid #1f2937 !important;
          color: #6b7280 !important;
        }
        .tinymce-gaming-wrapper .tox .tox-statusbar__text-container {
          font-family: monospace !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .tinymce-gaming-wrapper .tox .tox-statusbar__path-item {
          color: #3b82f6 !important;
        }
        `}} />
      </div>
    </>
  );
}
