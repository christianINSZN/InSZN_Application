import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const HeadToHeadReport = ({ year, awayTeamId, homeTeamId, gameId }) => {
  const [awayTeamData, setAwayTeamData] = useState(null);
  const [homeTeamData, setHomeTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Metrics');
  const [metrics, setMetrics] = useState([
    { label: 'Points Scored', field: 'pointsScored', awayValue: 0, homeValue: 0 },
    { label: 'Rush Yards', field: 'rushingYards', awayValue: 0, homeValue: 0 },
    { label: 'Pass Yards', field: 'netPassingYards', awayValue: 0, homeValue: 0 },
    { label: 'Total Yards', field: 'totalYards', awayValue: 0, homeValue: 0 },
    { label: 'Rush TDs', field: 'rushingTDs', awayValue: 0, homeValue: 0 },
    { label: 'Pass TDs', field: 'passingTDs', awayValue: 0, homeValue: 0 },
    { label: 'First Downs', field: 'firstDowns', awayValue: 0, homeValue: 0 },
    { label: 'Fumbles Lost', field: 'fumblesLost', awayValue: 0, homeValue: 0 },
    { label: 'Interceptions', field: 'interceptions', awayValue: 0, homeValue: 0 },
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
    { label: 'Interceptions', field: 'interceptions', awayValue: 0, homeValue: 0 },
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
    { label: 'Opp. Fumbles Lost', field: 'fumblesLostOpponent', awayValue: 0, homeValue: 0 },
    { label: 'Opp. Interceptions', field: 'interceptionsOpponent', awayValue: 0, homeValue: 0 },
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
    { label: 'Pass Comp. vs. Def Allowed', homeField: 'passCompletionsOpponent', awayField: 'passCompletions', homeValue: 0, homeValue: 0 },
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

  // Custom styles for react-select
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

  // Format metric labels
  const formatMetric = (metric) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Remove metric from lists
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

  // Add custom metric
  const addCustomMetric = () => {
    if (selectedCustomMetric && !customMetrics.some(metric => metric.field === selectedCustomMetric.value)) {
      const newMetric = {
        label: formatMetric(selectedCustomMetric.value),
        field: selectedCustomMetric.value,
        awayValue: awayTeamData?.[selectedCustomMetric.value] || 0,
        homeValue: homeTeamData?.[selectedCustomMetric.value] || 0,
      };
      setCustomMetrics(prev => [...prev, newMetric]);
      setSelectedCustomMetric(null);
    }
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch away team game stats
        const awayResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/games/recap/${gameId}/${awayTeamId}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!awayResponse.ok) {
          const errorText = await awayResponse.text();
          console.error('Away team response:', awayResponse.status, errorText);
          throw new Error(`Away team game stats not found: ${awayResponse.status} ${errorText}`);
        }
        const awayData = await awayResponse.json();
        setAwayTeamData(awayData);

        // Fetch home team game stats
        const homeResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/games/recap/${gameId}/${homeTeamId}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!homeResponse.ok) {
          const errorText = await homeResponse.text();
          console.error('Home team response:', homeResponse.status, errorText);
          throw new Error(`Home team game stats not found: ${homeResponse.status} ${errorText}`);
        }
        const homeData = await homeResponse.json();
        setHomeTeamData(homeData);

        // Update metrics with fetched data
        setMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          awayValue: awayData[metric.field] || 0,
          homeValue: homeData[metric.field] || 0,
        })));
        setOffenseMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          awayValue: awayData[metric.field] || 0,
          homeValue: homeData[metric.field] || 0,
        })));
        setDefenseMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          awayValue: awayData[metric.field] || 0,
          homeValue: homeData[metric.field] || 0,
        })));
        setHomeOffAwayDefMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          homeValue: homeData[metric.homeField] || 0,
          awayValue: awayData[metric.awayField] || 0,
        })));
        setHomeDefAwayOffMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          homeValue: homeData[metric.homeField] || 0,
          awayValue: awayData[metric.awayField] || 0,
        })));

        // Set available metrics for custom selection
        const metrics1 = Object.keys(awayData).filter(key => !['teamID', 'year', 'school', 'conference'].includes(key));
        const metrics2 = Object.keys(homeData).filter(key => !['teamID', 'year', 'school', 'conference'].includes(key));
        const allMetrics = [...new Set([...metrics1, ...metrics2])];
        setAvailableMetrics(allMetrics.map(field => ({
          value: field,
          label: formatMetric(field),
        })));
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (year && awayTeamId && homeTeamId && gameId) {
      fetchTeamData();
    } else {
      setError('Missing team IDs, year, or game ID');
      setLoading(false);
    }
  }, [year, awayTeamId, homeTeamId, gameId]);

  return (
    <div className="bg-white rounded-lg shadow-xl">
      <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded mb-2">{awayTeamData?.school || 'Away'} vs. {homeTeamData?.school || 'Home'}</h2>
      <div className={isMobile ? "w-full max-w-md mx-auto" : "w-full max-w-md mx-auto"}>
        {loading && (
          <div className="flex justify-center mb-2">
            <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        )}
        {error && <div className="p-4 text-red-500 text-center">{error}</div>}
        {!loading && !error && (
          <>
            <div className="border-b border-gray-300">
              <div className="w-full overflow-x-auto">
                <ul className={isMobile ? "flex gap-4 justify-start p-0 whitespace-nowrap" : "flex gap-8 justify-start p-0 whitespace-nowrap"}>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Metrics' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('Metrics')}
                    >
                      Headline
                    </button>
                  </li>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'HomeDefAwayOff' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('HomeDefAwayOff')}
                    >
                      {awayTeamData?.school || 'Away'} Off. vs {homeTeamData?.school || 'Home'} Def.
                    </button>
                  </li>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'HomeOffAwayDef' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('HomeOffAwayDef')}
                    >
                      {awayTeamData?.school || 'Away'} Def. vs {homeTeamData?.school || 'Home'} Off.
                    </button>
                  </li>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Offense' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('Offense')}
                    >
                      Offense
                    </button>
                  </li>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Defense' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('Defense')}
                    >
                      Defense
                    </button>
                  </li>
                  <li>
                    <button
                      className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Custom' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                      onClick={() => setActiveTab('Custom')}
                    >
                      Custom
                    </button>
                  </li>
                </ul>
              </div>
            </div>
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
            {activeTab === 'HomeOffAwayDef' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {homeOffAwayDefMetrics.length > 0 ? (
                  homeOffAwayDefMetrics.map((metric, index) => {
                    const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                    const totalWidth = 100;
                    const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                    const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center w-full justify-center">
                          <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                          <button
                            onClick={() => removeMetric(metric.homeField, 'homeOffAwayDef')}
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
                  <p className="text-gray-500 text-center text-sm sm:text-base">No Home Off v. Away Def Metrics Available</p>
                )}
              </div>
            )}
            {activeTab === 'HomeDefAwayOff' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {homeDefAwayOffMetrics.length > 0 ? (
                  homeDefAwayOffMetrics.map((metric, index) => {
                    const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                    const totalWidth = 100;
                    const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                    const homeWidth = (metric.homeValue / maxValue) * totalWidth;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="flex items-center w-full justify-center">
                          <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                          <button
                            onClick={() => removeMetric(metric.homeField, 'homeDefAwayOff')}
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
                  <p className="text-gray-500 text-center text-sm sm:text-base">No Home Def v. Away Off Metrics Available</p>
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