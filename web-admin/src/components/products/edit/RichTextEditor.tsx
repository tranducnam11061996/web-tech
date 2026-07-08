'use client';

import Script from 'next/script';
import { useEffect, useRef, useId, useState, type MutableRefObject } from 'react';

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
}: { 
  title?: string; 
  defaultValue?: string; 
  value?: string;
  onChange?: (value: string) => void;
  minHeight?: string;
  id?: string;
  editorHandleRef?: MutableRefObject<RichTextEditorHandle | null>;
  resizable?: boolean;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const tinyEditorRef = useRef<any>(null);
  const lastBookmarkRef = useRef<any>(null);
  const valueRef = useRef(value ?? defaultValue ?? '');
  const onChangeRef = useRef(onChange);
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
        menubar: false,
        resize: resizable ? 'vertical' : false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic backcolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | help',
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
        if (tinyEditorRef.current) window.tinymce.remove(tinyEditorRef.current);
        tinyEditorRef.current = null;
        lastBookmarkRef.current = null;
        if (editorHandleRef) editorHandleRef.current = null;
        initialized.current = false;
      }
    };
  }, [editorHandleRef, minHeight, resizable, scriptReady]);

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
