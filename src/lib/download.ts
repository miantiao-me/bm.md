/**
 * 触发浏览器保存文件。
 *
 * 只依赖 a[download] + Object URL，现代浏览器全部支持；file-saver 的其余分支
 * （msSaveOrOpenBlob、Safari FileReader 兜底）面向已淘汰的浏览器，且它是 UMD 产物，
 * 静态与动态导入混用时无法拆分 chunk。
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.rel = 'noopener'

  // Firefox 只在节点位于文档中时响应 click。
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // 立即 revoke 会让部分浏览器取消下载，延迟释放。
  setTimeout(() => URL.revokeObjectURL(objectUrl), 40_000)
}
