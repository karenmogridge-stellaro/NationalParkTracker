import { useState, useEffect } from 'react'
import { UserPlus, Check, X, Clock } from 'lucide-react'
import { parkAPI } from '../utils/api'
import { useUser } from '../utils/UserContext'

export default function Friends() {
  const { user } = useUser()
  const [friends, setFriends] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadFriendsAndInvitations()
    }
  }, [user?.id])

  const loadFriendsAndInvitations = async () => {
    setLoading(true)
    try {
      const [friendsRes, invitationsRes] = await Promise.all([
        parkAPI.getFriends(user.id),
        parkAPI.getFriendInvitations(user.id),
      ])
      setFriends(friendsRes.data || [])
      setInvitations(invitationsRes.data || [])
      setError('')
    } catch (err) {
      console.error('Failed to load friends:', err)
      setError('Failed to load friends. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteFriend = async (e) => {
    e.preventDefault()
    if (!inviteEmail) return

    setInviteLoading(true)
    try {
      await parkAPI.inviteFriend(user.id, inviteEmail)
      setSuccess(`Invitation sent to ${inviteEmail}!`)
      setInviteEmail('')
      loadFriendsAndInvitations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to invite friend:', err)
      setError(err.response?.data?.detail || 'Failed to send invitation. Please try again.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleAcceptInvitation = async (inviterId) => {
    try {
      await parkAPI.acceptFriendInvitation(user.id, inviterId)
      setSuccess('Friend invitation accepted!')
      loadFriendsAndInvitations()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to accept invitation:', err)
      setError('Failed to accept invitation. Please try again.')
      setTimeout(() => setError(''), 5000)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Loading friends...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Friends 👥</h1>
        <p className="text-gray-600">Connect with fellow adventurers and share your journey</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Invite Friend Form */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-park" />
          <h2 className="text-xl font-semibold">Invite a Friend</h2>
        </div>
        <form onSubmit={handleInviteFriend} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@example.com"
            className="input-field flex-1"
            required
          />
          <button
            type="submit"
            disabled={inviteLoading}
            className="btn btn-primary"
          >
            {inviteLoading ? 'Sending...' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
              {invitations.length}
            </span>
          </div>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">User #{invitation.user_id}</p>
                  <p className="text-sm text-gray-600">
                    Invited on {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptInvitation(invitation.user_id)}
                  className="flex items-center gap-2 px-4 py-2 bg-park text-white rounded-lg hover:opacity-90 font-medium"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">
            Your Friends
          </h2>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
            {friends.length}
          </span>
        </div>

        {friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Friend #{friend.friend_id}</p>
                    <p className="text-sm text-gray-600">
                      Friends since {new Date(friend.accepted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-park text-white rounded-lg hover:opacity-90 font-medium"
                  >
                    View Hikes
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No friends yet</p>
            <p className="text-sm text-gray-400">Invite someone to start sharing your adventures!</p>
          </div>
        )}
      </div>
    </div>
  )
}
