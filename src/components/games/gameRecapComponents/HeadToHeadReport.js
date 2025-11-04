// src/components/games/singleGameRecapComponents/HeadToHeadReport.js
import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const HeadToHeadReport = ({
  year,
  awayTeamId,
  homeTeamId,
  gameId,
  awayStats,
  homeStats,
}) => {
  const [activeTab, setActiveTab] = useState('Metrics');
  const [gameBoxScore, setGameBoxScore] = useState(null);
  const [loadingBoxScore, setLoadingBoxScore] = useState(true);

  const [metrics, setMetrics] = useState([
    { label: 'Points Scored', field: 'points', awayValue: 0, homeValue: 0 },
    { label: 'Rush Yards', field: 'rushingYards', awayValue: 0, homeValue: 0 },
    { label: 'Pass Yards', field: 'netPassingYards', awayValue: 0, homeValue: 0 },
    { label: 'Total Yards', field: 'totalYards', awayValue: 0, homeValue: 0 },
    { label: 'Rush TDs', field: 'rushingTDs', awayValue: 0, homeValue: 0 },
    { label: 'Pass TDs', field: 'passingTDs', awayValue: 0, homeValue: 0 },
    { label: 'First Downs', field: 'firstDowns', awayValue: 0, homeValue: 0 },
    { label: 'Fumbles Lost', field: 'fumblesLost', awayValue: 0, homeValue: 0 },
    { label: 'Interceptions', field: 'interceptions', awayValue: 0, homeValue: 0 },
    { label: 'Total Penalties', field: 'totalPenalties', awayValue: 0, homeValue: 0 },
    { label: 'Penalty Yards', field: 'penaltyYards', awayValue: 0, homeValue: 0 },
  ]);

  const [offenseMetrics, setOffenseMetrics] = useState([
    { label: 'Rush Attempts', field: 'rushingAttempts', awayValue: 0, homeValue: 0 },
    { label: 'Rush Yards', field: 'rushingYards', awayValue: 0, homeValue: 0 },
    { label: 'Rush TDs', field: 'rushingTDs', awayValue: 0, homeValue: 0 },
    { label: 'Pass Attempts', field: 'passAttempts', awayValue: 0, homeValue: 0 },
    { label: 'Pass Completions', field: 'passCompletions', awayValue: 0, homeValue: 0 },
    { label: 'Pass Yards', field: 'netPassingYards', awayValue: 0, homeValue: 0 },
    { label: 'Pass TDs', field: 'passingTDs', awayValue: 0, homeValue: 0 },
    { label: 'Total Yards', field: 'totalYards', awayValue: 0, homeValue: 0 },
    { label: 'First Downs', field: 'firstDowns', awayValue: 0, homeValue: 0 },
    { label: '4th Down Conversions', field: 'fourthDownConversions', awayValue: 0, homeValue: 0 },
    { label: 'Fumbles Lost', field: 'fumblesLost', awayValue: 0, homeValue: 0 },
    { label: 'Interceptions Thrown', field: 'interceptions', awayValue: 0, homeValue: 0 },
  ]);

  const [defenseMetrics, setDefenseMetrics] = useState([
    { label: 'Opp. Rush Attempts', field: 'rushingAttemptsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Rush Yards', field: 'rushingYardsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Rush TDs', field: 'rushingTDsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Pass Attempts', field: 'passAttemptsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Pass Completions', field: 'passCompletionsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Pass Yards', field: 'netPassingYardsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Pass TDs', field: 'passingTDsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Total Yards', field: 'totalYardsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. First Downs', field: 'firstDownsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. 4th Down Conv.', field: 'fourthDownConversionsOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Fumbles Recovered', field: 'fumblesLostOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Interceptions', field: 'interceptionsOpponent', awayValue: 0, homeValue: 0 },
  ]);

  const [homeOffAwayDefMetrics, setHomeOffAwayDefMetrics] = useState([
    { label: 'Allowed Rush Att. vs. Off Produced', homeField: 'rushingAttempts', awayField: 'rushingAttemptsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Rush Yards vs. Off Produced', homeField: 'rushingYards', awayField: 'rushingYardsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Rush TDs vs. Off Produced', homeField: 'rushingTDs', awayField: 'rushingTDsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Pass Att. vs. Off Produced', homeField: 'passAttempts', awayField: 'passAttemptsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Pass Comp. vs. Off Produced', homeField: 'passCompletions', awayField: 'passCompletionsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Pass Yards vs. Off Produced', homeField: 'netPassingYards', awayField: 'netPassingYardsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Pass TDs vs. Off Produced', homeField: 'passingTDs', awayField: 'passingTDsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed Total Yards vs. Off Produced', homeField: 'totalYards', awayField: 'totalYardsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed 1st Downs vs. Off Produced', homeField: 'firstDowns', awayField: 'firstDownsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Allowed 4th Down Conv. vs. Off Produced', homeField: 'fourthDownConversions', awayField: 'fourthDownConversionsOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Produced Fumbles vs. Off Allowed', homeField: 'fumblesLost', awayField: 'fumblesLostOpponent', homeValue: 0, awayValue: 0 },
    { label: 'Produced INTs vs. Off Allowed', homeField: 'interceptions', awayField: 'interceptionsOpponent', homeValue: 0, awayValue: 0 },
  ]);

  const [homeDefAwayOffMetrics, setHomeDefAwayOffMetrics] = useState([
    { label: 'Rush Att. vs. Def Allowed', homeField: 'rushingAttemptsOpponent', awayField: 'rushingAttempts', homeValue: 0, awayValue: 0 },
    { label: 'Rush Yards vs. Def Allowed', homeField: 'rushingYardsOpponent', awayField: 'rushingYards', homeValue: 0, awayValue: 0 },
    { label: 'Rush TDs vs. Def Allowed', homeField: 'rushingTDsOpponent', awayField: 'rushingTDs', homeValue: 0, awayValue: 0 },
    { label: 'Pass Att. vs. Def Allowed', homeField: 'passAttemptsOpponent', awayField: 'passAttempts', homeValue: 0, awayValue: 0 },
    { label: 'Pass Comp. vs. Def Allowed', homeField: 'passCompletionsOpponent', awayField: 'passCompletions', homeValue: 0, awayValue: 0 },
    { label: 'Pass Yards vs. Def Allowed', homeField: 'netPassingYardsOpponent', awayField: 'netPassingYards', homeValue: 0, awayValue: 0 },
    { label: 'Pass TDs vs. Def Allowed', homeField: 'passingTDsOpponent', awayField: 'passingTDs', homeValue: 0, awayValue: 0 },
    { label: 'Total Yards vs. Def Allowed', homeField: 'totalYardsOpponent', awayField: 'totalYards', homeValue: 0, awayValue: 0 },
    { label: '1st Downs vs. Def Allowed', homeField: 'firstDownsOpponent', awayField: 'firstDowns', homeValue: 0, awayValue: 0 },
    { label: '4th Down Conv. vs. Def Allowed', homeField: 'fourthDownConversionsOpponent', awayField: 'fourthDownConversions', homeValue: 0, awayValue: 0 },
    { label: 'Fumbles vs. Def Produced', homeField: 'fumblesLostOpponent', awayField: 'fumblesLost', homeValue: 0, awayValue: 0 },
    { label: 'INTs vs. Def Produced', homeField: 'interceptionsOpponent', awayField: 'interceptions', homeValue: 0, awayValue: 0 },
  ]);

  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedCustomMetric, setSelectedCustomMetric] = useState(null);
  const [customMetrics, setCustomMetrics] = useState([]);

  const isMobile = window.innerWidth < 640;

  const selectStyles = {
    control: (provided) => ({
      ...provided,
      fontSize: isMobile ? '12px' : '14px',
    }),
    menu: (provided) => ({
      ...provided,
      fontSize: isMobile ? '12px' : '14px',
    }),
    option: (provided) => ({
      ...provided,
      fontSize: isMobile ? '12px' : '14px',
    }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: isMobile ? '12px' : '14px',
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: isMobile ? '12px' : '14px',
    }),
  };

  const formatMetric = (metric) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const removeMetric = (field, type) => {
    if (type === 'metrics') {
      setMetrics(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'custom') {
      setCustomMetrics(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'offense') {
      setOffenseMetrics(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'defense') {
      setDefenseMetrics(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'homeOffAwayDef') {
      setHomeOffAwayDefMetrics(prev => prev.filter(metric => metric.homeField !== field));
    } else if (type === 'homeDefAwayOff') {
      setHomeDefAwayOffMetrics(prev => prev.filter(metric => metric.homeField !== field));
    }
  };

  const addCustomMetric = () => {
    if (selectedCustomMetric && !customMetrics.some(metric => metric.field === selectedCustomMetric.value)) {
      const newMetric = {
        label: formatMetric(selectedCustomMetric.value),
        field: selectedCustomMetric.value,
        awayValue: awayStats?.[selectedCustomMetric.value] || 0,
        homeValue: homeStats?.[selectedCustomMetric.value] || 0,
      };
      setCustomMetrics(prev => [...prev, newMetric]);
      setSelectedCustomMetric(null);
    }
  };

  // -------------------------------------------------------------------------
  // Fetch Box Score
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchBoxScore = async () => {
      try {
        setLoadingBoxScore(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_games`);
        const games = await response.json();

        const currentGame = games.find(g => g.id === parseInt(gameId));
        if (currentGame) {
          const parseLineScores = (lineStr) => {
            if (!lineStr) return [];
            try {
              return JSON.parse(lineStr);
            } catch {
              return [];
            }
          };

          const homeScores = parseLineScores(currentGame.homeLineScores);
          const awayScores = parseLineScores(currentGame.awayLineScores);

          const formatQuarter = (score, idx) => {
            if (idx < 4) return `Q${idx + 1}: ${score}`;
            return `OT${idx - 3}: ${score}`;
          };

          setGameBoxScore({
            homeTeam: currentGame.homeTeam,
            awayTeam: currentGame.awayTeam,
            homeFinal: currentGame.homePoints,
            awayFinal: currentGame.awayPoints,
            homeQuarters: homeScores.map((s, i) => formatQuarter(s, i)),
            awayQuarters: awayScores.map((s, i) => formatQuarter(s, i)),
          });
        }
      } catch (err) {
        console.error('Failed to load box score:', err);
      } finally {
        setLoadingBoxScore(false);
      }
    };

    if (gameId) fetchBoxScore();
  }, [gameId]);

  // -------------------------------------------------------------------------
  // Update Metrics
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (awayStats && homeStats) {
      const parsePenalties = (value) => {
        if (!value || typeof value !== 'string') return { penalties: 0, yards: 0 };
        const [penalties, yards] = value.split('-').map(Number);
        return { penalties: penalties || 0, yards: yards || 0 };
      };
      const awayPenalties = parsePenalties(awayStats.totalPenaltiesYards);
      const homePenalties = parsePenalties(homeStats.totalPenaltiesYards);

      const parseCompletions = (value) => {
        if (!value || typeof value !== 'string') return { completions: 0, attempts: 0 };
        const [completions, attempts] = value.split('-').map(Number);
        return { completions: completions || 0, attempts: attempts || 0 };
      };
      const awayCompletions = parseCompletions(awayStats.completionAttempts);
      const homeCompletions = parseCompletions(homeStats.completionAttempts);

      setMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          awayValue:
            metric.field === 'totalPenalties' ? awayPenalties.penalties :
            metric.field === 'penaltyYards' ? awayPenalties.yards :
            awayStats[metric.field] || 0,
          homeValue:
            metric.field === 'totalPenalties' ? homePenalties.penalties :
            metric.field === 'penaltyYards' ? homePenalties.yards :
            homeStats[metric.field] || 0,
        }))
      );

      setOffenseMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          awayValue:
            metric.field === 'passCompletions' ? awayCompletions.completions :
            metric.field === 'passAttempts' ? awayCompletions.attempts :
            awayStats[metric.field] || 0,
          homeValue:
            metric.field === 'passCompletions' ? homeCompletions.completions :
            metric.field === 'passAttempts' ? homeCompletions.attempts :
            homeStats[metric.field] || 0,
        }))
      );

      setDefenseMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          awayValue:
            metric.field === 'passCompletionsOpponent' ? homeCompletions.completions :
            metric.field === 'passAttemptsOpponent' ? homeCompletions.attempts :
            awayStats[metric.field] || homeStats[metric.field.replace('Opponent', '')] || 0,
          homeValue:
            metric.field === 'passCompletionsOpponent' ? awayCompletions.completions :
            metric.field === 'passAttemptsOpponent' ? awayCompletions.attempts :
            homeStats[metric.field] || awayStats[metric.field.replace('Opponent', '')] || 0,
        }))
      );

      setHomeOffAwayDefMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          homeValue: homeStats[metric.homeField] || 0,
          awayValue:
            metric.awayField === 'passCompletionsOpponent' ? homeCompletions.completions :
            metric.awayField === 'passAttemptsOpponent' ? homeCompletions.attempts :
            awayStats[metric.awayField] || homeStats[metric.awayField.replace('Opponent', '')] || 0,
        }))
      );

      setHomeDefAwayOffMetrics(prevMetrics =>
        prevMetrics.map(metric => ({
          ...metric,
          homeValue:
            metric.homeField === 'passCompletionsOpponent' ? awayCompletions.completions :
            metric.homeField === 'passAttemptsOpponent' ? awayCompletions.attempts :
            homeStats[metric.homeField] || awayStats[metric.homeField.replace('Opponent', '')] || 0,
          awayValue: awayStats[metric.awayField] || 0,
        }))
      );

      const metrics1 = Object.keys(awayStats).filter(key => !['game_id', 'season', 'week', 'seasonType', 'team_id', 'team', 'conference', 'homeAway'].includes(key));
      const metrics2 = Object.keys(homeStats).filter(key => !['game_id', 'season', 'week', 'seasonType', 'team_id', 'team', 'conference', 'homeAway'].includes(key));
      const allMetrics = [...new Set([...metrics1, ...metrics2, 'totalPenalties', 'penaltyYards', 'passCompletions', 'passAttempts'])];
      setAvailableMetrics(allMetrics.map(field => ({
        value: field,
        label: formatMetric(field),
      })));
    }
  }, [awayStats, homeStats]);

  // -------------------------------------------------------------------------
  // Render Box Score
  // -------------------------------------------------------------------------
  const renderBoxScore = () => {
    if (loadingBoxScore) return <div className="text-center text-xs text-gray-500">Loading score...</div>;
    if (!gameBoxScore) return null;

    const { homeTeam, awayTeam, homeFinal, awayFinal, homeQuarters, awayQuarters } = gameBoxScore;
    const maxQuarters = Math.max(homeQuarters.length, awayQuarters.length, 4);

    const headers = ['TEAM'];
    for (let i = 0; i < maxQuarters; i++) {
      headers.push(i < 4 ? `Q${i + 1}` : `OT${i - 3}`);
    }
    headers.push('Final');

    return (
      <div className="bg-gray-50 border border-gray-300 rounded-lg mb-3 text-xs overflow-x-auto">
        <table className="w-full text-center table-auto border-collapse">
          <thead className="bg-[#235347] text-white font-bold">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-2 py-1 border border-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Away Team Row */}
            <tr className="font-semibold">
              <td className="text-left pl-2 border border-gray-400">{awayTeam}</td>
              {Array.from({ length: maxQuarters }).map((_, i) => (
                <td key={i} className="border border-gray-400">
                  {/* Extract number only */}
                  {awayQuarters[i] ? awayQuarters[i].split(': ')[1] : '-'}
                </td>
              ))}
              <td className="font-bold border border-gray-400">{awayFinal}</td>
            </tr>
            {/* Home Team Row */}
            <tr className="font-semibold">
              <td className="text-left pl-2 border border-gray-400">{homeTeam}</td>
              {Array.from({ length: maxQuarters }).map((_, i) => (
                <td key={i} className="border border-gray-400">
                  {homeQuarters[i] ? homeQuarters[i].split(': ')[1] : '-'}
                </td>
              ))}
              <td className="font-bold border border-gray-400">{homeFinal}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div className="bg-white rounded-lg shadow-xl">
      {/* BOX SCORE */}
      {renderBoxScore()}

      {/* TITLE */}
      <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded mb-2">
        {awayStats?.team || 'Away'} vs. {homeStats?.team || 'Home'}
      </h2>

      {/* TABS */}
      <div className="border-b border-gray-300">
        <div className="w-full overflow-x-hidden">
          <ul className={isMobile ? "flex gap-2 justify-center p-0 whitespace-nowrap" : "flex gap-4 justify-center p-0 whitespace-nowrap"}>
            <li>
              <button
                className={`text-[#235347] hover:text-[#235347] pb-1 text-xs border-b-2 ${activeTab === 'Metrics' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                onClick={() => setActiveTab('Metrics')}
              >
                Headline
              </button>
            </li>
            <li>
              <button
                className={`text-[#235347] hover:text-[#235347] pb-1 text-xs border-b-2 ${activeTab === 'Offense' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                onClick={() => setActiveTab('Offense')}
              >
                Offense
              </button>
            </li>
            <li>
              <button
                className={`text-[#235347] hover:text-[#235347] pb-1 text-xs border-b-2 ${activeTab === 'Defense' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                onClick={() => setActiveTab('Defense')}
              >
                Defense
              </button>
            </li>
            {/* <li>
              <button
                className={`text-[#235347] hover:text-[#235347] pb-1 text-xs border-b-2 ${activeTab === 'Custom' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                onClick={() => setActiveTab('Custom')}
              >
                Custom
              </button>
            </li> */}
          </ul>
        </div>
      </div>

      {/* CONTENT */}
      <div className={isMobile ? "w-full max-w-md mx-auto" : "w-full max-w-md mx-auto"}>
        {(!awayStats || !homeStats) && (
          <div className="p-4 text-black text-center">Loading Game Stats...</div>
        )}
        {awayStats && homeStats && (
          <>
            {activeTab === 'Metrics' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {metrics.map((metric, index) => {
                  const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                  const totalWidth = 100;
                  const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                  const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="flex items-center w-full justify-center">
                        <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                        <button
                          onClick={() => removeMetric(metric.field, 'metrics')}
                          className="ml-2 text-gray-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className={isMobile ? "w-[100%] flex justify-center relative" : "w-[130%] flex justify-center relative"} style={{ height: isMobile ? '16px' : '24px' }}>
                        <div className="w-5/6 flex">
                          <div
                            className={isMobile ? "bg-blue-800 h-4 rounded-l flex items-center ml-1" : "bg-blue-800 h-6 rounded-l flex items-center ml-1"}
                            style={{ width: `${awayWidth}%` }}
                          >
                            <span className="ml-2 text-white text-xs">{metric.awayValue}</span>
                          </div>
                          <div
                            className={isMobile ? "bg-rose-800 h-4 rounded-r flex items-center justify-end mr-1" : "bg-rose-800 h-6 rounded-r flex items-center justify-end mr-1"}
                            style={{ width: `${homeWidth}%` }}
                          >
                            <span className="mr-2 text-white text-xs">{metric.homeValue}</span>
                          </div>
                        </div>
                        <div
                          className="absolute w-[1px] bg-black"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: isMobile ? '16px' : '24px' }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'Offense' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {offenseMetrics.length > 0 ? (
                  offenseMetrics.map((metric, index) => {
                    const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                    const totalWidth = 100;
                    const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                    const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center w-full justify-center">
                          <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                          <button
                            onClick={() => removeMetric(metric.field, 'offense')}
                            className="ml-2 text-gray-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className={isMobile ? "w-[100%] flex justify-center relative" : "w-[130%] flex justify-center relative"} style={{ height: isMobile ? '16px' : '24px' }}>
                          <div className="w-5/6 flex">
                            <div
                              className={isMobile ? "bg-blue-800 h-4 rounded-l flex items-center ml-1" : "bg-blue-800 h-6 rounded-l flex items-center ml-1"}
                              style={{ width: `${awayWidth}%` }}
                            >
                              <span className="ml-2 text-white text-xs">{metric.awayValue}</span>
                            </div>
                            <div
                              className={isMobile ? "bg-rose-800 h-4 rounded-r flex items-center justify-end mr-1" : "bg-rose-800 h-6 rounded-r flex items-center justify-end mr-1"}
                              style={{ width: `${homeWidth}%` }}
                            >
                              <span className="mr-2 text-white text-xs">{metric.homeValue}</span>
                            </div>
                          </div>
                          <div
                            className="absolute w-[1px] bg-black"
                            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: isMobile ? '16px' : '24px' }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center text-sm sm:text-base">No Offense Metrics Available</p>
                )}
              </div>
            )}

            {activeTab === 'Defense' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {defenseMetrics.length > 0 ? (
                  defenseMetrics.map((metric, index) => {
                    const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                    const totalWidth = 100;
                    const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                    const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center w-full justify-center">
                          <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                          <button
                            onClick={() => removeMetric(metric.field, 'defense')}
                            className="ml-2 text-gray-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className={isMobile ? "w-[100%] flex justify-center relative" : "w-[130%] flex justify-center relative"} style={{ height: isMobile ? '16px' : '24px' }}>
                          <div className="w-5/6 flex">
                            <div
                              className={isMobile ? "bg-blue-800 h-4 rounded-l flex items-center ml-1" : "bg-blue-800 h-6 rounded-l flex items-center ml-1"}
                              style={{ width: `${awayWidth}%` }}
                            >
                              <span className="ml-2 text-white text-xs">{metric.awayValue}</span>
                            </div>
                            <div
                              className={isMobile ? "bg-rose-800 h-4 rounded-r flex items-center justify-end mr-1" : "bg-rose-800 h-6 rounded-r flex items-center justify-end mr-1"}
                              style={{ width: `${homeWidth}%` }}
                            >
                              <span className="mr-2 text-white text-xs">{metric.homeValue}</span>
                            </div>
                          </div>
                          <div
                            className="absolute w-[1px] bg-black"
                            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: isMobile ? '16px' : '24px' }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center text-sm sm:text-base">No Defense Metrics Available</p>
                )}
              </div>
            )}

            {activeTab === 'Custom' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                <div className="flex justify-center items-center mb-4">
                  <Select
                    value={selectedCustomMetric}
                    onChange={setSelectedCustomMetric}
                    options={availableMetrics}
                    className={isMobile ? "w-48 mr-2" : "w-80 mr-2"}
                    classNamePrefix="react-select"
                    placeholder="Select Metric..."
                    isSearchable={true}
                    styles={selectStyles}
                  />
                  <button
                    onClick={addCustomMetric}
                    className={isMobile ? "w-6 h-6 flex justify-center items-center rounded-full bg-blue-500 text-white hover:bg-blue-700 text-xs" : "w-8 h-8 flex justify-center items-center rounded-full bg-blue-500 text-white hover:bg-blue-700"}
                    disabled={!selectedCustomMetric}
                  >
                    +
                  </button>
                </div>
                {customMetrics.length > 0 ? (
                  customMetrics.map((metric, index) => {
                    const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                    const totalWidth = 100;
                    const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                    const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center w-full justify-center">
                          <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                          <button
                            onClick={() => removeMetric(metric.field, 'custom')}
                            className="ml-2 text-gray-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className={isMobile ? "w-[100%] flex justify-center relative" : "w-[130%] flex justify-center relative"} style={{ height: isMobile ? '16px' : '24px' }}>
                          <div className="w-5/6 flex">
                            <div
                              className={isMobile ? "bg-blue-800 h-4 rounded-l flex items-center ml-1" : "bg-blue-800 h-6 rounded-l flex items-center ml-1"}
                              style={{ width: `${awayWidth}%` }}
                            >
                              <span className="ml-2 text-white text-xs">{metric.awayValue}</span>
                            </div>
                            <div
                              className={isMobile ? "bg-rose-800 h-4 rounded-r flex items-center justify-end mr-1" : "bg-rose-800 h-6 rounded-r flex items-center justify-end mr-1"}
                              style={{ width: `${homeWidth}%` }}
                            >
                              <span className="mr-2 text-white text-xs">{metric.homeValue}</span>
                            </div>
                          </div>
                          <div
                            className="absolute w-[1px] bg-black"
                            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: isMobile ? '16px' : '24px' }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center text-sm sm:text-base">Please Select a Metric</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HeadToHeadReport;