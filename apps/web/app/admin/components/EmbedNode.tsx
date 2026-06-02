"use client";

import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewRendererProps } from "@tiptap/react";

function EmbedNodeView({ node, deleteNode }: NodeViewRendererProps & { deleteNode: () => void }) {
  const { type, src, href, label, provider } = node.attrs as {
    type: string;
    src?: string;
    href?: string;
    label?: string;
    provider?: string;
  };

  return (
    <NodeViewWrapper className="gl-embed-node" contentEditable={false} draggable data-drag-handle>
      <div className="gl-embed-editor-shell">
        <span className="gl-embed-badge">{provider ?? "embed"}</span>
        <button
          className="gl-embed-delete"
          onClick={deleteNode}
          title="Remove embed"
          type="button"
        >
          ×
        </button>
        {type === "iframe" && src ? (
          <div className="gl-embed-responsive">
            <iframe
              src={src}
              loading="lazy"
              allowFullScreen
              frameBorder="0"
              title={provider ?? "embed"}
            />
            {/* Pointer-events overlay prevents accidental editor interactions */}
            <div className="gl-embed-overlay" />
          </div>
        ) : (
          <a href={href} className="gl-embed-link-preview" target="_blank" rel="noopener noreferrer">
            {label ?? href}
          </a>
        )}
      </div>
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: {
        type: string;
        src?: string;
        href?: string;
        label?: string;
        provider?: string;
      }) => ReturnType;
    };
  }
}

export const EmbedExtension = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      type: { default: "iframe" },
      src: { default: null },
      href: { default: null },
      label: { default: null },
      provider: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-gl-embed]",
        getAttrs(dom) {
          const el = dom as HTMLElement;
          const provider = el.getAttribute("data-gl-embed") ?? undefined;
          const iframe = el.querySelector("iframe");
          const anchor = el.querySelector("a");
          if (iframe) {
            return { type: "iframe", src: iframe.src, provider };
          }
          if (anchor) {
            return { type: "link", href: anchor.href, label: anchor.textContent ?? undefined, provider };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { type, src, href, label, provider } = node.attrs as {
      type: string;
      src?: string;
      href?: string;
      label?: string;
      provider?: string;
    };

    if (type === "iframe" && src) {
      return [
        "div",
        { class: "gl-embed gl-embed-iframe", "data-gl-embed": provider ?? "embed" },
        [
          "div",
          { class: "gl-embed-responsive" },
          [
            "iframe",
            {
              src,
              loading: "lazy",
              allowfullscreen: "true",
              frameborder: "0",
              title: provider ?? "embed",
            },
          ],
        ],
      ];
    }

    return [
      "div",
      { class: "gl-embed gl-embed-link", "data-gl-embed": provider ?? "embed" },
      ["a", { href: href ?? "#", class: "gl-embed-link-anchor" }, label ?? href ?? "View embed"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedNodeView);
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
