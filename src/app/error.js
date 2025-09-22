'use client'

export default function Error({ error, reset }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '50vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#e74c3c', marginBottom: '16px' }}>
        Something went wrong!
      </h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {error?.message || 'Failed to load archive entries'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Try again
      </button>
    </div>
  )
}
