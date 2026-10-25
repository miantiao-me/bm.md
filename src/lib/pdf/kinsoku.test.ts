// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { keepClosingPunctuationAttached } from './kinsoku'

function apply(html: string): string {
  const root = document.createElement('div')
  root.innerHTML = html
  keepClosingPunctuationAttached(root)
  return root.innerHTML
}

describe('keepClosingPunctuationAttached', () => {
  it('把行内元素和紧跟的避头标点包进 inline-block', () => {
    expect(apply('<p><span>正文</span><code>inline</code><span>，以及</span></p>'))
      .toBe('<p><span>正文</span><span style="display: inline-block"><code>inline</code><span>，</span></span><span>以及</span></p>')
  })

  it('标点是裸文本节点时同样处理，整段都是标点则不留空节点', () => {
    expect(apply('<p><kbd>K</kbd>、后文</p>'))
      .toBe('<p><span style="display: inline-block"><kbd>K</kbd>、</span>后文</p>')
    expect(apply('<p><code>a</code><span>。</span></p>'))
      .toBe('<p><span style="display: inline-block"><code>a</code><span>。</span></span></p>')
  })

  it('长元素、代码块和非避头标点保持原样', () => {
    const untouched = [
      `<p><code>${'x'.repeat(21)}</code><span>，以及</span></p>`,
      '<pre><code><span>a</span>，b</code></pre>',
      '<p><code>a</code><span>以及</span></p>',
      '<p><span>正文，</span>后文</p>',
    ]
    for (const html of untouched)
      expect(apply(html)).toBe(html)
  })
})
