import React from 'react';
import TeamAReport from './scoutingReportsComponents/TeamA';
import HeadToHeadReport from './scoutingReportsComponents/HeadToHead';
import TeamBReport from './scoutingReportsComponents/TeamB';

const ScoutingReport = ({ matchup, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-5xl h-[80vh] overflow-y-auto flex flex-col">
        {/* Green Bar with Logos */}
        <div className="bg-[#235347] flex justify-between items-center p-4 rounded-t">
          {matchup?.awayTeamLogo && (
            <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-16 h-16" />
          )}
          <h2 className="text-xl font-bold text-white text-center flex-1">
            Scouting Report: {matchup?.awayTeamName} vs {matchup?.homeTeamName}
          </h2>
          {matchup?.homeTeamLogo && (
            <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-16 h-16" />
          )}
        </div>
        {/* Main Content */}
        <div className="flex-1 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Team A (Away) */}
            <TeamAReport teamName={matchup?.awayTeamName} teamId={matchup?.awayId} />
            {/* Middle Column: Head-to-Head Metrics */}
            <HeadToHeadReport />
            {/* Right Column: Team B (Home) */}
            <TeamBReport teamName={matchup?.homeTeamName} teamId={matchup?.homeId} />
          </div>
        </div>
        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoutingReport;