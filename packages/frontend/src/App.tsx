import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>TraceGrade</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
        Teacher Productivity & Grade Management Platform
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '2rem',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <p style={{ marginBottom: '1rem' }}>
          Docker setup is working! 🎉
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          This is a placeholder page. Start building your application in the packages/frontend/src directory.
        </p>

        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setCount((count) => count + 1)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            Count is {count}
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
            Click to test hot reload - changes will appear instantly!
          </p>
        </div>
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '0.5rem',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Next Steps:</h2>
        <ul style={{ textAlign: 'left', lineHeight: '1.8', opacity: 0.9 }}>
          <li>✅ Frontend running on <code>http://localhost:5173</code></li>
          <li>✅ Backend API on <code>http://localhost:8080</code></li>
          <li>✅ PostgreSQL database ready</li>
          <li>✅ Redis cache ready</li>
          <li>📖 Check <code>QUICKSTART.md</code> for usage</li>
          <li>🚀 Start building in <code>packages/frontend/src</code></li>
        </ul>
      </div>
    </div>
  )
}

export default App
