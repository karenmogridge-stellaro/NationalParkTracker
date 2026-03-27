import React from 'react';

export default function ActivityLog({ activities = [] }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 mt-6">
      <h2 className="text-lg font-bold mb-2 text-blue-700 flex items-center gap-2">
        <span role="img" aria-label="activity">📝</span> Recent Activity
      </h2>
      <div className="divide-y divide-gray-100">
        {activities.length === 0 && (
          <div className="text-gray-400 py-6 text-center">No recent activity.</div>
        )}
        {activities.map((act, idx) => (
          <div key={idx} className="py-3 flex items-center gap-3">
            <span className="text-green-600 text-xl">{act.icon || '🌲'}</span>
            <div>
              <div className="font-medium text-gray-800">{act.text}</div>
              <div className="text-xs text-gray-400">{act.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
