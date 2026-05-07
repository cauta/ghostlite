"use client";

import { useState, useRef, useEffect } from "react";
import { renderMarkdown } from "@/lib/markdown";

type EditorMode = "write" | "preview" | "split";

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export default function MarkdownEditor({ value, onChange, id, placeholder = "Write in Markdown…" }: Props) {
  const [mode, setMode] = useState<EditorMode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "split") return;
    const ta = textareaRef.current;
    const pv = previewRef.current;
    if (!ta || !pv) return;

    let fromEditor = false;
    let fromPreview = false;

    function onEditorScroll() {
      if (fromPreview) return;
      fromEditor = true;
      const pct = ta!.scrollTop / Math.max(1, ta!.scrollHeight - ta!.clientHeight);
      pv!.scrollTop = pct * (pv!.scrollHeight - pv!.clientHeight);
      requestAnimationFrame(() => { fromEditor = false; });
    }

    function onPreviewScroll() {
      if (fromEditor) return;
      fromPreview = true;
      const pct = pv!.scrollTop / Math.max(1, pv!.scrollHeight - pv!.clientHeight);
      ta!.scrollTop = pct * (ta!.scrollHeight - ta!.clientHeight);
      requestAnimationFrame(() => { fromPreview = false; });
    }

    ta.addEventListener("scroll", onEditorScroll, { passive: true });
    pv.addEventListener("scroll", onPreviewScroll, { passive: true });
    return () => {
      ta.removeEventListener("scroll", onEditorScroll);
      pv.removeEventListener("scroll", onPreviewScroll);
    };
  }, [mode]);

  function wrap(before: string, after: string, placeholder: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    const pos = s + before.length + sel.length;
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
  }

  function linePrefix(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    const pos = s + prefix.length;
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
  }

  function tbBtn(label: string, title: string, action: () => void) {
    return (
      <button type="button" className="admin-editor-tb-btn" title={title} onClick={action}>
        {label}
      </button>
    );
  }

  return (
    <div className="admin-editor-wrap">
      <div className="admin-editor-header">
        <div className="admin-editor-toolbar">
          {tbBtn("B", "Bold", () => wrap("**", "**", "bold text"))}
          {tbBtn("I", "Italic", () => wrap("*", "*", "italic text"))}
          {tbBtn("S̶", "Strikethrough", () => wrap("~~", "~~", "strikethrough"))}
          <span className="admin-editor-tb-sep" />
          {tbBtn("H1", "Heading 1", () => linePrefix("# "))}
          {tbBtn("H2", "Heading 2", () => linePrefix("## "))}
          {tbBtn("H3", "Heading 3", () => linePrefix("### "))}
          <span className="admin-editor-tb-sep" />
          {tbBtn("🔗", "Link", () => wrap("[", "](https://)", "link text"))}
          {tbBtn("🖼", "Image", () => wrap("![", "](https://)", "alt text"))}
          <span className="admin-editor-tb-sep" />
          {tbBtn("`", "Inline code", () => wrap("`", "`", "code"))}
          {tbBtn("```", "Code block", () => wrap("```\n", "\n```", "code here"))}
          <span className="admin-editor-tb-sep" />
          {tbBtn("❝", "Blockquote", () => linePrefix("> "))}
          {tbBtn("•", "Bullet list", () => linePrefix("- "))}
          {tbBtn("1.", "Numbered list", () => linePrefix("1. "))}
          <span className="admin-editor-tb-sep" />
          {tbBtn("―", "Horizontal rule", () => wrap("\n\n---\n\n", "", ""))}
        </div>
        <div className="admin-editor-tabs">
          {(["write", "preview", "split"] as EditorMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? "active" : ""}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={`admin-editor-body ${mode}`}>
        {mode !== "preview" && (
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder={placeholder}
          />
        )}
        {mode !== "write" && (
          <div
            ref={previewRef}
            className="admin-editor-preview"
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(value) ||
                `<p style="color:var(--a-fg-muted)">Nothing to preview yet.</p>`,
            }}
          />
        )}
      </div>
    </div>
  );
}
