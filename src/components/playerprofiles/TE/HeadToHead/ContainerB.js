import React, { useState, useEffect, useRef, useContext } from 'react';
import Chart from 'chart.js/auto';
import { WeeklyGradesContext } from '../HeadToHead';
import Select from 'react-select';

const ContainerB = ({ player1, player2 }) => {
  const chartRef = useRef(null);
  const weeklyGrades = useContext(WeeklyGradesContext) || { player1: {}, player2: {} };
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatMetric = (metric) => {
    return metric
      ? metric
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Unknown';
  };

  // Fetch available metrics from weekly endpoint and team games
  useEffect(() => {
    const fetchData = async () => {
      if (player1?.playerId && player1?.year) {
        setLoading(true);
        try {
          // Fetch team games for player1
          const gamesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_games/${player1.year}/${player1.playerId}`);
          if (!gamesResponse.ok) throw new Error('Failed to fetch team games');
          const gamesData = await gamesResponse.json();
          console.log('Team games:', gamesData);
          setTeamGames(gamesData || []);

          // Fetch metrics from weekly endpoint (use first available game)
          if (gamesData && gamesData.length > 0) {
            const { week, seasonType } = gamesData[0];
            const statsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_receiving_weekly_all/${player1.playerId}/${player1.year}/${week}/${seasonType}`);
            if (!statsResponse.ok) throw new Error('Failed to fetch weekly stats data');
            const statsData = await statsResponse.json();
            console.log('Player 1 weekly stats:', statsData);
            const excludedMetrics = ['name', 'team', 'playerId', 'year', 'week', 'seasonType', 'opponentID', 'teamID', 'player_id_PFF', 'position', 'player_game_count', 'franchise_id', 'player'];
            const metrics = statsData[0]
              ? Object.keys(statsData[0])
                  .filter(key => !excludedMetrics.includes(key))
                  .map(field => ({
                    value: field,
                    label: formatMetric(field),
                  }))
              : [];
            setAvailableMetrics(metrics);
            setSelectedMetric(metrics.find(m => m.value === 'attempts') || metrics[0] || null); // Default to 'attempts' if available
          } else {
            setAvailableMetrics([]);
            setSelectedMetric(null);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    console.log('Player 1:', player1);
    console.log('ContainerB weeklyGrades:', weeklyGrades);
    fetchData();
  }, [player1, weeklyGrades]);

  // Render chart
  useEffect(() => {
    if (!teamGames.length || !selectedMetric || !weeklyGrades?.player1 || !Object.keys(weeklyGrades?.player1).length) {
      console.warn('Missing data for chart:', {
        teamGamesLength: teamGames.length,
        selectedMetric: selectedMetric,
        player1Grades: weeklyGrades?.player1,
        player2Grades: weeklyGrades?.player2,
      });
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = document.getElementById('metricChartB')?.getContext('2d');
    if (!ctx) {
      console.warn('Canvas not available for metricChartB');
      return;
    }

    // Sort games by startDate
    const sortedGames = [...teamGames].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return isNaN(dateA) || isNaN(dateB) ? a.week - b.week : dateA - dateB;
    });

    // Create opponent lookup
    const opponentLookup = sortedGames.reduce((acc, game) => {
      const key = `${game.week}_${game.seasonType}`;
      const playerTeam = game.team;
      const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.homeTeamAbrev}`;
      acc[key] = { opponent, startDate: game.startDate };
      return acc;
    }, {});

    const labels = sortedGames.map(game => {
      const key = `${game.week}_${game.seasonType}`;
      return opponentLookup[key]?.opponent || `Week ${game.week} (${game.seasonType})`;
    });

    // Prepare datasets for both players
    const datasets = [
      {
        label: player1 ? `${player1.name} ${selectedMetric.label}` : 'Player 1',
        data: sortedGames.map(game => {
          const key = `${game.week}_${game.seasonType}`;
          const weekData = weeklyGrades.player1[key] || {};
          const value = weekData[selectedMetric.value] !== undefined && weekData[selectedMetric.value] !== null ? weekData[selectedMetric.value] : null;
          return value;
        }),
        borderColor: 'rgba(54, 162, 235, 1)', // Blue
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      ...(player2 && weeklyGrades?.player2 && Object.keys(weeklyGrades.player2).length
        ? [
            {
              label: player2 ? `${player2.name} ${selectedMetric.label}` : 'Player 2',
              data: sortedGames.map(game => {
                const key = `${game.week}_${game.seasonType}`;
                const weekData = weeklyGrades.player2[key] || {};
                const value = weekData[selectedMetric.value] !== undefined && weekData[selectedMetric.value] !== null ? weekData[selectedMetric.value] : null;
                return value;
              }),
              borderColor: 'rgba(255, 99, 132, 1)', // Red
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: true,
              tension: 0.2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ]
        : []),
    ];

    // Calculate dynamic y-axis range
    const allData = datasets.flatMap(ds => ds.data.filter(value => value !== null && !isNaN(value)));
    const minValue = allData.length ? Math.min(...allData) : 0;
    const maxValue = allData.length ? Math.max(...allData) : 100;
    const buffer = (maxValue - minValue) * 0.1;
    const yMin = Math.max(0, minValue - buffer);
    const yMax = maxValue + buffer;

    console.log('Chart datasets:', { datasets, labels, selectedMetric });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        scales: {
          x: { title: { display: false, text: 'Opponent' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
          y: { title: { display: true, text: selectedMetric?.label || 'Metric Value' }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
        },
        plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [weeklyGrades, teamGames, selectedMetric, player1, player2]);

  return (
    <div className="bg-white rounded shadow">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Metric Comparison</h2>

      {loading && (
        <div className="flex justify-center mb-2 mt-4">
          <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
        </div>
      )}
      {!loading && (!player1 || !weeklyGrades?.player1 || !Object.keys(weeklyGrades?.player1).length || !teamGames.length) && (
        <div className="text-black text-center">
          No data available for Player 1: {[
            !player1 && 'Missing player1',
            !weeklyGrades?.player1 && 'Missing weeklyGrades.player1',
            weeklyGrades?.player1 && !Object.keys(weeklyGrades.player1).length && 'Empty weeklyGrades.player1',
            !teamGames.length && 'Missing teamGames',
          ]
            .filter(Boolean)
            .join(', ')}
        </div>
      )}
      {!loading && player2 && (!weeklyGrades?.player2 || !Object.keys(weeklyGrades?.player2).length) && (
        <div className="text-black text-center">No data available for Player 2: Missing weeklyGrades.player2</div>
      )}
      <div className="flex justify-center items-center mb-4 mt-4">
        <Select
          value={selectedMetric}
          onChange={setSelectedMetric}
          options={availableMetrics}
          className="w-80"
          classNamePrefix="react-select"
          placeholder="Select Metric..."
          isSearchable={true}
        />
      </div>
      <div className="h-80">
        <canvas id="metricChartB" className="w-full h-full" />
      </div>
    </div>
  );
};

export default ContainerB;