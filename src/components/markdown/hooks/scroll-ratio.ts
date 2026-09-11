export function getScrollRatio(element: Pick<HTMLElement, 'scrollHeight' | 'clientHeight' | 'scrollTop'>): number {
  const maxScrollTop = element.scrollHeight - element.clientHeight
  if (maxScrollTop <= 0) {
    return 0
  }

  return element.scrollTop / maxScrollTop
}

export function getScrollTop(element: Pick<HTMLElement, 'scrollHeight' | 'clientHeight'>, ratio: number): number {
  const maxScrollTop = element.scrollHeight - element.clientHeight
  return maxScrollTop * ratio
}
