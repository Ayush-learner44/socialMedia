import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { postsAPI, notificationsAPI } from '../api'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function Avatar({ name, size = 40 }) {
  const colors = ['#1d9bf0', '#7856ff', '#ff6b35', '#00ba7c', '#ff3877']
  const color = colors[(name || 'U').charCodeAt(0) % colors.length]
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        color: '#fff',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  )
}

function PostCard({ post, currentUserId, onDelete, onLike, liked }) {
  return (
    <div
      style={{
        borderBottom: '1px solid #2f3336',
        padding: '1rem',
        display: 'flex',
        gap: '0.75rem',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#080808')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Link to={`/profile/${post.user_id}`}>
        <Avatar name={post.username} />
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <Link
              to={`/profile/${post.user_id}`}
              style={{ fontWeight: 700, color: '#e7e9ea', fontSize: '0.9375rem' }}
            >
              {post.username}
            </Link>
            <span style={{ color: '#71767b', fontSize: '0.9375rem' }}>
              · {timeAgo(post.created_at)}
            </span>
          </div>
          {String(post.user_id) === String(currentUserId) && (
            <button
              onClick={() => onDelete(post.id)}
              title="Delete post"
              style={{
                background: 'none',
                border: 'none',
                color: '#71767b',
                cursor: 'pointer',
                fontSize: '1.125rem',
                lineHeight: 1,
                padding: '0 0.25rem',
              }}
            >
              ×
            </button>
          )}
        </div>
        <p
          style={{
            marginTop: '0.25rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            fontSize: '0.9375rem',
          }}
        >
          {post.content}
        </p>
        {/* Like button */}
        <div style={{ marginTop: '0.625rem' }}>
          <button
            onClick={() => onLike(post.id, liked)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: liked ? '#f4212e' : '#71767b',
              fontSize: '0.875rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = liked ? '#f4212e22' : '#71767b22')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '1rem' }}>{liked ? '♥' : '♡'}</span>
            <span>{post.like_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Feed() {
  const { user, token, logout } = useAuth()
  const [posts, setPosts] = useState([])
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchPosts()
    fetchNotifications()
    const interval = setInterval(() => {
      fetchPosts()
      fetchNotifications()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchPosts = async () => {
    try {
      const data = await postsAPI.getAll(token)
      if (Array.isArray(data)) setPosts(data)
    } catch {}
  }

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll(token)
      if (Array.isArray(data)) setNotifications(data)
    } catch {}
  }

  const handleNotifClick = async (notif) => {
    try { await notificationsAPI.markRead(notif.from_user_id, token) } catch {}
    setNotifications((prev) => prev.filter((n) => n.from_user_id !== notif.from_user_id))
    setShowNotifs(false)
    navigate(`/dm/${notif.from_user_id}`)
  }

  const handlePost = async (e) => {
    e.preventDefault()
    if (!content.trim() || posting) return
    setPosting(true)
    try {
      await postsAPI.create(content, token)
      setContent('')
      await fetchPosts()
    } catch {}
    setPosting(false)
  }

  const handleDelete = async (id) => {
    try {
      await postsAPI.delete(id, token)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {}
  }

  const handleLike = async (postId, isLiked) => {
    try {
      const result = isLiked
        ? await postsAPI.unlike(postId, token)
        : await postsAPI.like(postId, token)
      setLikedPosts((prev) => {
        const next = new Set(prev)
        isLiked ? next.delete(postId) : next.add(postId)
        return next
      })
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, like_count: result.like_count } : p))
      )
    } catch {}
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2f3336',
          padding: '0.875rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Home</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to={`/profile/${user?.id}`}
            style={{ color: '#71767b', fontSize: '0.875rem' }}
          >
            @{user?.username}
          </Link>

          {/* Bell icon */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.125rem',
                padding: '0.25rem',
                position: 'relative',
                color: notifications.length > 0 ? '#e7e9ea' : '#71767b',
              }}
              title="Notifications"
            >
              🔔
              {notifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: '#f4212e',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  background: '#16181c',
                  border: '1px solid #2f3336',
                  borderRadius: '12px',
                  width: 280,
                  zIndex: 100,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #2f3336', fontWeight: 700, fontSize: '0.9375rem' }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <p style={{ padding: '1.5rem 1rem', color: '#71767b', textAlign: 'center', fontSize: '0.875rem' }}>
                    You're all caught up!
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #2f3336',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#1e2124')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '1.25rem' }}>💬</span>
                      <div>
                        <p style={{ fontSize: '0.9375rem', color: '#e7e9ea' }}>
                          New message from{' '}
                          <strong style={{ color: '#1d9bf0' }}>@{n.from_username}</strong>
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#71767b', marginTop: '0.125rem' }}>
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '0.375rem 0.875rem',
              background: 'none',
              border: '1px solid #2f3336',
              borderRadius: '9999px',
              color: '#e7e9ea',
              fontSize: '0.8125rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Compose */}
      <form
        onSubmit={handlePost}
        style={{
          borderBottom: '1px solid #2f3336',
          padding: '1rem',
          display: 'flex',
          gap: '0.75rem',
        }}
      >
        <Avatar name={user?.username} />
        <div style={{ flex: 1 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            maxLength={280}
            rows={3}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#e7e9ea',
              fontSize: '1.125rem',
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #2f3336',
              paddingTop: '0.625rem',
              marginTop: '0.25rem',
            }}
          >
            <span
              style={{
                color: content.length > 260 ? '#f4212e' : '#71767b',
                fontSize: '0.8125rem',
              }}
            >
              {content.length}/280
            </span>
            <button
              type="submit"
              disabled={!content.trim() || posting}
              style={{
                padding: '0.5rem 1.125rem',
                background: content.trim() ? '#1d9bf0' : '#0e4f7a',
                color: '#fff',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.9375rem',
                opacity: posting ? 0.6 : 1,
              }}
            >
              {posting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      </form>

      {/* Posts */}
      {posts.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#71767b' }}>
          No posts yet. Be the first!
        </div>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onDelete={handleDelete}
          onLike={handleLike}
          liked={likedPosts.has(post.id)}
        />
      ))}
    </div>
  )
}
