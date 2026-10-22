type Props = { url: string | null; name: string; size?: number }

export function Avatar({ url, name, size = 64 }: Props) {
  const style = { width: size, height: size }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700"
      aria-hidden
    >
      {name.trim().charAt(0) || '?'}
    </div>
  )
}
