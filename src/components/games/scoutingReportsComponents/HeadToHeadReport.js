import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const HeadToHeadReport = ({ year, awayTeamId, homeTeamId }) => {
  const [awayTeamData, setAwayTeamData] = useState(null);
  const [homeTeamData, setHomeTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Metrics');
  const [metrics, setMetrics] = useState([
    { label: 'First Downs', field: 'firstDowns', awayValue: 0, homeValue: 0 },
    { label: 'Total Yards', field: 'totalYards', awayValue: 0, homeValue: 0 },
    { label: 'Passing Yards', field: 'netPassingYards', awayValue: 0, homeValue: 0 },
    { label: 'Rushing Yards', field: 'rushingYards', awayValue: 0, homeValue: 0 },
  ]);
  const [metricsGrades, setMetricsGrades] = useState([
    { label: 'Quarterback', field: 'QBR', awayValue: 0, homeValue: 0 },
    { label: 'Runningback', field: 'RBR', awayValue: 0, homeValue: 0 },
    { label: 'Wide Receiver', field: 'WRR', awayValue: 0, homeValue: 0 },
    { label: 'Tight End', field: 'TER', awayValue: 0, homeValue: 0 },
    { label: 'Guard', field: 'GR', awayValue: 0, homeValue: 0 },
    { label: 'Tackle', field: 'TR', awayValue: 0, homeValue: 0 },
    { label: 'Center', field: 'CR', awayValue: 0, homeValue: 0 },
    { label: 'Defensive Line', field: 'DLR', awayValue: 0, homeValue: 0 },
    { label: 'Linebacker/EDGE', field: 'LBR', awayValue: 0, homeValue: 0 },
    { label: 'Cornerback', field: 'CBR', awayValue: 0, homeValue: 0 },
    { label: 'Safety', field: 'SR', awayValue: 0, homeValue: 0 },




  ]);
  const [customMetrics, setCustomMetrics] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedCustomMetric, setSelectedCustomMetric] = useState(null);
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
    } else if (type === 'grades') {
      setMetricsGrades(prev => prev.filter(metric => metric.field !== field));
    } else if (type === 'custom') {
      setCustomMetrics(prev => prev.filter(metric => metric.field !== field));
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
        // Fetch away team data
        const awayResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/team_full_ratings/${awayTeamId}/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!awayResponse.ok) {
          const errorText = await awayResponse.text();
          console.error('Away team response:', awayResponse.status, errorText);
          throw new Error(`Away team data not found: ${awayResponse.status} ${errorText}`);
        }
        const awayData = await awayResponse.json();
        setAwayTeamData(awayData);

        // Fetch home team data
        const homeResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/team_full_ratings/${homeTeamId}/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!homeResponse.ok) {
          const errorText = await homeResponse.text();
          console.error('Home team response:', homeResponse.status, errorText);
          throw new Error(`Home team data not found: ${homeResponse.status} ${errorText}`);
        }
        const homeData = await homeResponse.json();
        setHomeTeamData(homeData);

        // Update metrics with fetched data
        setMetrics(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          awayValue: awayData[metric.field] || 0,
          homeValue: homeData[metric.field] || 0,
        })));
        setMetricsGrades(prevMetrics => prevMetrics.map(metric => ({
          ...metric,
          awayValue: awayData[metric.field] || 0,
          homeValue: homeData[metric.field] || 0,
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

    if (year && awayTeamId && homeTeamId) {
      fetchTeamData();
    } else {
      setError('Missing team IDs or year');
      setLoading(false);
    }
  }, [year, awayTeamId, homeTeamId]);

  return (
    <div className="bg-white rounded-lg shadow-xl">
      <div className={isMobile ? "w-full max-w-md mx-auto" : "w-full max-w-2xl mx-auto"}>
        {loading && (
          <div className="flex justify-center mb-2">
            <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        )}
        {error && <div className="p-4 text-red-500 text-center">{error}</div>}
        {!loading && !error && (
          <>
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
                    Position Ratings (z)
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
            {activeTab === 'Grades' && (
              <div className={isMobile ? "space-y-1 p-2" : "space-y-1 p-4"}>
                {metricsGrades.map((metric, index) => {
                  const maxValue = Math.max(metric.awayValue, metric.homeValue) || 1;
                  const totalWidth = 100;
                  const awayWidth = (metric.awayValue / maxValue) * totalWidth;
                  const homeWidth = (metric.homeValue / maxValue) * totalWidth;
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