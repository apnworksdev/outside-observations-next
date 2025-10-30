'use client'

import { useState } from 'react'

export default function TestAIPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const fileInput = e.target.file
    const file = fileInput.files[0]
    
    if (!file) {
      setError('Please select a file first.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/test-ai', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data)
      }
    } catch (err) {
      setError({ error: `Network error: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>
        🧪 Test Outside Observations AI Service
      </h1>
      
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select an image file:
            </label>
            <input 
              type="file" 
              name="file"
              accept="image/*" 
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '2px dashed #ddd',
                borderRadius: '4px',
                background: '#fafafa'
              }}
            />
            <small style={{ color: '#666' }}>
              Supported formats: JPEG, PNG, WebP, non-animated GIF (max 512MB)
            </small>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: loading ? '#ccc' : '#007cba',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              width: '100%'
            }}
          >
            {loading ? 'Testing AI Service...' : 'Test AI Service'}
          </button>
        </form>
        
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '4px',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {JSON.stringify(error, null, 2)}
          </div>
        )}
        
        {result && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '4px',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            color: '#155724',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {JSON.stringify(result, null, 2)}
          </div>
        )}
      </div>
    </div>
  )
}
