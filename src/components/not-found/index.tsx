import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="doto-font text-[12rem] leading-none text-foreground/10">
        404
      </h1>
      <p className="mt-4 text-muted-foreground">页面未找到</p>
      <Link
        to="/"
        title="返回首页"
        aria-label="返回首页"
        className={`
          mt-6 text-primary
          hover:underline
        `}
      >
        返回首页
      </Link>
    </div>
  )
}
