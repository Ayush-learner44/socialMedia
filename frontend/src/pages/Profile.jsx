import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { postsAPI, usersAPI } from '../api'

function Avatar({ name, size = 72 }) {
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
        fontSize: size * 0.38,
        color: '#fff',
        border: '3px solid #000',
        userSelect: 'none',
      }}
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  )
}

export default function Profile() {
  const { userId } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = String(userId) === String(user?.id)

  useEffect(() => {
    fetchAll()
  }, [userId])

  const fetchAll = async () => {
    try {
      const [profileData, postsData] = await Promise.all([
        usersAPI.getProfile(userId, token),
        postsAPI.getByUser(userId, token),
      ])
      setProfile(profileData)
      if (Array.isArray(postsData)) setPosts(postsData)

      if (!isOwnProfile) {
        const f = await usersAPI.isFollowing(user.id, userId, token)
        setIsFollowing(f.following)
      }
    } catch {}
  }

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await usersAPI.unfollow(userId, token)
        setIsFollowing(false)
        setProfile((p) => ({ ...p, followers_count: p.followers_count - 1 }))
      } else {
        await usersAPI.follow(userId, token)
        setIsFollowing(true)
        setProfile((p) => ({ ...p, followers_count: p.followers_count + 1 }))
      }
    } catch {}
    setFollowLoading(false)
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#71767b' }}>
        Loading...
      </div>
    )
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
          padding: '0.75rem 1rem',
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
          <h1 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{profile.username}</h1>
          <p style={{ fontSize: '0.8125rem', color: '#71767b' }}>{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div style={{ height: 120, background: '#1d9bf020' }} />

      {/* Profile section */}
      <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid #2f3336', marginTop: -36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Avatar name={profile.username} size={72} />
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  padding: '0.5rem 1.125rem',
                  background: isFollowing ? 'none' : '#e7e9ea',
                  border: isFollowing ? '1px solid #e7e9ea' : 'none',
                  borderRadius: '9999px',
                  color: isFollowing ? '#e7e9ea' : '#000',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  opacity: followLoading ? 0.6 : 1,
                }}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <Link
                to={`/dm/${userId}`}
                style={{
                  padding: '0.5rem 1.125rem',
                  background: 'none',
                  border: '1px solid #2f3336',
                  borderRadius: '9999px',
                  color: '#e7e9ea',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                }}
              >
                Message
              </Link>
            </div>
          )}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem' }}>{profile.username}</h2>
          <p style={{ color: '#71767b', fontSize: '0.9375rem', marginTop: '0.125rem' }}>
            @{profile.username}
          </p>
          {profile.bio && (
            <p style={{ marginTop: '0.75rem', lineHeight: 1.5, fontSize: '0.9375rem' }}>
              {profile.bio}
            </p>
          )}
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.875rem' }}>
            <span style={{ fontSize: '0.9375rem' }}>
              <strong>{profile.following_count}</strong>
              <span style={{ color: '#71767b' }}> Following</span>
            </span>
            <span style={{ fontSize: '0.9375rem' }}>
              <strong>{profile.followers_count}</strong>
              <span style={{ color: '#71767b' }}> Followers</span>
            </span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #2f3336',
          fontWeight: 700,
          fontSize: '0.9375rem',
        }}
      >
        Posts
      </div>

      {posts.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#71767b' }}>
          No posts yet.
        </div>
      )}

      {posts.map((post) => (
        <div
          key={post.id}
          style={{
            borderBottom: '1px solid #2f3336',
            padding: '1rem',
          }}
        >
          <p style={{ lineHeight: 1.5, fontSize: '0.9375rem', wordBreak: 'break-word' }}>
            {post.content}
          </p>
          <p style={{ marginTop: '0.5rem', color: '#71767b', fontSize: '0.8125rem' }}>
            {new Date(post.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      ))}
    </div>
  )
}
