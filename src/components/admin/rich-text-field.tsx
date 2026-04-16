'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Editor } from '@tiptap/react'

type Props = {
  value: string
  onChange: (html: string) => void
  hasError?: boolean
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (
    label: string,
    action: () => void,
    active: boolean,
    title: string,
    className?: string,
  ) => (
    <button
      key={label}
      type="button"
      onClick={action}
      className={`rtt-btn${active ? ' rtt-btn--active' : ''}${className ? ` ${className}` : ''}`}
      title={title}
    >
      {label}
    </button>
  )

  return (
    <div className="rtt-toolbar">
      {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Negrito', 'rtt-btn--bold')}
      {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Itálico', 'rtt-btn--italic')}
      {btn('S', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Tachado', 'rtt-btn--strike')}

      <span className="rtt-sep" />

      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'Subtítulo')}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'Subtítulo menor')}

      <span className="rtt-sep" />

      {btn('• Lista', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Lista com marcadores')}
      {btn('1. Lista', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Lista numerada')}

      <span className="rtt-sep" />

      {btn('" Citação', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Citação')}
      {btn('</> Código', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'Bloco de código')}
      {btn('— Linha', () => editor.chain().focus().setHorizontalRule().run(), false, 'Linha divisória')}
    </div>
  )
}

export function RichTextField({ value, onChange, hasError }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
  })

  return (
    <div className={`rich-text-field${hasError ? ' rich-text-field--error' : ''}`}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="rtt-content" />
    </div>
  )
}
