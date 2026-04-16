// ============================================================
// BlogContent — renders HTML stored by Tiptap editor
// Sanitized server-side with isomorphic-dompurify
// ============================================================
import DOMPurify from 'isomorphic-dompurify'

type Props = {
  content: string
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'hr', 'img', 'a', 'figure', 'figcaption',
]

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'class',
  'target', 'rel', 'width', 'height',
]

export function EditorJsContent({ content }: Props) {
  const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS, ALLOWED_ATTR })

  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
