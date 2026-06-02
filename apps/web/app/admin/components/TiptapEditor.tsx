"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { ListItem } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { TextStyle } from "@tiptap/extension-text-style";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";

import { RichTextProvider } from "reactjs-tiptap-editor";

import { Blockquote, RichTextBlockquote } from "reactjs-tiptap-editor/blockquote";
import { Bold, RichTextBold } from "reactjs-tiptap-editor/bold";
import { BulletList, RichTextBulletList } from "reactjs-tiptap-editor/bulletlist";
import { Clear, RichTextClear } from "reactjs-tiptap-editor/clear";
import { Code, RichTextCode } from "reactjs-tiptap-editor/code";
import { CodeBlock, RichTextCodeBlock } from "reactjs-tiptap-editor/codeblock";
import { Color, RichTextColor } from "reactjs-tiptap-editor/color";
import { Heading, RichTextHeading } from "reactjs-tiptap-editor/heading";
import { Highlight, RichTextHighlight } from "reactjs-tiptap-editor/highlight";
import { History, RichTextRedo, RichTextUndo } from "reactjs-tiptap-editor/history";
import { HorizontalRule, RichTextHorizontalRule } from "reactjs-tiptap-editor/horizontalrule";
import { Image, RichTextImage } from "reactjs-tiptap-editor/image";
import { Italic, RichTextItalic } from "reactjs-tiptap-editor/italic";
import { Link, RichTextLink } from "reactjs-tiptap-editor/link";
import { MoreMark, RichTextMoreMark } from "reactjs-tiptap-editor/moremark";
import { OrderedList, RichTextOrderedList } from "reactjs-tiptap-editor/orderedlist";
import { RichTextStrike, Strike } from "reactjs-tiptap-editor/strike";
import { RichTextTable, Table } from "reactjs-tiptap-editor/table";
import { RichTextTaskList, TaskList } from "reactjs-tiptap-editor/tasklist";
import { RichTextAlign, TextAlign } from "reactjs-tiptap-editor/textalign";
import { RichTextUnderline, TextUnderline } from "reactjs-tiptap-editor/textunderline";
import { RichTextVideo, Video } from "reactjs-tiptap-editor/video";
import { Attachment, RichTextAttachment } from "reactjs-tiptap-editor/attachment";
import { Indent, RichTextIndent } from "reactjs-tiptap-editor/indent";
import { LineHeight, RichTextLineHeight } from "reactjs-tiptap-editor/lineheight";
import { SlashCommand, SlashCommandList } from "reactjs-tiptap-editor/slashcommand";
import { EmbedExtension } from "./EmbedNode";
import { EmbedButton } from "./EmbedButton";

import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";

const lowlight = createLowlight();
lowlight.register("bash", bash);
lowlight.register("css", css);
lowlight.register("html", xml);
lowlight.register("js", js);
lowlight.register("ts", ts);
lowlight.register("json", json);

import {
  RichTextBubbleImage,
  RichTextBubbleVideo,
  RichTextBubbleLink,
  RichTextBubbleTable,
  RichTextBubbleText,
  RichTextBubbleCodeBlock,
} from "reactjs-tiptap-editor/bubble";

import "reactjs-tiptap-editor/style.css";

async function uploadToR2(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/media/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = (await res.json()) as { url: string };
  return url;
}

const extensions = [
  Document,
  Text,
  Paragraph,
  HardBreak,
  ListItem,
  TextStyle,
  Dropcursor.configure({ color: "hsl(var(--primary))", width: 2 }),
  Gapcursor,
  TrailingNode,
  Placeholder.configure({ placeholder: "Start writing… (press '/' for commands)" }),

  History,
  Heading,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Clear,
  Color,
  Highlight,
  BulletList,
  OrderedList,
  TaskList,
  TextAlign,
  Indent,
  LineHeight,
  Link,
  Blockquote,
  HorizontalRule,
  Code,
  CodeBlock.configure({ lowlight }),
  Table,
  Image.configure({ upload: uploadToR2 }),
  Video.configure({ upload: uploadToR2 }),
  Attachment.configure({ upload: uploadToR2 }),
  SlashCommand,
  EmbedExtension,
];

interface EditorStats {
  words: number;
  chars: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Count words and characters from the editor's plain text. */
function getStats(editor: Editor): EditorStats {
  const text = editor.getText();
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = trimmed.length;
  return { words, chars };
}

/** Ghost uses ~275 wpm as average reading speed. Minimum 1 min. */
function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 275));
  return `${mins} min read`;
}

export default function TiptapEditor({ value, onChange }: Props) {
  const [stats, setStats] = useState<EditorStats>({ words: 0, chars: 0 });

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      setStats(getStats(editor));
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setStats(getStats(editor));
    },
  });

  // Keep editor in sync when the parent replaces the value (e.g. switching posts).
  // emitUpdate: true lets onUpdate fire, which handles the stats recalculation.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <div className="tiptap-loading">Loading editor…</div>;

  return (
    <RichTextProvider editor={editor}>
      <div className="tiptap-shell">
        <div className="tiptap-toolbar">
          <RichTextUndo />
          <RichTextRedo />
          <RichTextClear />
          <span className="tiptap-toolbar-sep" />
          <RichTextHeading />
          <RichTextBold />
          <RichTextItalic />
          <RichTextUnderline />
          <RichTextStrike />
          <RichTextMoreMark />
          <RichTextColor />
          <RichTextHighlight />
          <span className="tiptap-toolbar-sep" />
          <RichTextBulletList />
          <RichTextOrderedList />
          <RichTextTaskList />
          <RichTextAlign />
          <RichTextIndent />
          <RichTextLineHeight />
          <span className="tiptap-toolbar-sep" />
          <RichTextLink />
          <RichTextImage />
          <RichTextVideo />
          <RichTextAttachment />
          <EmbedButton editor={editor} />
          <RichTextBlockquote />
          <RichTextHorizontalRule />
          <RichTextCode />
          <RichTextCodeBlock />
          <RichTextTable />
        </div>

        <div className="tiptap-content">
          <EditorContent editor={editor} />
        </div>

        <RichTextBubbleText />
        <RichTextBubbleLink />
        <RichTextBubbleImage />
        <RichTextBubbleVideo />
        <RichTextBubbleTable />
        <RichTextBubbleCodeBlock />

        <SlashCommandList />

        {/* Ghost-style status bar: word count, reading time, character count */}
        <div className="tiptap-statusbar">
          <span className="tiptap-statusbar-stat">
            {stats.words.toLocaleString()} {stats.words === 1 ? "word" : "words"}
          </span>
          <span className="tiptap-statusbar-sep" aria-hidden>·</span>
          <span className="tiptap-statusbar-stat">{readingTime(stats.words)}</span>
          <span className="tiptap-statusbar-sep" aria-hidden>·</span>
          <span className="tiptap-statusbar-stat">
            {stats.chars.toLocaleString()} {stats.chars === 1 ? "char" : "chars"}
          </span>
        </div>
      </div>
    </RichTextProvider>
  );
}
