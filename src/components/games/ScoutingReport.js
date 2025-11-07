// ScoutingReport.jsx – FULL FILE WITH DEBUG LOGS
import React, { useState, useEffect, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import TeamAReport from './scoutingReportsComponents/TeamAReport';
import HeadToHeadReport from './scoutingReportsComponents/HeadToHeadReport';
import TeamBReport from './scoutingReportsComponents/TeamBReport';

const ScoutingReport = ({ matchup, onClose, year }) => {
  const { user } = useClerk();
  const [awayTeamRecord, setAwayTeamRecord] = useState(null);
  const [homeTeamRecord, setHomeTeamRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScoutingReport, setShowScoutingReport] = useState(true);
  const modalRef = useRef(null);

  // Vote state
  const [spreadVotes, setSpreadVotes] = useState({ up: 0, down: 0 });
  const [ouVotes, setOuVotes] = useState({ up: 0, down: 0 });
  const [voting, setVoting] = useState(false);

  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium' || !subscriptionPlan;

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

  // Fetch team records
  useEffect(() => {
    const fetchRecords = async () => {
      if (!year || !matchup?.awayId || !matchup?.homeId) {
        setError('Missing year or team IDs');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/records/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch records: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const awayRecord = data.find(record => record.teamId === parseInt(matchup.awayId));
        const homeRecord = data.find(record => record.teamId === parseInt(matchup.homeId));
        setAwayTeamRecord(awayRecord || null);
        setHomeTeamRecord(homeRecord || null);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [year, matchup?.awayId, matchup?.homeId]);

  // Fetch live votes
  useEffect(() => {
    if (!matchup?.id) {
      console.error('matchup.id is MISSING!', matchup);
      return;
    }
    fetchVotes();
  }, [matchup?.id]);

  const fetchVotes = async () => {
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL}/api/scouting/votes/${matchup.id}`);
      if (!r.ok) throw new Error(`Votes fetch failed: ${r.status}`);
      const data = await r.json();
      console.log('Fetched votes:', data);
      setSpreadVotes(data.spread || { up: 0, down: 0 });
      setOuVotes(data.ou || { up: 0, down: 0 });
    } catch (err) {
      console.error('Vote fetch error:', err);
    }
  };

  const castVote = async (type, value) => {
    if (!isSubscribed || voting) return;
    if (!matchup?.id) {
      console.error('Cannot vote: matchup.id is missing!', matchup);
      return;
    }

    const payload = {
      matchupId: matchup.id,
      voteType: type,
      voteValue: value,
      userId: user?.id || null,
    };
    console.log('Sending vote:', payload); // ← DEBUG

    setVoting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scouting/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json();
        console.error('Vote failed:', err);
        throw new Error(err.error || 'Vote failed');
      }
      console.log('Vote success!');
      fetchVotes();
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="bg-white p-0 sm:p-0 rounded-lg shadow-xl w-full max-w-[90vw] sm:max-w-2xl md:max-w-4xl lg:max-w-7xl h-[80vh] sm:h-[80vh] overflow-y-auto flex flex-col relative"
      >
        <div className={`${!isSubscribed ? 'filter blur-sm opacity-80 pointer-events-none' : ''}`}>
          <div className="bg-gray-200 flex flex-row justify-between items-center p-1 sm:p-2 rounded-t border-b-2 border-[#235347] sticky top-0 z-10">
            <div className="flex items-center">
              {matchup?.awayTeamLogo && (
                <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
              )}
              <div className="ml-1 sm:ml-2 text-black">
                <div className="text-sm sm:text-lg font-bold">{matchup?.awayTeamName || 'Away Team'}</div>
                {awayTeamRecord && (
                  <div className="text-xs sm:text-sm">
                    OVR: {formatRecord(awayTeamRecord.total_wins, awayTeamRecord.total_losses, awayTeamRecord.total_ties)} |{' '}
                    {awayTeamRecord.conference}:{' '}
                    {formatRecord(awayTeamRecord.conferenceGames_wins, awayTeamRecord.conferenceGames_losses, awayTeamRecord.conferenceGames_ties)}
                  </div>
                )}
              </div>
            </div>
            <div className="hidden md:block flex items-center">
              <img src="/INSZN_LogoHeader.png" alt="INSZN Logo" className="w-24 sm:w-36 h-auto mt-0 mx-1 sm:mx-2" />
            </div>
            <div className="flex items-center flex-row-reverse">
              {matchup?.homeTeamLogo && (
                <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
              )}
              <div className="mr-1 sm:mr-2 text-black text-right">
                <div className="text-sm sm:text-lg font-bold">{matchup?.homeTeamName || 'Home Team'}</div>
                {homeTeamRecord && (
                  <div className="text-xs sm:text-sm">
                    OVR: {formatRecord(homeTeamRecord.total_wins, homeTeamRecord.total_losses, homeTeamRecord.total_ties)} |{' '}
                    {homeTeamRecord.conference}:{' '}
                    {formatRecord(homeTeamRecord.conferenceGames_wins, homeTeamRecord.conferenceGames_losses, homeTeamRecord.conferenceGames_ties)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 mt-1 sm:mt-2 px-2 sm:px-4">
            {loading && <div className="p-1 sm:p-2 text-gray-500 text-center">Loading records...</div>}
            {error && <div className="p-1 sm:p-2 text-red-500 text-center">Error: {error}</div>}

            <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr] gap-2 sm:gap-4">
              <div className="order-first md:order-2">
                <div className="border border-gray-300 rounded-lg p-0 mb-4">
                  <div className="flex items-center justify-center bg-gray-200 border-b-2 border-[#235347] h-[36px] p-2 rounded-t gap-2">
                    <span className="text-lg font-bold text-[#235347]">INSZN AI Insights Powered by:</span>
                    <img src="/INSZN_AI_Logo.png" alt="INSZN AI" className="h-full object-contain max-w-[120px] mt-2 mb-2" />
                  </div>
                  <div className="bg-white rounded-lg shadow-lg">
                    <table className="w-full text-sm text-left text-black">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-bold">Spread: Coming Soon {matchup?.awayTeamName}</td>
                          <td className="py-2 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => castVote('spread', 1)}
                                disabled={voting}
                                className="w-5 h-5 text-gray-400 hover:text-green-500 p-0 disabled:opacity-50"
                              >
                                +
                              </button>
                              <span className="text-xs font-bold text-green-600">{spreadVotes.up - spreadVotes.down}</span>
                              <button
                                onClick={() => castVote('spread', -1)}
                                disabled={voting}
                                className="w-5 h-5 text-gray-400 hover:text-red-500 p-0 disabled:opacity-50"
                              >
                                −
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 px-4 font-bold">O/U: Coming Soon</td>
                          <td className="py-2 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => castVote('ou', 1)}
                                disabled={voting}
                                className="w-5 h-5 text-gray-400 hover:text-green-500 p-0 disabled:opacity-50"
                              >
                                +
                              </button>
                              <span className="text-xs font-bold text-green-600">{ouVotes.up - ouVotes.down}</span>
                              <button
                                onClick={() => castVote('ou', -1)}
                                disabled={voting}
                                className="w-5 h-5 text-gray-400 hover:text-red-500 p-0 disabled:opacity-50"
                              >
                                −
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <HeadToHeadReport year={year} awayTeamId={matchup?.awayId} homeTeamId={matchup?.homeId} />
              </div>
              <div className="order-2 md:order-1">
                <TeamAReport teamName={matchup?.awayTeamName} year={year} teamId={matchup?.awayId} />
              </div>
              <div className="order-3 md:order-3">
                <TeamBReport teamName={matchup?.homeTeamName} year={year} teamId={matchup?.homeId} />
              </div>
            </div>
          </div>
        </div>

        {!isSubscribed && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
            <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
              <p className="text-gray-700 text-base sm:text-lg font-semibold mb-2">Exclusive Content</p>
              <p className="text-gray-500 text-sm sm:text-base mb-4">This content is exclusive to INSZN Insider subscribers.</p>
              <Link
                to="/subscribe"
                className="px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white text-sm sm:text-base rounded hover:bg-[#1b3e32]"
              >
                Subscribe Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoutingReport;