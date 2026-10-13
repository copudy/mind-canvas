import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { Extension, type Editor } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import UniqueID from "@tiptap/extension-unique-id";
import type { Item } from "../model";
import { plainDoc, type RichNode } from "../rich";
export default function RichEditor({
  item,
  change,
  finish,
  checkpoint,
}: {
  item: Item;
  change: (doc: RichNode) => void;
  finish: () => void;
  checkpoint: () => void;
}) {
  const [limit, setLimit] = useState("");
  const editorRef = useRef<Editor | null>(null);
  const limits = Extension.create({
    name: "documentLimits",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          filterTransaction(tr) {
            if (!tr.docChanged) return true;
            let count = 0,
              depth = 0;
            tr.doc.descendants((_node, pos) => {
              count++;
              depth = Math.max(depth, tr.doc.resolve(pos).depth);
            });
            const allowed =
              tr.doc.textBetween(0, tr.doc.content.size, "\n", "\n").length <=
                10000 &&
              count <= 4500 &&
              depth <= 18;
            if (!allowed)
              queueMicrotask(() =>
                setLimit(
                  "文字最多 10,000 字，清單層級最多 18 層；此次輸入未加入。",
                ),
              );
            return allowed;
          },
        }),
      ];
    },
  });
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ link: false }),
        Markdown,
        UniqueID.configure({ types: ["listItem"] }),
        limits,
      ],
      content: item.rich || plainDoc(item.text),
      onCreate: ({ editor }) => {
        editorRef.current = editor;
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) editor.commands.focus("all");
        });
      },
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-label": "編輯節點文字",
          "aria-multiline": "true",
          class: "rich-editor nodrag nowheel",
        },
        handleKeyDown: (view, e) => {
          if (e.isComposing || view.composing) return false;
          if (
            e.key === "Escape" ||
            (e.key === "Enter" && (e.ctrlKey || e.metaKey))
          ) {
            e.preventDefault();
            finish();
            return true;
          }
          return false;
        },
        handlePaste: (view, e) => {
          const text = e.clipboardData?.getData("text/plain");
          const current = editorRef.current;
          if (
            current &&
            !current.isDestroyed &&
            text &&
            /[*_`]|^\s*(?:[-*]|\d+\.|#{1,6}|>)\s/m.test(text)
          ) {
            e.preventDefault();
            current.commands.insertContent(text, { contentType: "markdown" });
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => change(editor.getJSON() as RichNode),
    },
    [item.id],
  );
  editorRef.current = editor;
  useEffect(() => {
    if (editor && !editor.isDestroyed) checkpoint();
  }, [editor]);
  return (
    <div
      className="rich-edit-wrap nodrag nowheel"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {createPortal(
        <div
          className="rich-edit-actions rich-edit-dock"
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            aria-label="編輯粗體"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            aria-label="編輯斜體"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            aria-label="編輯程式碼"
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            code
          </button>
          <button
            aria-label="項目清單"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            • 清單
          </button>
          <button
            aria-label="編號清單"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1. 清單
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (editor?.view.composing) {
                setLimit("請先完成組字再結束編輯。");
                return;
              }
              finish();
            }}
          >
            完成
          </button>
        </div>,
        document.body,
      )}
      <EditorContent editor={editor} />
      {limit && <small role="alert">{limit}</small>}
    </div>
  );
}
