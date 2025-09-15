import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import ContainerA from './ContainerA'; // Adjust the import path as needed

const HeadToHeadContainer = ({ className, onPlayerDataChange }) => {
  // State for player and year selections, headshot URLs, loading, and metrics
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [year1, setYear1] = useState(null);
  const [year2, setYear2] = useState(null);
  const [playerOptions, setPlayerOptions] = useState([]);
  const [yearOptions1, setYearOptions1] = useState([]);
  const [yearOptions2, setYearOptions2] = useState([]);
  const [headshotUrl1, setHeadshotUrl1] = useState(null);
  const [headshotUrl2, setHeadshotUrl2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([
    { label: 'Yards', field: 'yards', p1Value: 0, p2Value: 0 },
    { label: 'YPA', field: 'ypa', p1Value: 0, p2Value: 0 },
    { label: 'Touchdowns', field: 'touchdowns', p1Value: 0, p2Value: 0 },
  ]);
  const [metricsGrades, setMetricsGrades] = useState([
    { label: 'Grades Pass', field: 'grades_pass', p1Value: 0, p2Value: 0 },
    { label: 'Grades Offense', field: 'grades_offense', p1Value: 0, p2Value: 0 },
  ]);
  const [activeTab, setActiveTab] = useState('Metrics');

  // Pass playerId, year, and name to ContainerA and parent via callback
  const containerAProps = {
    player1: player1 && year1 ? { playerId: player1.value, year: year1, name: player1.label } : null,
    player2: player2 && year2 ? { playerId: player2.value, year: year2, name: player2.label } : null,
  };

  useEffect(() => {
    if (onPlayerDataChange && player1 && year1 && player2 && year2) {
      onPlayerDataChange({
        player1: { playerId: player1.value, year: year1, name: player1.label },
        player2: { playerId: player2.value, year: year2, name: player2.label },
      });
    }
  }, [player1, year1, player2, year2, onPlayerDataChange]);

  // Fetch player list from /api/player_qb_list
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/player_qb_list');
        const data = await response.json();
        const options = data.map(player => ({
          value: player.playerId,
          label: player.name,
        }));
        setPlayerOptions(options.sort((a, b) => a.label.localeCompare(b.label))); // Sort alphabetically
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    fetchPlayers();
  }, []);

  // Fetch available years, headshot URL, and stats for Player 1 when selected
  useEffect(() => {
    const fetchData1 = async () => {
      if (player1) {
        setLoading(true);
        try {
          console.log(`Fetching data for Player 1 ID: ${player1.value}`);
          const response = await fetch(`http://localhost:3001/api/player_metadata_qb/${player1.value}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Raw data for Player 1:', data); // Debug: Log the raw response
          if (!Array.isArray(data)) {
            throw new Error('API response is not an array');
          }
          const years = data.map(item => item.year).filter(year => year !== null && year !== undefined); // Strict filter
          const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // Sort descending
          console.log('Extracted years for Player 1:', uniqueYears); // Debug: Log extracted years
          if (uniqueYears.length > 0) {
            setYearOptions1(uniqueYears.map(year => ({ value: year, label: year.toString() })));
            setYear1(uniqueYears[0]); // Default to highest year
            const latestYearData = data.find(item => item.year === uniqueYears[0]);
            setHeadshotUrl1(latestYearData?.headshotURL || null);
            // Fetch stats for Player 1
            const statsResponse = await fetch(`http://localhost:3001/api/player_percentiles_QB/${player1.value}/${uniqueYears[0]}`);
            const statsData = await statsResponse.json();
            console.log('Stats data for Player 1:', statsData); // Debug: Log stats
            setMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p1Value: statsData[metric.field] || 0, // Use field for data mapping
            })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p1Value: statsData[metric.field] || 0, // Use field for data mapping
            })));
          } else {
            setYearOptions1([]);
            setYear1(null);
            setHeadshotUrl1(null);
            setMetrics(prevMetrics => prevMetrics.map(metric => ({ ...metric, p1Value: 0 })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({ ...metric, p1Value: 0 })));
          }
        } catch (error) {
          console.error(`Error fetching data for Player 1 ${player1.label}:`, error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setYearOptions1([]);
        setYear1(null);
        setHeadshotUrl1(null);
        setMetrics(prevMetrics => prevMetrics.map(metric => ({ ...metric, p1Value: 0 })));
        setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({ ...metric, p1Value: 0 })));
      }
    };
    fetchData1();
  }, [player1]);

  // Fetch available years, headshot URL, and stats for Player 2 when selected
  useEffect(() => {
    const fetchData2 = async () => {
      if (player2) {
        setLoading(true);
        try {
          console.log(`Fetching data for Player 2 ID: ${player2.value}`);
          const response = await fetch(`http://localhost:3001/api/player_metadata_qb/${player2.value}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Raw data for Player 2:', data); // Debug: Log the raw response
          if (!Array.isArray(data)) {
            throw new Error('API response is not an array');
          }
          const years = data.map(item => item.year).filter(year => year !== null && year !== undefined); // Strict filter
          const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // Sort descending
          console.log('Extracted years for Player 2:', uniqueYears); // Debug: Log extracted years
          if (uniqueYears.length > 0) {
            setYearOptions2(uniqueYears.map(year => ({ value: year, label: year.toString() })));
            setYear2(uniqueYears[0]); // Default to highest year
            const latestYearData = data.find(item => item.year === uniqueYears[0]);
            setHeadshotUrl2(latestYearData?.headshotURL || null);
            // Fetch stats for Player 2
            const statsResponse = await fetch(`http://localhost:3001/api/player_percentiles_QB/${player2.value}/${uniqueYears[0]}`);
            const statsData = await statsResponse.json();
            console.log('Stats data for Player 2:', statsData); // Debug: Log stats
            setMetrics(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p2Value: statsData[metric.field] || 0, // Use field for data mapping
            })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({
              ...metric,
              p2Value: statsData[metric.field] || 0, // Use field for data mapping
            })));
          } else {
            setYearOptions2([]);
            setYear2(null);
            setHeadshotUrl2(null);
            setMetrics(prevMetrics => prevMetrics.map(metric => ({ ...metric, p2Value: 0 })));
            setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({ ...metric, p2Value: 0 })));
          }
        } catch (error) {
          console.error(`Error fetching data for Player 2 ${player2.label}:`, error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setYearOptions2([]);
        setYear2(null);
        setHeadshotUrl2(null);
        setMetrics(prevMetrics => prevMetrics.map(metric => ({ ...metric, p2Value: 0 })));
        setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({ ...metric, p2Value: 0 })));
      }
    };
    fetchData2();
  }, [player2]);

  return (
    <div className={`bg-white rounded-lg p-4 shadow-xl ${className}`}>
      {/* Player Selection and Image Section */}
      <div className="grid grid-cols-2 text-center">
        {/* Player 1 Column */}
        <div className="mb-1">
          <div className="flex justify-center items-center mb-2 space-x-4">
            <div className="w-60">
              <Select
                value={player1}
                onChange={setPlayer1}
                options={playerOptions}
                className="mt-1"
                classNamePrefix="react-select"
                placeholder="Select Player..."
                isSearchable={true}
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
                isDisabled={!player1}
              />
            </div>
          </div>
          <div className="w-[250px] h-[185px] bg-white mx-auto shadow-xl">
            {headshotUrl1 ? (
              <img src={headshotUrl1} alt={`${player1?.label} headshot`} className="w-full h-full object-cover rounded" />
            ) : (
              <div className="w-full h-full bg-white"></div>
            )}
          </div>
        </div>
        {/* Player 2 Column */}
        <div className="mb-1">
          <div className="flex justify-center items-center mb-2 space-x-4">
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
          <div className="w-[250px] h-[185px] bg-white mx-auto shadow-xl">
            {headshotUrl2 ? (
              <img src={headshotUrl2} alt={`${player2?.label} headshot`} className="w-full h-full object-cover rounded" />
            ) : (
              <div className="w-full h-full bg-white"></div>
            )}
          </div>
        </div>
      </div>
      {/* Centered Container Below Images */}
      <div className="text-center">
        <div className="bg-white rounded-lg p-0 mx-auto max-w-2xl">
          {loading && (
            <div className="flex justify-center mb-2">
              <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            </div>
          )}
          <div className="border-b border-gray-300">
            <ul className="flex gap-4 justify-center p-4">
              <li>
                <button
                  className={`text-blue-500 hover:text-gray-700 pb-2 border-b-2 ${activeTab === 'Metrics' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                  onClick={() => setActiveTab('Metrics')}
                >
                  Metrics
                </button>
              </li>
              <li>
                <button
                  className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${activeTab === 'Grades' ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                  onClick={() => setActiveTab('Grades')}
                >
                  Grades
                </button>
              </li>
            </ul>
          </div>
          {activeTab === 'Metrics' && (
            <div className="space-y-1 p-4">
              {metrics.map((metric, index) => {
                const maxValue = Math.max(metric.p1Value, metric.p2Value);
                const totalWidth = 100; // Total width percentage
                const p1Width = (metric.p1Value / maxValue) * (totalWidth); // Full width for Player 1
                const p2Width = (metric.p2Value / maxValue) * (totalWidth); // Full width for Player 2
                return (
                  <div key={index} className="flex flex-col items-center">
                    <span className="mb-0 text-gray-700">{metric.label}</span>
                    <div className="w-full flex justify-center relative" style={{ height: '24px' }}>
                      <span className="absolute left-0 text-left pr-2">{metric.p1Value}</span>
                      <div className="w-5/6 flex">
                        <div
                          className="bg-blue-800 h-6 rounded-l"
                          style={{ width: `${p1Width}%` }}
                        ></div>
                        <div
                          className="bg-rose-800 h-6 rounded-r"
                          style={{ width: `${p2Width}%` }}
                        ></div>
                      </div>
                      <span className="absolute right-0 text-right pl-2">{metric.p2Value}</span>
                      {/* Zero Line */}
                      <div
                        className="absolute w-[1px] bg-black"
                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: '24px' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'Grades' && (
            <div className="space-y-1 p-4">
              {metricsGrades.map((metric, index) => {
                const maxValue = Math.max(metric.p1Value, metric.p2Value);
                const totalWidth = 100; // Total width percentage
                const p1Width = (metric.p1Value / maxValue) * (totalWidth); // Full width for Player 1
                const p2Width = (metric.p2Value / maxValue) * (totalWidth); // Full width for Player 2
                return (
                  <div key={index} className="flex flex-col items-center">
                    <span className="mb-0 text-gray-700">{metric.label}</span>
                    <div className="w-full flex justify-center relative" style={{ height: '24px' }}>
                      <span className="absolute left-0 text-left pr-2">{metric.p1Value}</span>
                      <div className="w-5/6 flex">
                        <div
                          className="bg-blue-800 h-6 rounded-l"
                          style={{ width: `${p1Width}%` }}
                        ></div>
                        <div
                          className="bg-rose-800 h-6 rounded-r"
                          style={{ width: `${p2Width}%` }}
                        ></div>
                      </div>
                      <span className="absolute right-0 text-right pl-2">{metric.p2Value}</span>
                      {/* Zero Line */}
                      <div
                        className="absolute w-[1px] bg-black"
                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: '24px' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeadToHeadContainer;