import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Select from 'react-select';

const HeadToHeadContainer = ({ className, onPlayerDataChange, year }) => {
  const { playerId: urlPlayerId } = useParams();
  const location = useLocation();
  const defaultYear = year || location.state?.year || localStorage.getItem('selectedYear') || '2025';
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [year1, setYear1] = useState(defaultYear);
  const [year2, setYear2] = useState(defaultYear);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [yearOptions1, setYearOptions1] = useState([]);
  const [yearOptions2, setYearOptions2] = useState([{ value: Number(defaultYear), label: defaultYear.toString() }]);
  const [headshotUrl1, setHeadshotUrl1] = useState(null);
  const [headshotUrl2, setHeadshotUrl2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([
    { label: 'Games Played', field: 'player_game_count', p1Value: 0, p2Value: 0 },
    { label: 'Attempts', field: 'attempts', p1Value: 0, p2Value: 0 },
    { label: 'Yards', field: 'yards', p1Value: 0, p2Value: 0 },
    { label: 'YPA', field: 'ypa', p1Value: 0, p2Value: 0 },
    { label: 'Gap Attempts', field: 'gap_attempts', p1Value: 0, p2Value: 0 },
    { label: 'Zone Attempts', field: 'zone_attempts', p1Value: 0, p2Value: 0 },
    { label: 'Yards After Contact', field: 'yards_after_contact', p1Value: 0, p2Value: 0 },
    { label: 'Yards After Contact (per Att.)', field: 'yco_attempt', p1Value: 0, p2Value: 0 },
    { label: 'Breakaway Yards', field: 'breakaway_yards', p1Value: 0, p2Value: 0 },
    { label: 'Breakaway (%)', field: 'breakaway_percent', p1Value: 0, p2Value: 0 },
    { label: 'Longest (Run)', field: 'longest_rushing', p1Value: 0, p2Value: 0 },
    { label: 'TD (Rushing)', field: 'touchdowns_rushing', p1Value: 0, p2Value: 0 },
    { label: 'Fumbles', field: 'fumbles', p1Value: 0, p2Value: 0 },
    { label: 'Receiving Yards', field: 'rec_yards', p1Value: 0, p2Value: 0 },
    { label: 'Yards per Pass Route Run', field: 'yprr', p1Value: 0, p2Value: 0 },
    { label: 'TD (Receiving)', field: 'touchdowns_receiving', p1Value: 0, p2Value: 0 },
  ]);
  const [metricsGrades, setMetricsGrades] = useState([
    { label: 'Offense Grade', field: 'grades_offense', p1Value: 0, p2Value: 0 },
    { label: 'Run Grade', field: 'grades_run', p1Value: 0, p2Value: 0 },
    { label: 'Receiving Grade', field: 'grades_pass_route', p1Value: 0, p2Value: 0 },
    { label: 'Ball Security Grade', field: 'grades_hands_fumble', p1Value: 0, p2Value: 0 },
    { label: 'Penalty Aversion Grade', field: 'grades_offense_penalty', p1Value: 0, p2Value: 0 },
  ]);
  const [customMetrics, setCustomMetrics] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedCustomMetric, setSelectedCustomMetric] = useState(null);
  const [activeTab, setActiveTab] = useState('Metrics');
  const isMobile = window.innerWidth < 640;
  const excludedMetrics = ['name', 'playerId', 'year', 'team', 'school', 'position'];

  // Custom styles for react-select to reduce text size on mobile
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

  useEffect(() => {
    localStorage.setItem('selectedYear', year1);
  }, [year1]);

  const formatMetric = (metric) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const removeMetric = (field, type) => {
    if (type === 'metrics') {
      setMetrics(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'grades') {
      setMetricsGrades(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'custom') {
      setCustomMetrics(prev => prev.filter(metric => metric.field !== field));
    }
  };

  const addCustomMetric = () => {
    if (selectedCustomMetric && !customMetrics.some(metric => metric.field === selectedCustomMetric.value)) {
      const newMetric = {
        label: formatMetric(selectedCustomMetric.value),
        field: selectedCustomMetric.value,
        p1Value: 0,
        p2Value: 0,
      };
      setCustomMetrics(prev => [...prev, newMetric]);
      if (player1 && year1) {
        fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${urlPlayerId}/${year1}`)
          .then(response => response.json())
          .then(statsData => {
            if (statsData && Object.keys(statsData).length > 0) {
              setCustomMetrics(prev => prev.map(metric =>
                metric.field === newMetric.field
                  ? { ...metric, p1Value: statsData[metric.field] || 0 }
                  : metric
              ));
            }
          })
          .catch(error => console.error(`Error fetching Player 1 data for custom metric ${newMetric.field}:`, error));
      }
      if (player2 && year2) {
        fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${player2.value}/${year2}`)
          .then(response => response.json())
          .then(statsData => {
            if (statsData && Object.keys(statsData).length > 0) {
              setCustomMetrics(prev => prev.map(metric =>
                metric.field === newMetric.field
                  ? { ...metric, p2Value: statsData[metric.field] || 0 }
                  : metric
              ));
            }
          })
          .catch(error => console.error(`Error fetching Player 2 data for custom metric ${newMetric.field}:`, error));
      }
      setSelectedCustomMetric(null);
    }
  };

  useEffect(() => {
    if (urlPlayerId && !player1) {
      const initialPlayer = playerOptions.find(p => p.value === urlPlayerId);
      if (initialPlayer) {
        setPlayer1(initialPlayer);
      } else {
        setPlayer1({ value: urlPlayerId, label: 'Loading...' });
      }
    }
  }, [urlPlayerId, playerOptions]);

  useEffect(() => {
    if (onPlayerDataChange && player1 && year1) {
      onPlayerDataChange({
        player1: { playerId: urlPlayerId, year: year1, name: player1.label },
        player2: player2 && year2 ? { playerId: player2.value, year: year2, name: player2.label } : null,
      });
    }
  }, [player1, year1, player2, year2, onPlayerDataChange, urlPlayerId]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_rb_list`);
        const data = await response.json();
        const uniquePlayers = Array.from(
          new Map(data.map(player => [player.playerId, player])).values()
        );
        const options = uniquePlayers.map(player => ({
          value: player.playerId,
          label: player.name,
        }));
        setPlayerOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
        if (urlPlayerId && !player1) {
          const initialPlayer = options.find(p => p.value === urlPlayerId);
          if (initialPlayer) setPlayer1(initialPlayer);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    fetchPlayers();
  }, [urlPlayerId, player1]);

  useEffect(() => {
    const fetchAvailableMetrics = async () => {
      if (player1 && year1 && player2 && year2) {
        try {
          const [statsResponse1, statsResponse2] = await Promise.all([
            fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${urlPlayerId}/${year1}`),
            fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${player2.value}/${year2}`),
          ]);
          if (!statsResponse1.ok) throw new Error(`Failed to fetch stats data for Player 1: ${await statsResponse1.text()}`);
          if (!statsResponse2.ok) throw new Error(`Failed to fetch stats data for Player 2: ${await statsResponse2.text()}`);
          const [statsData1, statsData2] = await Promise.all([statsResponse1.json(), statsResponse2.json()]);
          const metrics1 = Object.keys(statsData1).filter(key => !excludedMetrics.includes(key));
          const metrics2 = Object.keys(statsData2).filter(key => !excludedMetrics.includes(key));
          const allMetrics = [...new Set([...metrics1, ...metrics2])];
          setAvailableMetrics(allMetrics.map(field => ({
            value: field,
            label: formatMetric(field),
          })));
        } catch (error) {
          console.error('Error fetching available metrics:', error);
        }
      }
    };
    fetchAvailableMetrics();
  }, [player1, year1, player2, year2]);

  useEffect(() => {
    const fetchData1 = async () => {
      if (player1 && year1) {
        setLoading(true);
        try {
          console.log(`Fetching data for Player 1 ID: ${urlPlayerId}, Year: ${year1}`);
          const metadataResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata_rb/${urlPlayerId}`);
          if (!metadataResponse.ok) throw new Error(`HTTP error! status: ${metadataResponse.status}`);
          const metadataData = await metadataResponse.json();
          if (!Array.isArray(metadataData)) throw new Error('API response is not an array');
          const years = metadataData.map(item => item.year).filter(y => y !== null && y !== undefined);
          const uniqueYears = [...new Set([...years, Number(year1)])].sort((a, b) => b - a);
          setYearOptions1(uniqueYears.map(y => ({ value: y, label: y.toString() })));
          setYear1(uniqueYears.includes(Number(year1)) ? Number(year1) : uniqueYears[0] || null);
          const latestYearData = metadataData.find(item => item.year === Number(year1)) || metadataData[0];
          setHeadshotUrl1(latestYearData?.headshotURL || null);
          const statsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${urlPlayerId}/${year1}`);
          if (!statsResponse.ok) throw new Error(`Failed to fetch stats data for Player 1: ${await statsResponse.text()}`);
          const statsData = await statsResponse.json();
          console.log('Stats data for Player 1:', statsData);
          if (statsData && Object.keys(statsData).length > 0) {
            setMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p1Value: statsData[metric.field] || 0,
            })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p1Value: statsData[metric.field] || 0,
            })));
            setCustomMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p1Value: statsData[metric.field] || 0,
            })));
          } else {
            console.warn('No valid stats data received for Player 1');
          }
        } catch (error) {
          console.error(`Error fetching data for Player 1 ${player1?.label || 'unknown'}:`, error.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData1();
  }, [player1, year1]);

  useEffect(() => {
    const fetchData2 = async () => {
      if (player2 && year2) {
        setLoading(true);
        try {
          console.log(`Fetching data for Player 2 ID: ${player2.value}, Year: ${year2}`);
          const metadataResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata_rb/${player2.value}`);
          if (!metadataResponse.ok) throw new Error(`HTTP error! status: ${metadataResponse.status}`);
          const metadataData = await metadataResponse.json();
          if (!Array.isArray(metadataData)) throw new Error('API response is not an array');
          const years = metadataData.map(item => item.year).filter(y => y !== null && y !== undefined);
          const uniqueYears = [...new Set([...years, Number(year2)])].sort((a, b) => b - a);
          setYearOptions2(uniqueYears.map(y => ({ value: y, label: y.toString() })));
          const latestYearData = metadataData.find(item => item.year === Number(year2)) || metadataData[0];
          setHeadshotUrl2(latestYearData?.headshotURL || null);
          const statsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${player2.value}/${year2}`);
          if (!statsResponse.ok) throw new Error(`Failed to fetch stats data for Player 2: ${await statsResponse.text()}`);
          const statsData = await statsResponse.json();
          console.log('Stats data for Player 2:', statsData);
          if (statsData && Object.keys(statsData).length > 0) {
            setMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p2Value: statsData[metric.field] || 0,
            })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p2Value: statsData[metric.field] || 0,
            })));
            setCustomMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p2Value: statsData[metric.field] || 0,
            })));
          } else {
            console.warn('No valid stats data received for Player 2');
          }
        } catch (error) {
          console.error(`Error fetching data for Player 2 ${player2.label}:`, error.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData2();
  }, [player2, year2]);

  return (
    <div className={`bg-white rounded-lg shadow-xl ${className}`}>
      <div className="flex flex-col items-center">
        <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded w-full">Running Back Comparison</h2>
        {isMobile ? (
          <div className="w-full max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-40">
                  <Select
                    value={player1}
                    onChange={setPlayer1}
                    options={playerOptions}
                    className="mt-1"
                    classNamePrefix="react-select"
                    placeholder="Select Player..."
                    isSearchable={true}
                    isDisabled={true}
                    styles={selectStyles}
                  />
                </div>
                <div className="w-40">
                  <Select
                    value={year1 ? { value: year1, label: year1.toString() } : null}
                    onChange={(selected) => setYear1(selected ? selected.value : null)}
                    options={yearOptions1}
                    className="mt-1"
                    classNamePrefix="react-select"
                    placeholder="Year"
                    isDisabled={true}
                    styles={selectStyles}
                  />
                </div>
                <div className="w-[80px] h-[59px] bg-white shadow-xl border-2 border-[#235347]">
                  {headshotUrl1 ? (
                    <img src={headshotUrl1} alt={`${player1?.label} headshot`} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-white"></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-40">
                  <Select
                    value={player2}
                    onChange={setPlayer2}
                    options={playerOptions}
                    className="mt-1"
                    classNamePrefix="react-select"
                    placeholder="Select Player..."
                    isSearchable={true}
                    styles={selectStyles}
                  />
                </div>
                <div className="w-40">
                  <Select
                    value={year2 ? { value: year2, label: year2.toString() } : null}
                    onChange={(selected) => setYear2(selected ? selected.value : null)}
                    options={yearOptions2}
                    className="mt-1"
                    classNamePrefix="react-select"
                    placeholder="Year"
                    isDisabled={!player2}
                    styles={selectStyles}
                  />
                </div>
                <div className="w-[80px] h-[59px] bg-white shadow-xl border-2 border-[#235347]">
                  {headshotUrl2 ? (
                    <img src={headshotUrl2} alt={`${player2?.label} headshot`} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-white"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 text-center">
              <div className="mb-1">
                <div className="flex justify-center items-center mb-4 mt-4 space-x-4">
                  <div className="w-60">
                    <Select
                      value={player1}
                      onChange={setPlayer1}
                      options={playerOptions}
                      className="mt-1"
                      classNamePrefix="react-select"
                      placeholder="Select Player..."
                      isSearchable={true}
                      isDisabled={true}
                    />
                  </div>
                  <div className="w-28">
                    <Select
                      value={year1 ? { value: year1, label: year1.toString() } : null}
                      onChange={(selected) => setYear1(selected ? selected.value : null)}
                      options={yearOptions1}
                      className="mt-1"
                      classNamePrefix="react-select"
                      placeholder="Year"
                      isDisabled={true}
                    />
                  </div>
                </div>
                <div className="w-[250px] h-[185px] bg-white mx-auto shadow-xl border-2 border-[#235347]">
                  {headshotUrl1 ? (
                    <img src={headshotUrl1} alt={`${player1?.label} headshot`} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-white"></div>
                  )}
                </div>
              </div>
              <div className="mb-1">
                <div className="flex justify-center items-center mb-4 mt-4 space-x-4">
                  <div className="w-28">
                    <Select
                      value={year2 ? { value: year2, label: year2.toString() } : null}
                      onChange={(selected) => setYear2(selected ? selected.value : null)}
                      options={yearOptions2}
                      className="mt-1"
                      classNamePrefix="react-select"
                      placeholder="Year"
                      isDisabled={!player2}
                    />
                  </div>
                  <div className="w-60">
                    <Select
                      value={player2}
                      onChange={setPlayer2}
                      options={playerOptions}
                      className="mt-1"
                      classNamePrefix="react-select"
                      placeholder="Select Player..."
                      isSearchable={true}
                    />
                  </div>
                </div>
                <div className="w-[250px] h-[185px] bg-white mx-auto shadow-xl border-2 border-[#235347]">
                  {headshotUrl2 ? (
                    <img src={headshotUrl2} alt={`${player2?.label} headshot`} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="w-full h-full bg-white"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={isMobile ? "w-full max-w-md mx-auto" : "w-full max-w-2xl mx-auto"}>
          {loading && (
            <div className="flex justify-center mb-2">
              <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            </div>
          )}
          <div className="border-b border-gray-300">
            <ul className={isMobile ? "flex gap-4 justify-center p-0" : "flex gap-8 justify-center p-0"}>
              <li>
                <button
                  className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Metrics' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                  onClick={() => setActiveTab('Metrics')}
                >
                  Metrics
                </button>
              </li>
              <li>
                <button
                  className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 text-xs sm:text-base border-b-2 ${activeTab === 'Grades' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                  onClick={() => setActiveTab('Grades')}
                >
                  Grades
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
          {activeTab === 'Metrics' && (
            <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
              {metrics.map((metric, index) => {
                const maxValue = Math.max(metric.p1Value, metric.p2Value) || 1;
                const totalWidth = 100;
                const p1Width = (metric.p1Value / maxValue) * totalWidth;
                const p2Width = (metric.p2Value / maxValue) * totalWidth;
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
                      <span className={isMobile ? "absolute left-0 text-left pr-2 text-xs" : "absolute left-0 text-left pr-2"}>{metric.p1Value}</span>
                      <div className="w-5/6 flex">
                        <div className={isMobile ? "bg-blue-800 h-4 rounded-l" : "bg-blue-800 h-6 rounded-l"} style={{ width: `${p1Width}%` }}></div>
                        <div className={isMobile ? "bg-rose-800 h-4 rounded-r" : "bg-rose-800 h-6 rounded-r"} style={{ width: `${p2Width}%` }}></div>
                      </div>
                      <span className={isMobile ? "absolute right-0 text-right pl-2 text-xs" : "absolute right-0 text-right pl-2"}>{metric.p2Value}</span>
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
          {activeTab === 'Grades' && (
            <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
              {metricsGrades.map((metric, index) => {
                const maxValue = Math.max(metric.p1Value, metric.p2Value) || 1;
                const totalWidth = 100;
                const p1Width = (metric.p1Value / maxValue) * totalWidth;
                const p2Width = (metric.p2Value / maxValue) * totalWidth;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex items-center w-full justify-center">
                      <span className={isMobile ? "text-gray-700 font-semibold text-xs" : "text-gray-700 font-semibold"}>{metric.label}</span>
                      <button
                        onClick={() => removeMetric(metric.field, 'grades')}
                        className="ml-2 text-gray-500 hover:text-red-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className={isMobile ? "w-[100%] flex justify-center relative" : "w-[130%] flex justify-center relative"} style={{ height: isMobile ? '16px' : '24px' }}>
                      <span className={isMobile ? "absolute left-0 text-left pr-2 text-xs" : "absolute left-0 text-left pr-2"}>{metric.p1Value}</span>
                      <div className="w-5/6 flex">
                        <div className={isMobile ? "bg-blue-800 h-4 rounded-l" : "bg-blue-800 h-6 rounded-l"} style={{ width: `${p1Width}%` }}></div>
                        <div className={isMobile ? "bg-rose-800 h-4 rounded-r" : "bg-rose-800 h-6 rounded-r"} style={{ width: `${p2Width}%` }}></div>
                      </div>
                      <span className={isMobile ? "absolute right-0 text-right pl-2 text-xs" : "absolute right-0 text-right pl-2"}>{metric.p2Value}</span>
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
                  const maxValue = Math.max(metric.p1Value, metric.p2Value) || 1;
                  const totalWidth = 100;
                  const p1Width = (metric.p1Value / maxValue) * totalWidth;
                  const p2Width = (metric.p2Value / maxValue) * totalWidth;
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
                        <span className={isMobile ? "absolute left-0 text-left pr-2 text-xs" : "absolute left-0 text-left pr-2"}>{metric.p1Value}</span>
                        <div className="w-5/6 flex">
                          <div className={isMobile ? "bg-blue-800 h-4 rounded-l" : "bg-blue-800 h-6 rounded-l"} style={{ width: `${p1Width}%` }}></div>
                          <div className={isMobile ? "bg-rose-800 h-4 rounded-r" : "bg-rose-800 h-6 rounded-r"} style={{ width: `${p2Width}%` }}></div>
                        </div>
                        <span className={isMobile ? "absolute right-0 text-right pl-2 text-xs" : "absolute right-0 text-right pl-2"}>{metric.p2Value}</span>
                        <div
                          className="absolute w-[1px] bg-black"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: isMobile ? '16px' : '24px' }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center text-sm sm:text-base">Please Select Comparison Player</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeadToHeadContainer;