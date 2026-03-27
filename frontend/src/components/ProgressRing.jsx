import { useEffect, useState } from 'react'

export default function ProgressRing({ 
  value = 0, 
  max = 100, 
  size = 120, 
  strokeWidth = 10,
  color = '#22c55e',
  bgColor = '#e5e7eb',
  label = '',
  sublabel = '',
  showPercentage = false,
  animate = true
}) {
  const [progress, setProgress] = useState(0)
  
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    if (animate) {
      // Animate from 0 to target percentage
      const timer = setTimeout(() => {
        setProgress(percentage)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setProgress(percentage)
    }
  }, [percentage, animate])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage ? (
            <span className="text-2xl font-bold" style={{ color }}>
              {Math.round(percentage)}%
            </span>
          ) : (
            <>
              <span className="text-2xl font-bold text-white">
                {value}
              </span>
              <span className="text-xs text-white/70">
                of {max}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Labels below ring */}
      {(label || sublabel) && (
        <div className="mt-2 text-center">
          {label && <p className="font-medium text-gray-800">{label}</p>}
          {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
        </div>
      )}
    </div>
  )
}

// Mini version for regional progress
export function MiniProgressRing({
  value = 0,
  max = 100,
  size = 60,
  strokeWidth = 6,
  color = '#22c55e',
  label = ''
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{value}/{max}</span>
        </div>
      </div>
      {label && (
        <p className="mt-1 text-xs font-medium text-gray-600 text-center truncate max-w-[80px]">
          {label}
        </p>
      )}
    </div>
  )
}
