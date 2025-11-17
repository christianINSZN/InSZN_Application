// In src/components/teams/teams_components/TeamHeader.js
import React from 'react';

const TeamHeader = ({ teamData, year }) => {
  const { school, abbreviation } = teamData; // Adjust based on API response
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold">{school}</h1>
      {/* Add logo, record, or other header details later */}
    </div>
  );
};

export default TeamHeader;