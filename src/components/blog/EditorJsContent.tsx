type Props = {
  content: string
}

export function EditorJsContent({ content }: Props) {
  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
