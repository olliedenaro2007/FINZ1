'use client'

type Props = {
  url: string
  name: string
  onClose: () => void
}

const EXCEL_EXTS = ['xlsx', 'xlsm', 'xls']
const CODE_EXTS  = ['py', 'pine', 'r', 'mql']

function ext(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export default function FileViewer({ url, name, onClose }: Props) {
  const e = ext(name)
  const isExcel = EXCEL_EXTS.includes(e)
  const isCode  = CODE_EXTS.includes(e)

  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'var(--surface1)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>📄 {name}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href={url} download={name}
            style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--accent)', borderRadius: 4 }}>
            ↓ Download
          </a>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      {/* viewer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isExcel && (
          <iframe
            src={officeUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={name}
          />
        )}
        {isCode && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontFamily: 'IBM Plex Mono,monospace' }}>
              {name} — <a href={url} download={name} style={{ color: 'var(--accent)' }}>Download to view</a>
            </div>
          </div>
        )}
        {!isExcel && !isCode && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📄</div>
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Preview not available for this file type.</div>
            <a href={url} download={name} style={{ color: 'var(--accent)', fontSize: 13 }}>Click to download</a>
          </div>
        )}
      </div>
    </div>
  )
}
