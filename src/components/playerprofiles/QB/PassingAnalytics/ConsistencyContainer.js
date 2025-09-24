import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';

const PerformanceContainer = ({ playerId, year, weeklyGrades, teamGames, allPlayerPercentiles }) => {
  const chartRefs = {
    accuracy: useRef(null),
    twp_rate: useRef(null),
    btt_rate: useRef(null),
    targetDepth: useRef(null),
    qb_rating: useRef(null),
  };
  const [checkedPlayers, setCheckedPlayers] = useState({
    accuracy: {},
    twp_rate: {},
    btt_rate: {},
    targetDepth: {},
    qb_rating: {},
  });
  const [playerWeeklyData, setPlayerWeeklyData] = useState({
    accuracy: {},
    twp_rate: {},
    btt_rate: {},
    targetDepth: {},
    qb_rating: {},
  });
  const [searchTerms, setSearchTerms] = useState({
    accuracy: '',
    twp_rate: '',
    btt_rate: '',
    targetDepth: '',
    qb_rating: '',
  });
  const [showSearch, setShowSearch] = useState({
    accuracy: false,
    twp_rate: false,
    btt_rate: false,
    targetDepth: false,
    qb_rating: false,
  });
  const colors = [
    'rgba(255, 99, 132, 1)', // Red
    'rgba(54, 162, 235, 1)', // Blue
    'rgba(75, 192, 192, 1)', // Teal
    'rgba(255, 159, 64, 1)', // Orange
    'rgba(153, 102, 255, 1)', // Purple
  ];

  const capitalizeName = (name) => {
    if (!name) return `Player ${playerId}`;
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleCheckboxChange = async (metricId, selectedPlayerId) => {
    setCheckedPlayers(prev => ({
      ...prev,
      [metricId]: {
        ...prev[metricId],
        [selectedPlayerId]: !prev[metricId][selectedPlayerId],
      },
    }));

    if (!checkedPlayers[metricId][selectedPlayerId]) {
      try {
        // Fetch data for all weeks (1-15) for the selected player
        const gradesPromises = Array.from({ length: 15 }, (_, i) => i + 1).map(week =>
          fetch(`http://localhost:3001/api/player_passing_weekly_all/${selectedPlayerId}/${year}/${week}/regular`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then(response => {
            if (!response.ok) return { week, seasonType: 'regular', data: null };
            return response.json().then(data => ({ week, seasonType: 'regular', data: data[0] || null }));
          }).catch(error => {
            console.error(`Fetch error for player ${selectedPlayerId}, week ${week}: ${error.message}`);
            return { week, seasonType: 'regular', data: null };
          })
        );
        const gradesResults = await Promise.all(gradesPromises);
        const newWeeklyData = gradesResults.reduce((acc, { week, seasonType, data }) => ({
          ...acc,
          [`${week}_${seasonType}`]: data,
        }), {});
        setPlayerWeeklyData(prev => ({
          ...prev,
          [metricId]: {
            ...prev[metricId],
            [selectedPlayerId]: newWeeklyData,
          },
        }));
      } catch (err) {
        console.error(`Error fetching weekly data for player ${selectedPlayerId}: ${err.message}`);
      }
    }
  };

  const handleSearchChange = (metricId, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [metricId]: value,
    }));
  };

  const toggleSearch = (metricId) => {
    setShowSearch(prev => ({
      ...prev,
      [metricId]: !prev[metricId],
    }));
  };

  useEffect(() => {
    if (!teamGames || teamGames.length === 0) {
      console.warn('teamGames is empty or not iterable, using empty dataset');
      return;
    }

    const sortedGames = [...teamGames].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return isNaN(dateA) || isNaN(dateB) ? a.week - b.week : dateA - dateB;
    });

    const opponentLookup = sortedGames.reduce((acc, game) => {
      const key = `${game.week}_${game.seasonType}`;
      const playerTeam = game.team;
      const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.homeTeamAbrev}`;
      acc[key] = { opponent, startDate: game.startDate };
      return acc;
    }, {});

    const metrics = [
      { id: 'accuracy', field: 'accuracy_percent', title: 'Accuracy (%)', min: 0, max: 100, unit: 'Accuracy (%)' },
      { id: 'twp_rate', field: 'twp_rate', title: 'Turnover Worthy Play (%)', min: 0, max: 20, unit: 'Turnover Worthy Play (%)' },
      { id: 'btt_rate', field: 'btt_rate', title: 'Big Time Throw (%)', min: 0, max: 20, unit: 'Big Time Throw (%)' },
      { id: 'targetDepth', field: 'avg_depth_of_target', title: 'Avg. Depth of Target', min: 0, max: 20, unit: 'Avg. Depth of Target' },
      { id: 'qb_rating', field: 'qb_rating', title: 'QB Rating', min: 0, max: 160, unit: 'QB Rating' },
    ];

    metrics.forEach(metric => {
      const chartRef = chartRefs[metric.id];
      if (chartRef.current) {
        chartRef.current.destroy();
        console.log(`Previous ${metric.title} chart destroyed`);
      }

      const canvas = document.getElementById(`${metric.id}Chart`);
      if (!canvas || !canvas.getContext) {
        console.warn(`Canvas not available for ${metric.id}Chart`);
        return;
      }

      const ctx = canvas.getContext('2d');

      // Check if any additional players are selected
      const hasAdditionalPlayers = Object.keys(checkedPlayers[metric.id]).some(pId => checkedPlayers[metric.id][pId]);

      // Default to 15 weeks
      const sortedWeeks = Array.from({ length: 15 }, (_, i) => i + 1).map(week => ({
        week,
        seasonType: 'regular',
        key: `${week}_regular`,
      }));

      // Create labels: opponent abbreviations for single player, week numbers for multiple
      const labels = sortedWeeks.map(week => {
        if (hasAdditionalPlayers) {
          return `Week ${week.week}`;
        }
        return opponentLookup[week.key]?.opponent || 'BYE';
      });

      const datasets = [
        {
          label: capitalizeName(allPlayerPercentiles[playerId]?.name),
          data: sortedWeeks.map(week => {
            const weekData = weeklyGrades[week.key] || {};
            const value = weekData[metric.field] !== undefined && weekData[metric.field] !== null ? weekData[metric.field] : null;
            return value;
          }),
          borderColor: colors[0],
          backgroundColor: colors[0].replace('1)', '0.2)'),
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        ...Object.keys(checkedPlayers[metric.id])
          .filter(pId => checkedPlayers[metric.id][pId])
          .map((pId, idx) => ({
            label: capitalizeName(allPlayerPercentiles[pId]?.name),
            data: sortedWeeks.map(week => {
              const weekData = playerWeeklyData[metric.id][pId]?.[week.key] || {};
              const value = weekData[metric.field] !== undefined && weekData[metric.field] !== null ? weekData[metric.field] : null;
              return value;
            }),
            borderColor: colors[(idx + 1) % colors.length],
            backgroundColor: colors[(idx + 1) % colors.length].replace('1)', '0.2)'),
            fill: true,
            tension: 0.2,
            pointRadius: 5,
            pointHoverRadius: 7,
          })),
      ];

      const allData = datasets.flatMap(ds => ds.data.filter(value => value !== null && !isNaN(value)));
      const buffer = (metric.max - metric.min) * 0.0;
      const yMin = Math.max(0, metric.min - buffer);
      const yMax = metric.max + buffer;

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets,
        },
        options: {
          scales: {
            x: { title: { display: false, text: 'Opponent' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
            y: { title: { display: true, text: metric.unit }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
          },
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: { mode: 'index', intersect: false },
            title: {
              display: true,
              text: metric.title,
              font: { size: 16, weight: 'bold' },
              color: '#374151', // Matches text-gray-700
              padding: { top: 10, bottom: 10 },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      console.log(`Line chart created for ${metric.title}`);
    });
  }, [weeklyGrades, teamGames, checkedPlayers, playerWeeklyData, allPlayerPercentiles, playerId]);

  const getTopPerformers = (metricField, searchTerm = '') => {
    if (!allPlayerPercentiles || typeof allPlayerPercentiles !== 'object') return [];
    return Object.entries(allPlayerPercentiles)
      .filter(([pId, data]) => data && data[metricField] !== undefined && data[metricField] !== null)
      .map(([pId, data]) => ({
        playerId: pId,
        name: capitalizeName(data.name),
        value: Number(data[metricField]),
      }))
      .filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.value - a.value)
      .map(player => ({
        playerId: player.playerId,
        name: player.name,
        value: player.value.toFixed(1),
      }));
  };

  return (
    <div className="performance-container grid grid-cols-[80%_18%] gap-4">
      {[
        { id: 'accuracy', title: 'Accuracy (%)', field: 'accuracy' },
        { id: 'twp_rate', title: 'TWP Rate (%)', field: 'twp_rate' },
        { id: 'btt_rate', title: 'Big Time Throw (%)', field: 'btt_rate' },
        { id: 'targetDepth', title: 'Avg. Depth of Target', field: 'targetDepth' },
        { id: 'qb_rating', title: 'QB Rating', field: 'qb_rating' },
      ].map((metric, index) => (
        <React.Fragment key={metric.id}>
          {/* Left Column (80%) */}
          <div className="sub-container bg-gray-0 p-0 rounded shadow">
            <div className="w-full h-80">
              <canvas id={`${metric.id}Chart`} className="w-full h-full"></canvas>
            </div>
          </div>
          {/* Right Column (20%) */}
          <div className="sub-container bg-gray-50 p-4 rounded shadow">
            <div className="flex items-center justify-center mb-4">
              <h4 className="text-md font-medium text-gray-700">Top Performers</h4>
              <button
                onClick={() => toggleSearch(metric.id)}
                className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
            </div>
            {showSearch[metric.id] && (
              <input
                type="text"
                value={searchTerms[metric.id]}
                onChange={(e) => handleSearchChange(metric.id, e.target.value)}
                placeholder="Search players..."
                className="w-full mb-2 p-1 text-xs text-gray-700 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-gray-500">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1">Player</th>
                    <th className="text-right py-1">{metric.title === 'Accuracy (%)' ? 'Rate' : metric.title === 'TWP Rate (%)' ? 'Rate' : metric.title === 'Big Time Throw (%)' ? 'Rate' : metric.title === 'Avg. Depth of Target' ? 'YDS' : 'Rating'}</th>
                    <th className="text-right py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {getTopPerformers(metric.field, searchTerms[metric.id]).map((player, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-1">
                        <Link
                          to={`/players/qb/${player.playerId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {player.name}
                        </Link>
                      </td>
                      <td className="text-right py-1">{player.value}</td>
                      <td className="text-right py-1">
                        <input
                          type="checkbox"
                          checked={!!checkedPlayers[metric.id][player.playerId]}
                          onChange={() => handleCheckboxChange(metric.id, player.playerId)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                  {getTopPerformers(metric.field, searchTerms[metric.id]).length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-1 text-center">No players found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default PerformanceContainer;