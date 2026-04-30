import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { messagesAPI, usersAPI } from '../api'

export default function DM() {
  const { userId } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    usersAPI.getProfile(userId, token).then(setOtherUser).catch(() => {})
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const data = await messagesAPI.getConversation(userId, token)
      if (Array.isArray(data)) setMessages(data)
    } catch {}
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const msg = await messagesAPI.send(userId, otherUser?.username || '', content, token)
      setMessages((prev) => [...prev, msg])
      setContent('')
    } catch {}
    setSending(false)
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2f3336',
          padding: '0.875rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#e7e9ea',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '50%',
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
            {otherUser?.username || `User ${userId}`}
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#71767b' }}>Direct Message</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#71767b', marginTop: '3rem' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</p>
            <p>No messages yet. Say hi!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = String(msg.sender_id) === String(user?.id)
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMine ? '#1d9bf0' : '#16181c',
                  color: '#e7e9ea',
                  fontSize: '0.9375rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  border: isMine ? 'none' : '1px solid #2f3336',
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#71767b', marginTop: '0.25rem' }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          position: 'sticky',
          bottom: 0,
          background: '#000',
          borderTop: '1px solid #2f3336',
          padding: '0.875rem 1rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start a message"
          maxLength={500}
          style={{
            flex: 1,
            padding: '0.625rem 1rem',
            background: '#16181c',
            border: '1px solid #2f3336',
            borderRadius: '9999px',
            color: '#e7e9ea',
            fontSize: '0.9375rem',
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          style={{
            padding: '0.625rem 1.125rem',
            background: content.trim() ? '#1d9bf0' : '#0e4f7a',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: content.trim() ? 'pointer' : 'default',
            opacity: sending ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
