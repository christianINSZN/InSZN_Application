// src/components/games/singleGameRecapComponents/AdvancedBoxScore.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const AdvancedBoxScore = ({ gameId, awayStats, homeStats, awayTeamName, homeTeamName, year }) => {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';

  const [awayPassers, setAwayPassers] = useState([]);
  const [awayRushers, setAwayRushers] = useState([]);
  const [awayReceivers, setAwayReceivers] = useState([]);
  const [awayBlockers, setAwayBlockers] = useState([]);
  const [awayDefenders, setAwayDefenders] = useState([]);
  const [homePassers, setHomePassers] = useState([]);
  const [homeRushers, setHomeRushers] = useState([]);
  const [homeReceivers, setHomeReceivers] = useState([]);
  const [homeBlockers, setHomeBlockers] = useState([]);
  const [homeDefenders, setHomeDefenders] = useState([]);
  const [playerInfo, setPlayerInfo] = useState({});
  const [loading, setLoading] = useState(true);

  const week = awayStats?.week || homeStats?.week;
  const seasonType = awayStats?.seasonType || homeStats?.seasonType || 'regular';
  const awayTeamId = awayStats?.team_id;
  const homeTeamId = homeStats?.team_id;

  // -----------------------------------------------------------------------
  // Fetch Players (NO LIMIT)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!gameId || !week || !year || !awayTeamId || !homeTeamId) {
      setLoading(false);
      return;
    }

    const fetchTeamPlayers = async (teamId, teamName, setPass, setRush, setRec, setBlock, setDef) => {
      const base = process.env.REACT_APP_API_URL;
      const urls = {
        pass: `${base}/api/team_passing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rush: `${base}/api/team_rushing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rec: `${base}/api/team_receiving_weekly/${teamId}/${year}/${week}/${seasonType}`,
        block: `${base}/api/team_blocking_weekly/${teamId}/${year}/${week}/${seasonType}`,
        def: `${base}/api/team_defense_weekly/${teamId}/${year}/${week}/${seasonType}`,
      };

      try {
        const [pRes, rRes, recRes, bRes, dRes] = await Promise.all([
          fetch(urls.pass), fetch(urls.rush), fetch(urls.rec), fetch(urls.block), fetch(urls.def)
        ]);

        const parse = async (res) => {
          if (!res.ok) return [];
          const text = await res.text();
          try { return JSON.parse(text); } catch { return []; }
        };

        const p = await parse(pRes);
        const r = await parse(rRes);
        const rec = await parse(recRes);
        const b = await parse(bRes);
        const d = await parse(dRes);

        setPass(p);
        setRush(r);
        setRec(rec);
        setBlock(b);
        setDef(d);

        return [...p, ...r, ...rec, ...b, ...d];
      } catch (err) {
        return [];
      }
    };

    const fetchAll = async () => {
      setLoading(true);
      const [awayPlayers, homePlayers] = await Promise.all([
        fetchTeamPlayers(awayTeamId, awayTeamName, setAwayPassers, setAwayRushers, setAwayReceivers, setAwayBlockers, setAwayDefenders),
        fetchTeamPlayers(homeTeamId, homeTeamName, setHomePassers, setHomeRushers, setHomeReceivers, setHomeBlockers, setHomeDefenders),
      ]);

      const playerIds = new Set();
      [...awayPlayers, ...homePlayers].forEach(p => p?.playerId && playerIds.add(p.playerId));

      if (playerIds.size > 0) {
        fetchPlayerInfo(Array.from(playerIds));
      } else {
        setLoading(false);
      }
    };

    fetchAll();
  }, [gameId, year, week, seasonType, awayTeamId, homeTeamId, awayTeamName, homeTeamName]);

  // -----------------------------------------------------------------------
  // Fetch Player Info (name + position) — DROP NULL NAMES
  // -----------------------------------------------------------------------
  const fetchPlayerInfo = async (playerIds) => {
    const base = process.env.REACT_APP_API_URL;
    const url = `${base}/api/player_headline/${year}`;

    try {
      const responses = await Promise.all(playerIds.map(id => fetch(`${url}/${id}`)));
      const info = {};

      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        const playerId = playerIds[i];
        if (res.ok) {
          try {
            const data = JSON.parse(await res.text());
            const row = data[0];
            if (row && row.name && row.name.trim() !== '') {
              info[playerId] = {
                name: row.name,
                position: row.position || 'UNK'
              };
            }
          } catch (e) {}
        }
      }

      setPlayerInfo(info);
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Player Link (Name from headline)
  // -----------------------------------------------------------------------
  const PlayerLink = ({ player }) => {
    if (!player?.playerId) return <span className="text-gray-500">—</span>;
    const info = playerInfo[player.playerId];
    if (!info) return <span className="text-gray-500">—</span>;
    const posPath = info.position.toLowerCase();
    return (
      <Link to={`/players/${posPath}/${player.playerId}`} className="font-bold text-[#235347] hover:underline">
        {info.name}
      </Link>
    );
  };

  // -----------------------------------------------------------------------
  // Reusable Table (Mobile-Optimized)
  // -----------------------------------------------------------------------
  const StatTable = ({ title, data, headers, renderRow }) => (
    <div className="border border-gray-300 rounded-lg p-0">
      <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">
        {title}
      </h2>
      <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-xs text-left text-black min-w-[600px]">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={`py-1 px-2 text-${h.align || 'center'} font-medium`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((p, i) => {
                const info = playerInfo[p.playerId];
                if (!info) return null;
                return renderRow(p, i);
              }).filter(Boolean)
            ) : (
              <tr>
                <td colSpan={headers.length} className="py-1 text-center text-gray-500">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render Rows (Shorter: py-1)
  // -----------------------------------------------------------------------
  const renderPassingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-b">
      <td className="py-1 px-4">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-4 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.completions}/{p.attempts}</td>
      <td className="py-1 px-4 text-center">
        {p.completion_percent ? p.completion_percent.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-4 text-center font-bold">{p.yards ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.interceptions ?? 0}</td>
      <td className="py-1 px-4 text-center">
        {p.qb_rating ? p.qb_rating.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.sacks ?? 0}</td>
    </tr>
  );

  const renderRushingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-b">
      <td className="py-1 px-4">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-4 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.attempts ?? 0}</td>
      <td className="py-1 px-4 text-center font-bold">{p.yards ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.yards_after_contact ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.longest ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.fumbles ?? 0}</td>
    </tr>
  );

  const renderReceivingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-b">
      <td className="py-1 px-4">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-4 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.receptions ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.targets ?? 0}</td>
      <td className="py-1 px-4 text-center font-bold">{p.yards ?? 0}</td>
      <td className="py-1 px-4 text-center">
        {p.yards_per_reception ? p.yards_per_reception.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.longest ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.drops ?? 0}</td>
    </tr>
  );

  const renderBlockingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-b">
      <td className="py-1 px-4">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-4 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.snap_counts_offense ?? 0}</td>
      <td className="py-1 px-4 text-center">
        {p.pass_block_percent ? p.pass_block_percent.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.sacks_allowed ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.hits_allowed ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.hurries_allowed ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.pressures_allowed ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.penalties ?? 0}</td>
    </tr>
  );

  const renderDefenseRow = (p, i) => (
    <tr key={p.playerId || i} className="border-b">
      <td className="py-1 px-4">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-4 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-4 text-center">{p.tackles ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.assists ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.sacks ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.tackles_for_loss ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.interceptions ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.pass_break_ups ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.forced_fumbles ?? 0}</td>
      <td className="py-1 px-4 text-center">{p.fumble_recoveries ?? 0}</td>
    </tr>
  );

  return (
    <div className="relative">
      {/* Render full content */}
      <div className={isSubscribed ? '' : 'filter blur-xs opacity-80'}>
        {loading ? (
          <p className="text-center text-gray-500">Loading player stats...</p>
        ) : (
          <div className="space-y-4">
            {/* === PASSING === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatTable
                title={`${awayTeamName} Passing`}
                data={awayPassers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'C/A' },
                  { label: '%' },
                  { label: 'YDS' },
                  { label: 'TD' },
                  { label: 'INT' },
                  { label: 'RATE' },
                  { label: 'SACKS' },
                ]}
                renderRow={renderPassingRow}
              />
              <StatTable
                title={`${homeTeamName} Passing`}
                data={homePassers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'C/A' },
                  { label: '%' },
                  { label: 'YDS' },
                  { label: 'TD' },
                  { label: 'INT' },
                  { label: 'RATE' },
                  { label: 'SACKS' },
                ]}
                renderRow={renderPassingRow}
              />
            </div>

            {/* === RUSHING === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatTable
                title={`${awayTeamName} Rushing`}
                data={awayRushers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'ATT' },
                  { label: 'YDS' },
                  { label: 'YAC' },
                  { label: 'TD' },
                  { label: 'LONG' },
                  { label: 'FUM' },
                ]}
                renderRow={renderRushingRow}
              />
              <StatTable
                title={`${homeTeamName} Rushing`}
                data={homeRushers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'ATT' },
                  { label: 'YDS' },
                  { label: 'YAC' },
                  { label: 'TD' },
                  { label: 'LONG' },
                  { label: 'FUM' },
                ]}
                renderRow={renderRushingRow}
              />
            </div>

            {/* === RECEIVING === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatTable
                title={`${awayTeamName} Receiving`}
                data={awayReceivers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'REC' },
                  { label: 'TAR' },
                  { label: 'YDS' },
                  { label: 'Y/R' },
                  { label: 'TD' },
                  { label: 'LONG' },
                  { label: 'DROP' },
                ]}
                renderRow={renderReceivingRow}
              />
              <StatTable
                title={`${homeTeamName} Receiving`}
                data={homeReceivers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'REC' },
                  { label: 'TAR' },
                  { label: 'YDS' },
                  { label: 'Y/R' },
                  { label: 'TD' },
                  { label: 'LONG' },
                  { label: 'DROP' },
                ]}
                renderRow={renderReceivingRow}
              />
            </div>

            {/* === BLOCKING === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatTable
                title={`${awayTeamName} Blocking`}
                data={awayBlockers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'SNAPS' },
                  { label: 'PB%' },
                  { label: 'SACKS' },
                  { label: 'HITS' },
                  { label: 'HURRY' },
                  { label: 'PRESS' },
                  { label: 'PEN' },
                ]}
                renderRow={renderBlockingRow}
              />
              <StatTable
                title={`${homeTeamName} Blocking`}
                data={homeBlockers}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'SNAPS' },
                  { label: 'PB%' },
                  { label: 'SACKS' },
                  { label: 'HITS' },
                  { label: 'HURRY' },
                  { label: 'PRESS' },
                  { label: 'PEN' },
                ]}
                renderRow={renderBlockingRow}
              />
            </div>

            {/* === DEFENSE === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatTable
                title={`${awayTeamName} Defense`}
                data={awayDefenders}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'TKL' },
                  { label: 'AST' },
                  { label: 'SACK' },
                  { label: 'TFL' },
                  { label: 'INT' },
                  { label: 'PBU' },
                  { label: 'FF' },
                  { label: 'FR' },
                ]}
                renderRow={renderDefenseRow}
              />
              <StatTable
                title={`${homeTeamName} Defense`}
                data={homeDefenders}
                headers={[
                  { label: 'Player', align: 'left' },
                  { label: 'POS' },
                  { label: 'TKL' },
                  { label: 'AST' },
                  { label: 'SACK' },
                  { label: 'TFL' },
                  { label: 'INT' },
                  { label: 'PBU' },
                  { label: 'FF' },
                  { label: 'FR' },
                ]}
                renderRow={renderDefenseRow}
              />
            </div>
          </div>
        )}
      </div>

      {/* PREMIUM LOCK OVERLAY */}
      {!isSubscribed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-md rounded-lg">
          <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-[#235347]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a1 1 0 001 1h3a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6a1 1 0 011-1h3a1 1 0 001-1zm5-2v2h2V7a2 2 0 10-4 0v2h2z" clipRule="evenodd" />
            </svg>
            <p className="text-gray-700 text-base sm:text-lg font-semibold mb-2">Exclusive Content</p>
            <p className="text-gray-500 text-sm sm:text-base mb-4">
              This content is exclusive to INSZN Insider subscribers.
            </p>
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
  );
};

export default AdvancedBoxScore;