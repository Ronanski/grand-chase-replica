import { useState } from 'react'

/** Character art from public/art/characters/<id>.png, falling back to initials. */
export function Avatar({ id, name, size = 72 }: { id: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
        {name.slice(0, 2)}
      </div>
    )
  }
  return (
    <img
      className="avatar"
      src={`./art/characters/${id}.png`}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}
