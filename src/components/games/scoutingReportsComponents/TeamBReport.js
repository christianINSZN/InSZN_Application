import React from 'react';

const TeamAReport = ({ teamName, teamId, year }) => {
  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-[#235347] mb-2">{teamName || 'Unknown Team'}</h3>
      <div className="space-y-2">
        <p><strong>Team Overview</strong></p>
        <p>Team ID: {teamId || 'N/A'}</p>
        <p>Offensive Rank: TBD</p>
        <p>Defensive Rank: TBD</p>
        <p>Key Strength: TBD</p>
        <p>Key Weakness: TBD</p>
        <p className="mt-4"><strong>Key Players</strong></p>
        <p>QB: TBD</p>
        <p>WR: TBD</p>
        <p>Defender: TBD</p>
      </div>
    </div>
  );
};

export default TeamAReport;