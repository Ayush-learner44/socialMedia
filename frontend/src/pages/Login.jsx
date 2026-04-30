import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api'

const inputStyle = {
  padding: '0.75rem 1rem',
  background: '#000',
  border: '1px solid #2f3336',
  borderRadius: '8px',
  color: '#e7e9ea',
  fontSize: '1rem',
  width: '100%',
}

export default function Login() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data =
        tab === 'login'
          ? await authAPI.login(form.email, form.password)
          : await authAPI.register(form.username, form.email, form.password)
      login(data.token, data.user)
      navigate('/feed')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#000',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '2rem',
          background: '#16181c',
          borderRadius: '16px',
          border: '1px solid #2f3336',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#1d9bf0' }}>
          SocialApp
        </h1>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1rem', color: '#71767b', fontWeight: 400 }}>
          {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #2f3336' }}>
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'none',
                border: 'none',
                color: tab === t ? '#e7e9ea' : '#71767b',
                fontWeight: tab === t ? 700 : 400,
                borderBottom: tab === t ? '2px solid #1d9bf0' : '2px solid transparent',
                fontSize: '0.9375rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tab === 'register' && (
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              style={inputStyle}
            />
          )}
          <input
            name="email"
            type="text"
            placeholder={tab === 'register' ? 'Email' : 'Email or Username'}
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#f4212e', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              background: '#1d9bf0',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '1rem',
              opacity: loading ? 0.6 : 1,
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}
