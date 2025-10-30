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
  const modalRef = useRef(null);
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

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
        {/* Content Container with Conditional Blur and Pointer Events Disabled */}
        <div className={`${!isSubscribed ? 'filter blur-sm opacity-80 pointer-events-none' : ''}`}>
          {/* Green Bar with Logos, Team Names/Records, and INSZN Logo */}
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
          {/* Main Content */}
          <div className="flex-1 mt-1 sm:mt-2">
            {loading && <div className="p-1 sm:p-2 text-gray-500 text-center">Loading records...</div>}
            {error && <div className="p-1 sm:p-2 text-red-500 text-center">Error: {error}</div>}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr] gap-2 sm:gap-4">
              <div className="order-first md:order-2">
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
        {/* Paywall Overlay for Non-Subscribers */}
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