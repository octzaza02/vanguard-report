function isImageSrc(avatar: string) {
  return avatar.startsWith('data:image') || avatar.startsWith('http://') || avatar.startsWith('https://')
}

export default function FolderIcon({
  avatar,
  size = 40,
  className = '',
}: {
  avatar?: string | null
  size?: number
  className?: string
}) {
  const dim = `${size}px`

  if (avatar && isImageSrc(avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        style={{ width: dim, height: dim }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={{ width: dim, height: dim, fontSize: `${Math.round(size * 0.55)}px` }}
      className={`flex items-center justify-center rounded-full bg-amber-50 shrink-0 leading-none ${className}`}
    >
      {avatar?.trim() || '📁'}
    </div>
  )
}
