import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';

const PocketProduction = ({ playerId, year, weeklyGrades, teamGames, allPlayerPercentiles }) => {
  const chartRefs = {
    def_gen_pressures: useRef(null),
    pressure_to_sack_rate: useRef(null),
    sack_percent: useRef(null),
    hit_as_threw: useRef(null),
    avg_time_to_throw: useRef(null),
  };

  const [checkedPlayers, setCheckedPlayers] = useState({
    def_gen_pressures: {},
    pressure_to_sack_rate: {},
    sack_percent: {},
    hit_as_threw: {},
    avg_time_to_throw: {},
  });

  const [playerWeeklyData, setPlayerWeeklyData] = useState({
    def_gen_pressures: {},
    pressure_to_sack_rate: {},
    sack_percent: {},
    hit_as_threw: {},
    avg_time_to_throw: {},
  });

  const [searchTerms, setSearchTerms] = useState({
    def_gen_pressures: '',
    pressure_to_sack_rate: '',
    sack_percent: '',
    hit_as_threw: '',
    avg_time_to_throw: '',
  });

  const [showDropdown, setShowDropdown] = useState({
    def_gen_pressures: false,
    pressure_to_sack_rate: false,
    sack_percent: false,
    hit_as_threw: false,
    avg_time_to_throw: false,
  });

  const colors = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(153, 102, 255, 1)',
  ];

  const capitalizeName = (name) => {
    if (!name) return `Player ${playerId}`;
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchPlayerData = async (selectedPlayerId) => {
    try {
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
      return newWeeklyData;
    } catch (err) {
      console.error(`Error fetching weekly data for player ${selectedPlayerId}: ${err.message}`);
      return null;
    }
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
        const newWeeklyData = await fetchPlayerData(selectedPlayerId);
        if (!newWeeklyData) {
          setCheckedPlayers(prev => ({
            ...prev,
            [metricId]: {
              ...prev[metricId],
              [selectedPlayerId]: false,
            },
          }));
          return;
        }
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

  const toggleDropdown = (metricId) => {
    setShowDropdown(prev => ({
      ...prev,
      [metricId]: !prev[metricId],
    }));
  };

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
        value: player.value.toFixed(metricField === 'def_gen_pressures' || metricField === 'hit_as_threw' ? 2 : 1),
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
      const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.awayTeamAbrev}`;
      acc[key] = { opponent, startDate: game.startDate };
      return acc;
    }, {});

    const metrics = [
      { id: 'def_gen_pressures', field: 'def_gen_pressures', title: 'Defense Generated Pressures', max: 50, unit: 'Pressures' },
      { id: 'pressure_to_sack_rate', field: 'pressure_to_sack_rate', title: 'Pressure to Sack Rate (%)', max: 50, unit: 'Pressure to Sack Rate' },
      { id: 'sack_percent', field: 'sack_percent', title: 'Sack Rate (%)', max: 50, unit: 'Sack Rate per Play' },
      { id: 'hit_as_threw', field: 'hit_as_threw', title: 'Hit as Thrown', max: 5, unit: 'Hits' },
      { id: 'avg_time_to_throw', field: 'avg_time_to_throw', title: 'Average Time to Throw', max: 10, unit: 'Avg. Time to Throw' },
    ];

    metrics.forEach(metric => {
      const chartRef = chartRefs[metric.id];
      const canvas = document.getElementById(`${metric.id}Chart`);
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');

      const sortedWeeks = Array.from({ length: 15 }, (_, i) => i + 1).map(week => ({
        week,
        seasonType: 'regular',
        key: `${week}_regular`,
      }));

      const labels = sortedWeeks.map(week => {
        const hasAdditionalPlayers = Object.keys(checkedPlayers[metric.id]).some(pId => checkedPlayers[metric.id][pId]);
        if (hasAdditionalPlayers) return `Week ${week.week}`;
        return opponentLookup[week.key]?.opponent || 'BYE';
      });

      const datasets = [];

      // Main player dataset
      const mainData = sortedWeeks.map(week => {
        const weekData = weeklyGrades[week.key] || {};
        return weekData[metric.field] != null ? Number(weekData[metric.field]) : null;
      });
      if (!mainData.every(v => v == null)) {
        datasets.push({
          label: capitalizeName(allPlayerPercentiles[playerId]?.name) || `Player ${playerId}`,
          data: mainData,
          borderColor: colors[0],
          backgroundColor: colors[0].replace('1)', '0.2)'),
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        });
      }

      // Additional checked players
      Object.keys(checkedPlayers[metric.id])
        .filter(pId => checkedPlayers[metric.id][pId])
        .forEach((pId, idx) => {
          const playerData = sortedWeeks.map(week => {
            const weekData = playerWeeklyData[metric.id][pId]?.[week.key] || {};
            return weekData[metric.field] != null ? Number(weekData[metric.field]) : null;
          });

          if (!playerData.every(v => v == null)) {
            datasets.push({
              label: capitalizeName(allPlayerPercentiles[pId]?.name) || `Player ${pId}`,
              data: playerData,
              borderColor: colors[(idx + 1) % colors.length],
              backgroundColor: colors[(idx + 1) % colors.length].replace('1)', '0.2)'),
              fill: true,
              tension: 0.2,
              pointRadius: 5,
              pointHoverRadius: 7,
            });
          }
        });

      // ✅ Update instead of destroy/recreate
      if (chartRef.current) {
        chartRef.current.data.labels = labels;
        chartRef.current.data.datasets = datasets;
        chartRef.current.update();
      } else {
        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets },
          options: {
            scales: {
              x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
              y: { beginAtZero: true, max: metric.max, ticks: { stepSize: metric.max / 5 }, title: { display: true, text: metric.unit } },
            },
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: { mode: 'index', intersect: false },
              title: {
                display: true,
                text: metric.title,
                font: { size: 16, weight: 'bold' },
                color: '#374151',
              },
            },
            responsive: true,
            maintainAspectRatio: false,
          },
        });
      }
    });
  }, [weeklyGrades, teamGames, checkedPlayers, playerWeeklyData, allPlayerPercentiles, playerId]);

  return (
    <div className="pocket-production-container space-y-4">
      {[
        { id: 'def_gen_pressures', title: 'Def. Generated Pressures' },
        { id: 'pressure_to_sack_rate', title: 'Pressure to Sack Rate (%)' },
        { id: 'sack_percent', title: 'Sack Rate (%)' },
        { id: 'hit_as_threw', title: 'Hit as Thrown' },
        { id: 'avg_time_to_throw', title: 'Average Time to Throw' },
      ].map((metric) => (
        <div key={metric.id} className="sub-container bg-gray-50 p-4 rounded shadow">
          <div className="relative mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-700">Top Performers</h4>
              <button
                onClick={() => toggleDropdown(metric.id)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            {showDropdown[metric.id] && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded shadow-lg mt-2 max-h-64 overflow-y-auto">
                <input
                  type="text"
                  value={searchTerms[metric.id]}
                  onChange={(e) => handleSearchChange(metric.id, e.target.value)}
                  placeholder="Search players..."
                  className="w-full p-2 text-sm text-gray-700 border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <ul className="text-sm text-gray-500">
                  {getTopPerformers(metric.id, searchTerms[metric.id]).map((player, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2 hover:bg-gray-100">
                      <Link to={`/players/qb/${player.playerId}`} className="text-blue-600 hover:underline">
                        {player.name}
                      </Link>
                      <div className="flex items-center">
                        <span className="mr-2">{player.value}</span>
                        <input
                          type="checkbox"
                          checked={!!checkedPlayers[metric.id][player.playerId]}
                          onChange={() => handleCheckboxChange(metric.id, player.playerId)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </li>
                  ))}
                  {getTopPerformers(metric.id, searchTerms[metric.id]).length === 0 && (
                    <li className="p-2 text-center">No players found</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className="w-full" style={{ height: '320px' }}>
            <canvas id={`${metric.id}Chart`} className="w-full"></canvas>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PocketProduction;
