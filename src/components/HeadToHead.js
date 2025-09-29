import React from 'react';
import { Link } from 'react-router-dom';

function HeadToHead() {
  const isMobile = window.innerWidth < 640;

  return (
    <div className="min-h-screen bg-gray-100 mt-0 sm:mt-12">
      {/* Header Container */}
      <header className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
        <h1 className="text-2xl sm:text-2xl font-bold text-[#235347]">Select Comparison Type</h1>
      </header>
      {/* Navigator */}
      <div className="p-4 sm:p-6">
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row gap-6'} justify-center`}>
          {[
            { label: 'Head-to-Head Bars', path: '/h2h/qb', clickable: true, image: '/H2H_Bars.png', comingSoon: false },
            { label: 'Game-Level Metric Charts', path: null, clickable: false, image: '/H2H_Metrics.png', comingSoon: true },
            { label: 'Attributional Radial', path: null, clickable: false, image: null, comingSoon: false },
          ].map(({ label, path, clickable, image, comingSoon }) => (
            <div
              key={label}
              className={`bg-white rounded-lg shadow-md p-4 text-center border relative ${
                isMobile ? 'w-full' : 'w-1/3'
              } ${clickable ? 'hover:bg-[#235347]/50 group' : comingSoon ? 'group' : 'cursor-not-allowed opacity-50'}`}
            >
              {clickable ? (
                <Link to={path} className="block">
                  <div className="w-full h-120 mb-4 rounded bg-gray-200 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt={`${label} preview`}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">Image Placeholder</span>
                    )}
                  </div>
                  <span className="block text-[#235347] hover:text-[#1b3e32] text-base sm:text-lg font-semibold">
                    {label}
                  </span>
                </Link>
              ) : (
                <>
                  <div className="w-full h-120 mb-4 rounded bg-gray-200 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt={`${label} preview`}
                        className={`w-full h-full object-cover rounded ${comingSoon ? 'group-hover:opacity-70' : ''}`}
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">Image Placeholder</span>
                    )}
                  </div>
                  <span className="block text-[#235347] text-base sm:text-lg font-semibold">
                    {label}
                  </span>
                  {comingSoon && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded opacity-0 group-hover:opacity-50 transition-opacity">
                      <span className="text-white text-sm sm:text-base font-semibold">Coming Soon</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HeadToHead;