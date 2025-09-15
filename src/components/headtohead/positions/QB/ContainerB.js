import React from 'react';

const ContainerA = ({ title = 'Content Area', children, player1, player2 }) => {
  return (
    <main className="w-full p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">{title}</h2>
        <div className="text-gray-700">
          {player1 && <p>Player 1 ID: {player1.playerId}, Year: {player1.year} test</p>}
          {player2 && <p>Player 2 ID: {player2.playerId}, Year: {player2.year} test</p>}
          {children}
        </div>
      </div>
    </main>
  );
};

export default ContainerA;