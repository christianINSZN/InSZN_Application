// src/components/games/singleGameRecapComponents/AdvancedBoxScore.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdvancedBoxScore = ({ gameId, awayStats, homeStats, awayTeamName, homeTeamName, year }) => {
  const [awayPassers, setAwayPassers] = useState([]);
  const [awayRushers, setAwayRushers] = useState([]);
  const [awayReceivers, setAwayReceivers] = useState([]);
  const [awayBlockers, setAwayBlockers] = useState([]);
  const [homePassers, setHomePassers] = useState([]);
  const [homeRushers, setHomeRushers] = useState([]);
  const [homeReceivers, setHomeReceivers] = useState([]);
  const [homeBlockers, setHomeBlockers] = useState([]);
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

    const fetchTeamPlayers = async (teamId, teamName, setPass, setRush, setRec, setBlock) => {
      const base = process.env.REACT_APP_API_URL;
      const urls = {
        pass: `${base}/api/team_passing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rush: `${base}/api/team_rushing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rec: `${base}/api/team_receiving_weekly/${teamId}/${year}/${week}/${seasonType}`,
        block: `${base}/api/team_blocking_weekly/${teamId}/${year}/${week}/${seasonType}`,
      };

      try {
        const [pRes, rRes, recRes, bRes] = await Promise.all([
          fetch(urls.pass), fetch(urls.rush), fetch(urls.rec), fetch(urls.block)
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

        setPass(p);
        setRush(r);
        setRec(rec);
        setBlock(b);

        return [...p, ...r, ...rec, ...b];
      } catch (err) {
        return [];
      }
    };

    const fetchAll = async () => {
      setLoading(true);
      const [awayPlayers, homePlayers] = await Promise.all([
        fetchTeamPlayers(awayTeamId, awayTeamName, setAwayPassers, setAwayRushers, setAwayReceivers, setAwayBlockers),
        fetchTeamPlayers(homeTeamId, homeTeamName, setHomePassers, setHomeRushers, setHomeReceivers, setHomeBlockers),
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
      <Link to={`/players/${posPath}/${player.playerId}`} className="font-medium text-[#235347] hover:underline">
        {info.name}
      </Link>
    );
  };

  // -----------------------------------------------------------------------
  // Reusable Table
  // -----------------------------------------------------------------------
  const StatTable = ({ title, data, headers, renderRow }) => (
    <div>
      <h3 className="text-lg font-bold text-[#235347] mb-2">{title}</h3>
      <div className="bg-gray-50 rounded border overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
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
                <td colSpan={headers.length} className="py-2 text-center text-gray-500">
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
  // Render Rows
  // -----------------------------------------------------------------------
  const renderPassingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-t border-gray-200">
      <td className="py-1 px-2">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-2 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.completions}/{p.attempts}</td>
      <td className="py-1 px-2 text-center">
        {p.completion_percent ? p.completion_percent.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-2 text-center font-medium">{p.yards ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.interceptions ?? 0}</td>
      <td className="py-1 px-2 text-center">
        {p.qb_rating ? p.qb_rating.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.sacks ?? 0}</td>
    </tr>
  );

  const renderRushingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-t border-gray-200">
      <td className="py-1 px-2">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-2 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.attempts ?? 0}</td>
      <td className="py-1 px-2 text-center font-medium">{p.yards ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.yards_after_contact ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.longest ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.fumbles ?? 0}</td>
    </tr>
  );

  const renderReceivingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-t border-gray-200">
      <td className="py-1 px-2">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-2 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.receptions ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.targets ?? 0}</td>
      <td className="py-1 px-2 text-center font-medium">{p.yards ?? 0}</td>
      <td className="py-1 px-2 text-center">
        {p.yards_per_reception ? p.yards_per_reception.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.touchdowns ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.longest ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.drops ?? 0}</td>
    </tr>
  );

  const renderBlockingRow = (p, i) => (
    <tr key={p.playerId || i} className="border-t border-gray-200">
      <td className="py-1 px-2">
        <PlayerLink player={p} />
      </td>
      <td className="py-1 px-2 text-center text-gray-600">
        {playerInfo[p.playerId]?.position || '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.snap_counts_offense ?? 0}</td>
      <td className="py-1 px-2 text-center">
        {p.pass_block_percent ? p.pass_block_percent.toFixed(1) : '—'}
      </td>
      <td className="py-1 px-2 text-center">{p.sacks_allowed ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.hits_allowed ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.hurries_allowed ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.pressures_allowed ?? 0}</td>
      <td className="py-1 px-2 text-center">{p.penalties ?? 0}</td>
    </tr>
  );

  return (
    <div className="p-2 sm:p-4 bg-white rounded-lg shadow-lg space-y-8">
      <h2 className="text-xl font-bold text-[#235347] text-center mb-6">Advanced Box Score</h2>

      {loading ? (
        <p className="text-center text-gray-500">Loading player stats...</p>
      ) : (
        <>
          {/* === PASSING === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </>
      )}
    </div>
  );
};

export default AdvancedBoxScore;