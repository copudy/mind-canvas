import { useEffect } from "react";
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
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ link: false }),
        Markdown,
        UniqueID.configure({ types: ["listItem"] }),
      ],
      content: item.rich || plainDoc(item.text),
      onCreate: ({ editor }) =>
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) editor.commands.focus("all");
        }),
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
          if (text && /\*\*|`|^\s*[-*] |^\d+\. /m.test(text)) {
            e.preventDefault();
            editor?.commands.insertContent(text, { contentType: "markdown" });
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => change(editor.getJSON() as RichNode),
    },
    [item.id],
  );
  useEffect(() => {
    if (editor && !editor.isDestroyed) checkpoint();
  }, [editor]);
  return (
    <div
      className="rich-edit-wrap nodrag nowheel"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="rich-edit-actions"
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
        <button onClick={finish}>完成</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
