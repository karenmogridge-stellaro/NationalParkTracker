import { Lock } from 'lucide-react'

export default function BadgeCard({ badge, earned = false, earnedDate = null, size = 'normal' }) {
  const sizeClasses = {
    small: 'p-2',
    normal: 'p-3',
    large: 'p-4'
  }
  
  const iconSizes = {
    small: 'text-2xl',
    normal: 'text-3xl',
    large: 'text-4xl'
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-pressed={earned}
      className={`
        relative rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-green-400
        ${sizeClasses[size]}
        ${earned 
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 shadow-sm hover:shadow-lg focus:shadow-lg cursor-pointer' 
          : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Badge icon */}
      <div className="flex items-center gap-3">
        <span className={`${iconSizes[size]} ${earned ? '' : 'grayscale'}`}>
          {badge.icon_url || '🏆'}
        </span>
        
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${earned ? 'text-gray-800' : 'text-gray-500'}`}>
            {badge.name}
          </p>
          {size !== 'small' && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {badge.description}
            </p>
          )}
        </div>

        {/* Lock icon for unearned badges */}
        {!earned && (
          <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Earned date */}
      {earned && earnedDate && size !== 'small' && (
        <p className="text-xs text-amber-600 mt-2">
          ✨ Earned {new Date(earnedDate).toLocaleDateString()}
        </p>
      )}

      {/* Shine effect for earned badges */}
      {earned && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/30 to-transparent transform translate-x-full animate-shine" />
        </div>
      )}
    </div>
  )
}

// Grid of badges with earned/unearned separation
export function BadgeGrid({ allBadges = [], earnedBadges = [], maxDisplay = 6 }) {
  const earnedIds = new Set(earnedBadges.map(b => b.id))
  
  // Sort: earned first, then unearned
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aEarned = earnedIds.has(a.id)
    const bEarned = earnedIds.has(b.id)
    if (aEarned && !bEarned) return -1
    if (!aEarned && bEarned) return 1
    return 0
  }).slice(0, maxDisplay)

  const earnedCount = earnedBadges.length
  const totalCount = allBadges.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Badges</h3>
        <span className="text-sm text-gray-500">
          {earnedCount} / {totalCount} unlocked
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {sortedBadges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={earnedIds.has(badge.id)}
            earnedDate={earnedBadges.find(b => b.id === badge.id)?.earned_date}
            size="small"
          />
        ))}
      </div>
      
      {allBadges.length > maxDisplay && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          +{allBadges.length - maxDisplay} more badges
        </p>
      )}
    </div>
  )
}
