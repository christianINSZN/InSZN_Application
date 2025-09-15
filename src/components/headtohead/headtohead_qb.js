import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import HeadToHeadContainer from './positions/QB/HeadToHeadContainer';
import ContainerA from './positions/QB/ContainerA';
import ContainerB from './positions/QB/ContainerB';

function HeadToHeadQB() {
  const { playerId } = useParams() || {};
  const location = useLocation();
  const [playerData, setPlayerData] = useState({ player1: null, player2: null });

  return (
    <div className="min-h-screen bg-white">
      {/* Header Container */}
      <header className="bg-white rounded-lg shadow-md p-4 text-center">
        <h1 className="text-2xl font-bold">Quarterback Comparison</h1>
      </header>
      {/* Navigator */}
      <div className="border-b border-gray-300">
        <ul className="flex gap-4 justify-center p-4">
          <li>
            <Link
              to={`/h2h/qb`}
              className={`text-blue-500 hover:text-gray-700 pb-2 border-b-2 ${location.pathname === '/h2h/qb' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
            >
              Quarterback
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/rb`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${location.pathname === '/h2h/rb' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
            >
              Running Back
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/te`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${location.pathname === '/h2h/te' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
            >
              Tight End
            </Link>
          </li>
          <li>
            <Link
              to={`/h2h/wr`}
              className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${location.pathname === '/h2h/wr' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
            >
              Wide Receiver
            </Link>
          </li>
        </ul>
      </div>
      {/* Large Full-Width Container */}
      <div className="grid grid-cols-[62%_38%] grid-rows-2 gap-4 w-full p-4">
        <div className="space-y-4 row-span-2">
          <HeadToHeadContainer
            onPlayerDataChange={setPlayerData}
          />
        </div>
        <div className="grid grid-rows-2 gap-4">
          <ContainerA player1={playerData.player1} player2={playerData.player2} />
          <ContainerB player1={playerData.player1} player2={playerData.player2} />
        </div>
      </div>
    </div>
  );
}

export default HeadToHeadQB;