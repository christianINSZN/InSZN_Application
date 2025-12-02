import React from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

function HeadToHead() {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
    const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium' ;
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
            { label: 'Attributional Radial', path: null, clickable: false, image: '/H2H_Radial.png', comingSoon: true },
          ].map(({ label, path, clickable, image, comingSoon }) => (
            <div
              key={label}
              className={`bg-white rounded-lg shadow-md p-4 text-center border relative ${
                isMobile ? 'w-full' : 'w-1/3'
              } ${clickable ? 'hover:bg-[#235347]/50 group' : comingSoon ? 'group' : 'cursor-not-allowed opacity-50'}`}
            >
              {clickable && label === 'Head-to-Head Bars' && !isSubscribed ? (
                <>
                  <div className="relative w-full h-120 mb-4 rounded bg-gray-200 flex items-center justify-center group-hover:filter group-hover:blur-xs group-hover:opacity-80">
                    {image ? (
                      <img
                        src={image}
                        alt={`${label} preview`}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">Image Placeholder</span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
                        <p className="text-gray-700 text-sm sm:text-lg font-semibold mb-2">Exclusive Content</p>
                        <p className="text-gray-500 text-sm sm:text-base mb-4">This content is exclusive to INSZN Insider subscribers.</p>
                        <Link
                          to="/subscribe"
                          className="px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white text-sm sm:text-base rounded hover:bg-[#1b3e32]"
                        >
                          Subscribe Now
                        </Link>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`block text-[#235347] text-base sm:text-lg font-semibold ${
                      label === 'Attributional Radial' ? 'mt-16' : ''
                    }`}
                  >
                    {label}
                  </span>
                </>
              ) : clickable ? (
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
                  <div className={`w-full h-120 mb-4 rounded bg-gray-200 flex items-center justify-center ${label === 'Attributional Radial' ? 'mt-14' : ''}`}>
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
                  <span
                    className={`block text-[#235347] text-base sm:text-lg font-semibold ${
                      label === 'Attributional Radial' ? 'mt-16' : ''
                    }`}
                  >
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