import React from 'react';
import { useParams, Link } from 'react-router-dom';

function HeadToHead() {
  const { playerId } = useParams() || {};
  const activePosition = playerId || '';

  return (
    <div className="min-h-screen bg-gray-100 mt-0 sm:mt-12">
      {/* Header Container */}
      <header className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center ">
        <h1 className="text-xl sm:text-2xl font-bold text-[#235347]">Select Position to Begin</h1>
      </header>
      {/* Navigator */}
      <div className="border-b border-gray-300">
        <ul className={`flex ${window.innerWidth < 640 ? 'flex-col gap-2 p-6' : 'flex-row gap-4 p-4'} justify-center`}>
          {[
            { path: '/h2h/qb', label: 'Quarterback' },
            { path: '/h2h/rb', label: 'Running Back' },
            { path: '/h2h/te', label: 'Tight End' },
            { path: '/h2h/wr', label: 'Wide Receiver' },
          ].map(({ path, label }) => (
            <li key={path} className={window.innerWidth < 640 ? 'w-full' : ''}>
              <Link
                to={path}
                className={`block text-[#235347] hover:text-[#1b3e32] ${
                  window.innerWidth < 640
                    ? 'px-4 py-3 text-sm border-2 border-[#235347] rounded-lg hover:bg-[#235347]/10'
                    : 'px-2 py-2 text-base border-b-2'
                } ${
                  activePosition === path.split('/').pop()
                    ? 'border-[#235347]'
                    : 'border-transparent hover:border-[#235347]'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default HeadToHead;