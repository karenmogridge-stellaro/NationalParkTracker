import React from 'react';

export default function ParkList({ parks = [], onLogVisit }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 mt-6">
      <h2 className="text-lg font-bold mb-2 text-green-700 flex items-center gap-2">
        <span role="img" aria-label="park">🏞️</span> National Parks
      </h2>
      <div className="divide-y divide-gray-100">
        {parks.length === 0 && (
          <div className="text-gray-400 py-6 text-center">No parks found.</div>
        )}
        {parks.map(park => (
          <div
            key={park.id}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${park.name}`}
            className="flex items-center justify-between py-3 rounded-lg transition hover:bg-green-50 focus:bg-green-100 outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
          >
            <div>
              <div className="font-semibold text-gray-800">{park.name}</div>
              <div className="text-xs text-gray-500">{park.state} &middot; {park.region}</div>
            </div>
            <button
              className="bg-green-500 hover:bg-green-600 focus:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium shadow outline-none focus:ring-2 focus:ring-green-400"
              onClick={() => onLogVisit(park)}
            >
              Log Visit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
