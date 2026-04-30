const req = async (url, options = {}) => {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

const json = (token) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
const bearer = (token) => ({ Authorization: `Bearer ${token}` })

export const authAPI = {
  login: (email, password) =>
    req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  register: (username, email, password) =>
    req('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    }),
}

export const postsAPI = {
  getAll: (token) => req('/api/posts', { headers: bearer(token) }),
  getByUser: (userId, token) => req(`/api/posts/user/${userId}`, { headers: bearer(token) }),
  create: (content, token) =>
    req('/api/posts', {
      method: 'POST',
      headers: json(token),
      body: JSON.stringify({ content }),
    }),
  delete: (id, token) =>
    req(`/api/posts/${id}`, { method: 'DELETE', headers: bearer(token) }),
  like: (id, token) =>
    req(`/api/posts/${id}/like`, { method: 'POST', headers: bearer(token) }),
  unlike: (id, token) =>
    req(`/api/posts/${id}/like`, { method: 'DELETE', headers: bearer(token) }),
}

export const usersAPI = {
  getProfile: (userId, token) => req(`/api/users/${userId}`, { headers: bearer(token) }),
  isFollowing: (userId, targetId, token) =>
    req(`/api/users/${userId}/is-following/${targetId}`, { headers: bearer(token) }),
  follow: (userId, token) =>
    req(`/api/users/${userId}/follow`, { method: 'POST', headers: bearer(token) }),
  unfollow: (userId, token) =>
    req(`/api/users/${userId}/follow`, { method: 'DELETE', headers: bearer(token) }),
}
