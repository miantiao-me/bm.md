function SkillIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
        <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" />
        <path d="M12 6l5.2 3v6L12 18l-5.2-3V9z" />
      </g>
    </svg>
  )
}

export default SkillIcon
