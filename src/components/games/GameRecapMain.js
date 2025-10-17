import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function GameRecap({ teamGames: initialTeamGames, weeklyGrades, year, gameId }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure teamGames is available before processing
    if (initialTeamGames && initialTeamGames.length > 0) {
      const foundGame = initialTeamGames.find(g => g.id === parseInt(gameId)) || initialTeamGames[0];
      setGame(foundGame);
      setLoading(false);
    } else {
      setLoading(false); // Handle case where teamGames is empty or undefined
    }
  }, [initialTeamGames, gameId, year]); // Added year to dependencies if it affects game selection

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  if (loading || !game) {
    return <div>Loading game data...</div>; // Loading state
  }

  const isHomeGame = game.team === game.homeTeam;
  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeamAbrev;
  const homePoints = game.homePoints;
  const awayPoints = game.awayPoints;
  const winLoss = homePoints > awayPoints ? "W" : homePoints < awayPoints ? "L" : "";
  const homeLogo = `https://example.com/logos/${homeTeam}.png`; // Replace with actual logo URL logic
  const awayLogo = `https://example.com/logos/${awayTeam}.png`; // Replace with actual logo URL logic
  const weekStr = String(game.week);
  const seasonType = game.seasonType || 'regular';
  const weekGradeKey = `${weekStr}_${seasonType}`;
  const weekGrade = weeklyGrades[weekGradeKey] || {};

  // Sample data for pie charts (replace with actual metrics)
  const pieData1 = {
    labels: ['Offense', 'Defense', 'Special Teams'],
    datasets: [{
      data: [weekGrade['grades_offense'] || 0, weekGrade['grades_defense'] || 0, 100 - (weekGrade['grades_offense'] || 0) - (weekGrade['grades_defense'] || 0)],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
    }],
  };

  const pieData2 = {
    labels: ['Pass', 'Run'],
    datasets: [{
      data: [weekGrade['grades_pass'] || 0, weekGrade['grades_run'] || 0],
      backgroundColor: ['#4BC0C0', '#9966FF'],
    }],
  };

  const pieData3 = {
    labels: ['Success', 'Failure'],
    datasets: [{
      data: [weekGrade['grades_offense'] || 0, 100 - (weekGrade['grades_offense'] || 0)],
      backgroundColor: ['#FF9F40', '#4BC0C0'],
    }],
  };

  return (
    <div className="bg-gray-100 rounded-lg shadow-lg p-4">
      {/* Header with Score and Logos */}
      <div className="flex items-center justify-between mb-4 p-2 bg-white rounded shadow">
        <div className="flex items-center">
          <img src={homeLogo} alt={`${homeTeam} logo`} className="w-12 h-12 mr-2" />
          <span className="text-xl font-bold">{homeTeam}</span>
        </div>
        <div className="text-2xl font-bold">
          {winLoss && <span style={{ color: winLoss === "W" ? "green" : "red", marginRight: "8px" }}>{winLoss}</span>}
          <Link
            to={`/game/${game.id}`}
            className="text-black hover:text-blue underline underline-offset-2"
          >
            {`${homePoints} - ${awayPoints}`}
          </Link>
        </div>
        <div className="flex items-center">
          <span className="text-xl font-bold mr-2">{awayTeam}</span>
          <img src={awayLogo} alt={`${awayTeam} logo`} className="w-12 h-12" />
        </div>
      </div>

      {/* Three Horizontally Stacked Pie Chart Containers */}
      <div className="flex justify-between space-x-4">
        {/* Pie Chart 1 */}
        <div className="w-1/3 bg-white rounded-lg shadow p-4">
          <h3 className="text-center font-semibold mb-2">Overall Performance</h3>
          <Pie data={pieData1} />
        </div>

        {/* Pie Chart 2 */}
        <div className="w-1/3 bg-white rounded-lg shadow p-4">
          <h3 className="text-center font-semibold mb-2">Pass vs Run</h3>
          <Pie data={pieData2} />
        </div>

        {/* Pie Chart 3 */}
        <div className="w-1/3 bg-white rounded-lg shadow p-4">
          <h3 className="text-center font-semibold mb-2">Success Rate</h3>
          <Pie data={pieData3} />
        </div>
      </div>
    </div>
  );
}

export default GameRecap;