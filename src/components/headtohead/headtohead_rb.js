import React from 'react';
import { useParams, Link } from 'react-router-dom';

function HeadToHeadRB() {
  const { playerId } = useParams() || {};

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Container */}
      <header className="bg-white rounded-lg shadow-md p-4 text-center">
        <h1 className="text-2xl font-bold">Head-to-Head</h1>
      </header>

      {/* Navigator */}
      <div className="border-b border-gray-300">
        <ul className="flex gap-4 justify-center p-4">
          <li>
            <Link
              to={`/h2h/qb`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${false ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`} // Placeholder for active state
            >
              Quarterback
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/rb`}
              className={`text-blue-500 hover:text-gray-700 pb-2 border-b-2 ${false ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`} // Placeholder for active state
            >
              Running Back
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/te`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${false ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`} // Placeholder for active state
            >
              Tight End
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/wr`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${false ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`} // Placeholder for active state
            >
              Wide Receiver
            </Link>
          </li>
        </ul>
      </div>

      {/* Large Full-Width Container */}
      <main className="w-full p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-center">Select Position to Start</h2>
          {/* Add content here later */}
        </div>
      </main>
    </div>
  );
}

export default HeadToHeadRB;