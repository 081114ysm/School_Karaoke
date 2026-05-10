export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      background: 'white',
    }}>
      <img src="/logo.png" alt="경소노래방" height={72} style={{ opacity: 0.9 }} />
      <p style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#1a1a2e',
        letterSpacing: '-0.01em',
      }}>
        경소노래방
      </p>
    </div>
  )
}
