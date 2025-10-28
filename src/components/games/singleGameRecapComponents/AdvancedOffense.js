// src/components/games/singleGameRecapComponents/PredictedPointsAdded.js
import React, { useState } from 'react';

const PredictedPointsAdded = ({
  awayStats,
  homeStats,
  awayTeamName = 'Away Team',
  homeTeamName = 'Home Team',
}) => {
  const [showPPATooltip, setShowPPATooltip] = useState(false);

  // -------------------------------------------------------------------------
  // 1. Group data
  // -------------------------------------------------------------------------
  const {
    ppaRows,
    successRowsAway,
    explosivenessRowsAway,
    successRowsHome,
    explosivenessRowsHome,
  } = React.useMemo(() => {
    if (!awayStats && !homeStats)
      return {
        ppaRows: {},
        successRowsAway: {},
        explosivenessRowsAway: [],
        successRowsHome: {},
        explosivenessRowsHome: [],
      };

    const away = awayStats || {};
    const home = homeStats || {};

    const formatLabel = (key) =>
      key
        .replace(/^ppa_|success_rate_|explosiveness_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    // ---------- PPA ----------
    const allPPAKeys = new Set([
      ...Object.keys(away).filter((k) => k.startsWith('ppa_')),
      ...Object.keys(home).filter((k) => k.startsWith('ppa_')),
    ]);

    const groupedPPA = { overall: [], passing: [], rushing: [] };
    Array.from(allPPAKeys)
      .sort()
      .forEach((key) => {
        const label = formatLabel(key);
        const value = {
          key,
          label,
          away: away[key] ?? 'N/A',
          home: home[key] ?? 'N/A',
          isQ4: key.includes('quarter4'),
        };
        if (key.includes('overall')) groupedPPA.overall.push(value);
        else if (key.includes('passing')) groupedPPA.passing.push(value);
        else if (key.includes('rushing')) groupedPPA.rushing.push(value);
      });

    // ---------- Success Rate (Away) ----------
    const groupedSuccessAway = { overall: [], standard_downs: [], passing_downs: [] };
    Object.keys(away)
      .filter((k) => k.startsWith('success_rate_'))
      .sort()
      .forEach((key) => {
        const label = formatLabel(key);
        const raw = away[key];
        const value = raw === 'N/A' ? 'N/A' : (parseFloat(raw) * 100).toFixed(1) + '%';
        const item = { key, label, value, isQ4: key.includes('quarter4') };
        if (key.includes('overall')) groupedSuccessAway.overall.push(item);
        else if (key.includes('standard_downs')) groupedSuccessAway.standard_downs.push(item);
        else if (key.includes('passing_downs')) groupedSuccessAway.passing_downs.push(item);
      });

    // ---------- Explosiveness (Away) ----------
    const explosivenessRowsAway = Object.keys(away)
      .filter((k) => k.startsWith('explosiveness_'))
      .sort()
      .map((key) => ({
        key,
        label: formatLabel(key),
        value: away[key] ?? 'N/A',
        isQ4: key.includes('quarter4'),
      }));

    // ---------- Success Rate (Home) ----------
    const groupedSuccessHome = { overall: [], standard_downs: [], passing_downs: [] };
    Object.keys(home)
      .filter((k) => k.startsWith('success_rate_'))
      .sort()
      .forEach((key) => {
        const label = formatLabel(key);
        const raw = home[key];
        const value = raw === 'N/A' ? 'N/A' : (parseFloat(raw) * 100).toFixed(1) + '%';
        const item = { key, label, value, isQ4: key.includes('quarter4') };
        if (key.includes('overall')) groupedSuccessHome.overall.push(item);
        else if (key.includes('standard_downs')) groupedSuccessHome.standard_downs.push(item);
        else if (key.includes('passing_downs')) groupedSuccessHome.passing_downs.push(item);
      });

    // ---------- Explosiveness (Home) ----------
    const explosivenessRowsHome = Object.keys(home)
      .filter((k) => k.startsWith('explosiveness_'))
      .sort()
      .map((key) => ({
        key,
        label: formatLabel(key),
        value: home[key] ?? 'N/A',
        isQ4: key.includes('quarter4'),
      }));

    return {
      ppaRows: groupedPPA,
      successRowsAway: groupedSuccessAway,
      explosivenessRowsAway,
      successRowsHome: groupedSuccessHome,
      explosivenessRowsHome,
    };
  }, [awayStats, homeStats]);

  const hasPPA = Object.values(ppaRows).some((arr) => arr.length > 0);
  const hasSuccessAway = Object.values(successRowsAway).some((arr) => arr.length > 0);
  const hasExplosivenessAway = explosivenessRowsAway.length > 0;
  const hasSuccessHome = Object.values(successRowsHome).some((arr) => arr.length > 0);
  const hasExplosivenessHome = explosivenessRowsHome.length > 0;

  // -------------------------------------------------------------------------
  // 2. Heatmap (only for PPA)
  // -------------------------------------------------------------------------
  const getHeatmapClass = (value) => {
    if (value === 'N/A') return 'text-gray-400';
    const num = parseFloat(value);
    if (isNaN(num)) return 'text-gray-600';
    return num > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
  };

  // -------------------------------------------------------------------------
  // 3. Metric Container — now receives teamName
  // -------------------------------------------------------------------------
  const MetricContainer = ({ successRows, explosivenessRows, teamName }) => {
    const [showSuccessTooltip, setShowSuccessTooltip] = useState(false);
    const [showExplosivenessTooltip, setShowExplosivenessTooltip] = useState(false);

    const hasSuccess = Object.values(successRows).some((arr) => arr.length > 0);
    const hasExplosiveness = explosivenessRows.length > 0;

    return (
      <div className="flex flex-col gap-4">
        {/* Success Rate */}
        {hasSuccess && (
          <div className="border border-gray-300 rounded-lg p-0">
            <div className="relative flex items-center justify-center bg-[#235347] text-white font-bold h-[30px] rounded-t border-b border-[#235347]">
              <h2 className="text-md"> {teamName} Success Rate</h2>
              <button
                onClick={() => setShowSuccessTooltip(!showSuccessTooltip)}
                className="ml-2 w-4 h-4 bg-white text-[#235347] text-xs rounded-full flex items-center justify-center hover:bg-gray-200"
                title="What is Success Rate?"
              >
                ?
              </button>
            </div>

            {showSuccessTooltip && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
                onClick={() => setShowSuccessTooltip(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[#235347]">Success Rate</h3>
                    <button
                      onClick={() => setShowSuccessTooltip(false)}
                      className="text-gray-500 hover:text-black text-xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    The percentage of plays considered successful based on how well they advance the ball toward a first down or touchdown. A play is “successful” if it gains:
                  </p>
                  <ul className="text-sm text-gray-700 mt-2 ml-4 list-disc">
                    <li><strong>≥50%</strong> of required yards on 1st down</li>
                    <li><strong>≥70%</strong> on 2nd down</li>
                    <li><strong>100%</strong> (a conversion) on 3rd or 4th down</li>
                  </ul>
                  <p className="text-sm text-gray-700 mt-3">
                    Success Rate reflects <strong>consistency and efficiency</strong> — how often an offense stays “on schedule.”
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Higher values</strong> mean sustained drives and effective play calling; <strong>lower values</strong> indicate stalled drives or inefficient execution.
                  </p>
                  <p className="text-sm text-gray-700 mt-3 italic">
                    <strong>Note:</strong> A lower Success Rate doesn’t directly mean fewer points scored — it simply means the offense struggled to consistently gain the necessary yardage to maintain drives.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg">
              {/* Mobile */}
              <div className="block lg:hidden">
                {successRows.overall.length > 0 && (
                  <>
                    <div className="bg-gray-300 text-black font-bold text-xs text-center px-4 py-1">Overall</div>
                    {successRows.overall.map(({ label, value, isQ4 }) => (
                      <div key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''} px-4 py-2`}>
                        <div className="flex justify-between">
                          <span className="font-bold text-xs">{label}</span>
                          <span className="text-xs text-gray-700">{value}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {successRows.standard_downs.length > 0 && (
                  <>
                    <div className="bg-gray-300 text-black font-bold text-xs text-center px-4 py-1">Standard Downs</div>
                    {successRows.standard_downs.map(({ label, value, isQ4 }) => (
                      <div key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''} px-4 py-2 bg-gray-50`}>
                        <div className="flex justify-between">
                          <span className="font-bold text-xs">{label}</span>
                          <span className="text-xs text-gray-700">{value}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {successRows.passing_downs.length > 0 && (
                  <>
                    <div className="bg-gray-300 text-black font-bold text-xs text-center px-4 py-1">Passing Downs</div>
                    {successRows.passing_downs.map(({ label, value, isQ4 }) => (
                      <div key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''} px-4 py-2`}>
                        <div className="flex justify-between">
                          <span className="font-bold text-xs">{label}</span>
                          <span className="text-xs text-gray-700">{value}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden lg:block">
                <table className="w-full text-sm text-left text-black">
                  <tbody>
                    {successRows.overall.length > 0 && (
                      <>
                        <tr className="bg-gray-300 text-black">
                          <td colSpan={2} className="py-1 px-4 font-bold text-center text-xs">Overall</td>
                        </tr>
                        {successRows.overall.map(({ label, value, isQ4 }) => (
                          <tr key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                            <td className="py-2 px-4 font-bold w-[70%]">{label}</td>
                            <td className="py-2 px-4 text-center w-[30%] text-gray-700">{value}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    {successRows.standard_downs.length > 0 && (
                      <>
                        <tr className="bg-gray-300 text-black">
                          <td colSpan={2} className="py-1 px-4 font-bold text-center text-xs">Standard Downs</td>
                        </tr>
                        {successRows.standard_downs.map(({ label, value, isQ4 }) => (
                          <tr key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                            <td className="py-2 px-4 font-bold w-[70%]">{label}</td>
                            <td className="py-2 px-4 text-center w-[30%] text-gray-700">{value}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    {successRows.passing_downs.length > 0 && (
                      <>
                        <tr className="bg-gray-300 text-black">
                          <td colSpan={2} className="py-1 px-4 font-bold text-center text-xs">Passing Downs</td>
                        </tr>
                        {successRows.passing_downs.map(({ label, value, isQ4 }) => (
                          <tr key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                            <td className="py-2 px-4 font-bold w-[70%]">{label}</td>
                            <td className="py-2 px-4 text-center w-[30%] text-gray-700">{value}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Explosiveness */}
        {hasExplosiveness && (
          <div className="border border-gray-300 rounded-lg p-0">
            <div className="relative flex items-center justify-center bg-[#235347] text-white font-bold h-[30px] rounded-t border-b border-[#235347]">
              <h2 className="text-md">{teamName} Explosiveness</h2>
              <button
                onClick={() => setShowExplosivenessTooltip(!showExplosivenessTooltip)}
                className="ml-2 w-4 h-4 bg-white text-[#235347] text-xs rounded-full flex items-center justify-center hover:bg-gray-200"
                title="What is Explosiveness?"
              >
                ?
              </button>
            </div>

            {showExplosivenessTooltip && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
                onClick={() => setShowExplosivenessTooltip(false)}
              >
                <div
                  className="bg-white rounded-lg p-6 max-w-md shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[#235347]">Explosiveness</h3>
                    <button
                      onClick={() => setShowExplosivenessTooltip(false)}
                      className="text-gray-500 hover:text-black text-xl font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Measures the average value of successful plays — how big those plays are when the offense succeeds. Explosiveness captures a team’s ability to generate chunk plays and high-yardage gains rather than just move the chains efficiently.
                  </p>
                  <p className="text-sm text-gray-700 mt-3">
                    A <strong>higher explosiveness value</strong> means that when the offense has a successful play, it tends to be for large gains (big plays). A <strong>lower value</strong> indicates that successful plays are shorter or less impactful.
                  </p>
                  <p className="text-sm text-gray-700 mt-3 italic">
                    <strong>Note:</strong> Explosiveness does not measure total points or frequency of big plays — only the magnitude of yardage gained on successful plays.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg">
              {/* Mobile */}
              <div className="block lg:hidden">
                {explosivenessRows.map(({ label, value, isQ4 }) => (
                  <div key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''} px-4 py-2 bg-gray-50`}>
                    <div className="flex justify-between">
                      <span className="font-bold text-xs">{label}</span>
                      <span className="text-xs text-gray-700">{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden lg:block">
                <table className="w-full text-sm text-left text-black">
                  <tbody>
                    {explosivenessRows.map(({ label, value, isQ4 }) => (
                      <tr key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                        <td className="py-2 px-4 font-bold w-[70%]">{label}</td>
                        <td className="py-2 px-4 text-center w-[30%] text-gray-700">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* LEFT: Away */}
      <div className="w-full lg:w-1/4">
        <MetricContainer
          successRows={successRowsAway}
          explosivenessRows={explosivenessRowsAway}
          teamName={awayTeamName}
        />
      </div>

      {/* CENTER: Predicted Points Added */}
      <div className="w-full lg:w-1/2">
        <div className="border border-gray-300 rounded-lg p-0">
          <div className="relative flex items-center justify-center bg-[#235347] text-white font-bold h-[30px] rounded-t border-b border-[#235347]">
            <h2 className="text-md">Predicted Points Added</h2>
            <button
              onClick={() => setShowPPATooltip(!showPPATooltip)}
              className="ml-2 w-4 h-4 bg-white text-[#235347] text-xs rounded-full flex items-center justify-center hover:bg-gray-200"
              title="What is PPA?"
            >
              ?
            </button>
          </div>

          {showPPATooltip && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
              onClick={() => setShowPPATooltip(false)}
            >
              <div
                className="bg-white rounded-lg p-6 max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-[#235347]">Predicted Points Added (PPA)</h3>
                  <button
                    onClick={() => setShowPPATooltip(false)}
                    className="text-gray-500 hover:text-black text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  A measure of how much each play changes a team’s expected points, based on down, distance, and field position. 
                  <strong> Positive values</strong> indicate plays that improve scoring chances, while 
                  <strong> negative values</strong> indicate plays that hurt scoring chances.
                </p>
                <p className="text-sm text-gray-700 mt-3 italic">
                  <strong>Note:</strong> A negative PPA does not mean points were lost on the scoreboard — it simply means the play decreased the team’s likelihood of scoring on that drive.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg">
            {/* Mobile */}
            <div className="block lg:hidden">
              {hasPPA &&
                Object.entries(ppaRows).map(([section, rows]) => rows.length > 0 && (
                  <React.Fragment key={section}>
                    <div className="bg-gray-300 text-black font-bold text-xs text-center px-4 py-1">
                      {section.charAt(0).toUpperCase() + section.slice(1)}
                    </div>
                    {rows.map(({ label, away, home, isQ4 }) => (
                      <div key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                        <div className="flex justify-between px-4 py-2">
                          <span className="font-bold text-xs">{label}</span>
                          <span className={`text-xs ${getHeatmapClass(away)}`}>{away}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 bg-gray-50">
                          <span className="font-bold text-xs">{label}</span>
                          <span className={`text-xs ${getHeatmapClass(home)}`}>{home}</span>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
            </div>

            {/* Desktop */}
            <div className="hidden lg:block">
              <table className="w-full text-sm text-left text-black">
                <tbody>
                  {hasPPA &&
                    Object.entries(ppaRows).map(([section, rows]) => rows.length > 0 && (
                      <React.Fragment key={section}>
                        <tr className="bg-gray-300 text-black">
                          <td colSpan={4} className="py-1 px-4 font-bold text-center text-xs">
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                          </td>
                        </tr>
                        {rows.map(({ label, away, home, isQ4 }) => (
                          <tr key={label} className={`border-b ${isQ4 ? 'border-b-2 border-[#235347]' : ''}`}>
                            <td className="py-2 px-4 font-bold w-[35%]">{label}</td>
                            <td className={`py-2 px-4 text-center w-[15%] ${getHeatmapClass(away)}`}>{away}</td>
                            <td className={`py-2 px-4 text-center w-[15%] ${getHeatmapClass(home)}`}>{home}</td>
                            <td className="py-2 px-4 font-bold text-right w-[35%]">{label}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Home */}
      <div className="w-full lg:w-1/4">
        <MetricContainer
          successRows={successRowsHome}
          explosivenessRows={explosivenessRowsHome}
          teamName={homeTeamName}
        />
      </div>
    </div>
  );
};

export default PredictedPointsAdded;