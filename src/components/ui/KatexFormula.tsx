import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  children: string
  block?: boolean
  className?: string
}

export default function KatexFormula({ children, block = false, className = '' }: Props) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: block,
    strict: false,
  })
  return (
    <span
      className={`ktex${block ? ' ktex-block' : ' ktex-inline'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
