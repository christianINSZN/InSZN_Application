// src/components/games/singleGameRecapComponents/TeamAReport.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamAReport = ({ teamName, teamId, year, gameId, gameStats }) => {
  const [showTooltip, setShowTooltip] = useState(null);
  const [passers, setPassers] = useState([]);
  const [rushers, setRushers] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [playerInfo, setPlayerInfo] = useState({});
  const [loading, setLoading] = useState(true);

  const week = gameStats?.week;
  const seasonType = gameStats?.seasonType || 'regular';

  // -----------------------------------------------------------------------
  // DEBUG LOGS
  // -----------------------------------------------------------------------
  console.log('--- TeamAReport Debug ---');
  console.log('teamId:', teamId, 'year:', year, 'week:', week, 'seasonType:', seasonType);
  console.log('gameStats keys:', Object.keys(gameStats || {}));
  console.log('--- End Debug ---');

  const formatFieldPosition = (value) => {
    if (value === undefined) return 'N/A';
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 'N/A';
    const displayValue = numericValue > 50 ? 100 - numericValue : numericValue;
    return `Own ${displayValue.toFixed(1)}`;
  };

  const metrics = [
    {
      key: 'scoring_opportunities_opportunities',
      label: 'Scoring Opportunities',
      tooltip: {
        title: 'Scoring Opportunities',
        definition: 'Number of offensive drives reaching at least the opponent’s 40-yard line.',
        example: '18 means 18 drives in scoring range.',
        why: 'Shows how often the offense creates scoring chances.'
      }
    },
    {
      key: 'scoring_opportunities_points',
      label: 'Points from Scoring Opportunities',
      tooltip: {
        title: 'Points from Scoring Opportunities',
        definition: 'Total points scored on drives reaching the opponent’s 40-yard line or better.',
        example: '67 indicates 67 points on scoring-opportunity drives.',
        why: 'Measures offensive output in scoring position.'
      }
    },
    {
      key: 'scoring_opportunities_points_per_opportunity',
      label: 'Points per Scoring Opportunity',
      tooltip: {
        title: 'Points per Scoring Opportunity',
        definition: 'Average points scored per drive that reaches scoring range (40-yard line).',
        example: '3.7 means 3.7 points per opportunity (FG to TD range).',
        why: 'Shows efficiency converting scoring chances to points.'
      }
    },
    {
      key: 'field_position_average_start',
      label: 'Average Field Position Start',
      tooltip: {
        title: 'Average Field Position Start',
        definition: 'Average starting point of offensive drives from own goal line.',
        example: '62.2 = Own 37.8-yard line (100 - 62.2).',
        why: 'Closer to opponent’s end zone = more scoring chances.'
      }
    },
    {
      key: 'field_position_average_predicted_points',
      label: 'Average Predicted Points',
      tooltip: {
        title: 'Average Predicted Points',
        definition: 'Expected points per drive based on starting field position from historical data.',
        example: '2.08 means each drive expected to yield 2.08 points.',
        why: 'Reflects field position advantage (defense + special teams).'
      }
    }
  ];

  const getMetricValue = (key) => {
    const possibleKeys = [
      key,
      key.replace(/_/g, ''),
      key.replace(/opportunities/g, 'opp'),
      key.replace(/points_per_opportunity/g, 'pp_opp'),
      key.replace(/average/g, 'avg'),
      key.replace(/predicted/g, 'pred')
    ];

    for (const k of possibleKeys) {
      const value = gameStats?.[k];
      if (value !== undefined && value !== null) {
        if (k.includes('points_per_opportunity') || k.includes('predicted_points')) {
          return parseFloat(value).toFixed(2);
        }
        if (k.includes('average_start')) {
          return formatFieldPosition(value);
        }
        return value;
      }
    }
    return 'N/A';
  };

  // -----------------------------------------------------------------------
  // 1. Fetch ALL Players
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!teamId || !week || !year) {
      console.warn('Missing data');
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      const base = process.env.REACT_APP_API_URL;
      const urls = {
        pass: `${base}/api/team_passing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rush: `${base}/api/team_rushing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rec: `${base}/api/team_receiving_weekly/${teamId}/${year}/${week}/${seasonType}`,
      };

      console.log('Fetching players from:', urls);

      try {
        setLoading(true);
        const [pRes, rRes, recRes] = await Promise.all([
          fetch(urls.pass), fetch(urls.rush), fetch(urls.rec)
        ]);

        const parse = async (res, type) => {
          const text = await res.text();
          console.log(`${type} Status:`, res.status, 'Body:', text);
          if (!res.ok) return [];
          try {
            const data = JSON.parse(text);
            console.log(`${type} Count:`, data.length);
            return data;
          } catch (e) {
            console.error(`${type} JSON error:`, e);
            return [];
          }
        };

        const p = await parse(pRes, 'Passing');
        const r = await parse(rRes, 'Rushing');
        const rec = await parse(recRes, 'Receiving');

        setPassers(p);
        setRushers(r);
        setReceivers(rec);

        const playerIds = new Set();
        [...p, ...r, ...rec].forEach(player => {
          if (player?.playerId) playerIds.add(player.playerId);
        });

        if (playerIds.size > 0) {
          fetchPlayerInfo(Array.from(playerIds));
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setLoading(false);
      }
    };

    fetchAll();
  }, [teamId, year, week, seasonType]);

  // -----------------------------------------------------------------------
  // 2. Fetch Player Info
  // -----------------------------------------------------------------------
  const fetchPlayerInfo = async (playerIds) => {
    const base = process.env.REACT_APP_API_URL;
    const url = `${base}/api/player_headline/${year}`;

    try {
      const responses = await Promise.all(
        playerIds.map(id => fetch(`${url}/${id}`))
      );

      const info = {};
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const playerId = playerIds[i];
        const text = await res.text();
        console.log(`Info ${playerId} Status:`, res.status, 'Body:', text);
        if (res.ok) {
          try {
            const data = JSON.parse(text);
            const row = data[0];
            if (row) {
              info[playerId] = {
                name: row.name || 'Unknown',
                position: row.position || 'UNK'
              };
            }
          } catch (e) {
            console.error(`Info JSON error for ${playerId}:`, e);
          }
        }
      }

      console.log('Fetched player info:', info);
      setPlayerInfo(info);
    } catch (err) {
      console.error('Player info fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Top players
  const topPasser = passers[0];
  const topRusher = rushers[0];
  const topReceiver = receivers[0];

  // -----------------------------------------------------------------------
  // Player Link
  // -----------------------------------------------------------------------
  const PlayerLink = ({ player }) => {
    if (!player?.playerId) return <span className="text-gray-500">N/A</span>;
    const info = playerInfo[player.playerId];
    if (!info) return <span className="text-gray-500">Loading...</span>;

    const posPath = info.position.toLowerCase();
    return (
      <Link
        to={`/players/${posPath}/${player.playerId}`}
        className="font-bold text-[#235347] hover:underline"
      >
        {info.name}
      </Link>
    );
  };

  return (
    <div className="space-y-4">
      {/* === Headline Stats === */}
      <div className="border border-gray-300 rounded-lg p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">
          {teamName || 'Away Team'} Headline Stats
        </h2>
        {!gameStats ? (
          <div className="text-gray-500 p-4">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg">
            <table className="w-full text-sm text-left text-black">
              <tbody>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Points Scored</td><td className="py-2 px-4 w-1/3">{gameStats.points || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Total Yards</td><td className="py-2 px-4 w-1/3">{gameStats.totalYards || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Passing Yards</td><td className="py-2 px-4 w-1/3">{gameStats.netPassingYards || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Rushing Yards</td><td className="py-2 px-4 w-1/3">{gameStats.rushingYards || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">First Downs</td><td className="py-2 px-4 w-1/3">{gameStats.firstDowns || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Turnovers</td><td className="py-2 px-4 w-1/3">{gameStats.turnovers || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Penalties</td><td className="py-2 px-4 w-1/3">{gameStats.totalPenaltiesYards || '0'}</td></tr>
                <tr className="border-b"><td className="py-2 px-4 font-bold">Time of Possession</td><td className="py-2 px-4 w-1/3">{gameStats.possessionTime || '0'}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === Advanced Game Metrics === */}
      <div className="border border-gray-300 rounded-lg p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">
          {teamName || 'Away Team'} Advanced Game Metrics
        </h2>
        {!gameStats ? (
          <div className="text-gray-500 p-4">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg">
            <table className="w-full text-sm text-left text-black">
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.key} className="border-b">
                    <td className="py-2 px-4 font-bold flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowTooltip(metric.tooltip)}
                        className="w-3 h-3 bg-[#235347] text-white text-xs rounded-full flex items-center justify-center hover:bg-black mr-1"
                        title={metric.label}
                      >
                        ?
                      </button>
                      {metric.label}
                    </td>
                    <td className="py-2 px-4 w-1/3">{getMetricValue(metric.key)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === Key Performers === */}
      <div className="border border-gray-300 rounded-lg p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">
          {teamName || 'Away Team'} Key Performers
        </h2>
        <div className="bg-white rounded-lg shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading players...</div>
          ) : (
            <table className="w-full text-sm text-left text-black">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">
                    {topPasser ? <PlayerLink player={topPasser} /> : 'N/A'}
                  </td>
                  <td className="py-2 px-4 w-1/3 text-right">
                    {topPasser?.yards ?? 0} Pass Yds
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">
                    {topRusher ? <PlayerLink player={topRusher} /> : 'N/A'}
                  </td>
                  <td className="py-2 px-4 w-1/3 text-right">
                    {topRusher?.yards ?? 0} Rush Yds
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">
                    {topReceiver ? <PlayerLink player={topReceiver} /> : 'N/A'}
                  </td>
                  <td className="py-2 px-4 w-1/3 text-right">
                    {topReceiver?.yards ?? 0} Rec Yds
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowTooltip(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#235347]">{showTooltip.title}</h3>
              <button onClick={() => setShowTooltip(null)} className="text-gray-500 hover:text-black text-xl font-bold">×</button>
            </div>
            <div className="text-sm text-gray-700 space-y-4">
              <div><strong className="text-[#235347] block mb-1">Definition</strong><p>{showTooltip.definition}</p></div>
              <div><strong className="text-[#235347] block mb-1">Example</strong><p>{showTooltip.example}</p></div>
              <div><strong className="text-[#235347] block mb-1">Why It Matters</strong><p>{showTooltip.why}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAReport;