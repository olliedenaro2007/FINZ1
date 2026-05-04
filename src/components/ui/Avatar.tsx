import Image from 'next/image'

type AvatarProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  src?: string | null
  initials?: string
}

export default function Avatar({ size = 'md', src, initials = '?' }: AvatarProps) {
  return (
    <div className={`avatar ${size}`}>
      {src
        ? <Image src={src} alt={initials} width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
        : initials.slice(0, 2).toUpperCase()
      }
    </div>
  )
}
