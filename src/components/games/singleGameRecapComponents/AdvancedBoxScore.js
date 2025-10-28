// src/components/games/singleGameRecapComponents/AdvancedBoxScore.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdvancedBoxScore = ({ gameId, awayStats, homeStats, awayTeamName, homeTeamName, year }) => {
  const [awayPassers, setAwayPassers] = useState([]);
  const [awayRushers, setAwayRushers] = useState([]);
  const [awayReceivers, setAwayReceivers] = useState([]);
  const [homePassers, setHomePassers] = useState([]);
  const [homeRushers, setHomeRushers] = useState([]);
  const [homeReceivers, setHomeReceivers] = useState([]);
  const [playerInfo, setPlayerInfo] = useState({});
  const [loading, setLoading] = useState(true);

  const week = awayStats?.week || homeStats?.week;
  const seasonType = awayStats?.seasonType || homeStats?.seasonType || 'regular';
  const awayTeamId = awayStats?.team_id;
  const homeTeamId = homeStats?.team_id;

  // -----------------------------------------------------------------------
  // Fetch Players
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!gameId || !week || !year || !awayTeamId || !homeTeamId) {
      setLoading(false);
      return;
    }

    const fetchTeamPlayers = async (teamId, teamName, setPass, setRush, setRec) => {
      const base = process.env.REACT_APP_API_URL;
      const urls = {
        pass: `${base}/api/team_passing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rush: `${base}/api/team_rushing_weekly/${teamId}/${year}/${week}/${seasonType}`,
        rec: `${base}/api/team_receiving_weekly/${teamId}/${year}/${week}/${seasonType}`,
      };

      try {
        const [pRes, rRes, recRes] = await Promise.all([
          fetch(urls.pass), fetch(urls.rush), fetch(urls.rec)
        ]);

        const parse = async (res) => {
          if (!res.ok) return [];
          const text = await res.text();
          try { return JSON.parse(text); } catch { return []; }
        };

        const p = await parse(pRes);
        const r = await parse(rRes);
        const rec = await parse(recRes);

        setPass(p.slice(0, 5));
        setRush(r.slice(0, 5));
        setRec(rec.slice(0, 5));

        return [...p, ...r, ...rec];
      } catch (err) {
        return [];
      }
    };

    const fetchAll = async () => {
      setLoading(true);
      const [awayPlayers, homePlayers] = await Promise.all([
        fetchTeamPlayers(awayTeamId, awayTeamName, setAwayPassers, setAwayRushers, setAwayReceivers),
        fetchTeamPlayers(homeTeamId, homeTeamName, setHomePassers, setHomeRushers, setHomeReceivers),
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
  // Fetch Player Info
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
            if (row) {
              info[playerId] = {
                name: row.name || 'Unknown',
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
  // Player Link
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
  // Passing Table
  // -----------------------------------------------------------------------
  const PassingTable = ({ teamName, passers }) => (
    <div>
      <h3 className="text-lg font-bold text-[#235347] mb-2">{teamName} Passing</h3>
      <div className="bg-gray-50 rounded border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="py-1 px-2 text-left font-medium">Player</th>
              <th className="py-1 px-2 text-center">POS</th>
              <th className="py-1 px-2 text-center">C/A</th>
              <th className="py-1 px-2 text-center">%</th>
              <th className="py-1 px-2 text-center">YDS</th>
              <th className="py-1 px-2 text-center">TD</th>
              <th className="py-1 px-2 text-center">INT</th>
              <th className="py-1 px-2 text-center">RATE</th>
              <th className="py-1 px-2 text-center">SACKS</th>
            </tr>
          </thead>
          <tbody>
            {passers.length > 0 ? (
              passers.map((p, i) => (
                <tr key={p.playerId || i} className="border-t border-gray-200">
                  <td className="py-1 px-2">
                    <PlayerLink player={p} />
                  </td>
                  <td className="py-1 px-2 text-center text-gray-600">
                    {playerInfo[p.playerId]?.position || '—'}
                  </td>
                  <td className="py-1 px-2 text-center">
                    {p.completions}/{p.attempts}
                  </td>
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
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-2 text-center text-gray-500">No passing data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Rushing Table
  // -----------------------------------------------------------------------
  const RushingTable = ({ teamName, rushers }) => (
    <div>
      <h3 className="text-lg font-bold text-[#235347] mb-2">{teamName} Rushing</h3>
      <div className="bg-gray-50 rounded border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="py-1 px-2 text-left font-medium">Player</th>
              <th className="py-1 px-2 text-center">POS</th>
              <th className="py-1 px-2 text-center">ATT</th>
              <th className="py-1 px-2 text-center">YDS</th>
              <th className="py-1 px-2 text-center">YAC</th>
              <th className="py-1 px-2 text-center">TD</th>
              <th className="py-1 px-2 text-center">LONG</th>
              <th className="py-1 px-2 text-center">FUM</th>
            </tr>
          </thead>
          <tbody>
            {rushers.length > 0 ? (
              rushers.map((p, i) => (
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
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-2 text-center text-gray-500">No rushing data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Receiving Table
  // -----------------------------------------------------------------------
  const ReceivingTable = ({ teamName, receivers }) => (
    <div>
      <h3 className="text-lg font-bold text-[#235347] mb-2">{teamName} Receiving</h3>
      <div className="bg-gray-50 rounded border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="py-1 px-2 text-left font-medium">Player</th>
              <th className="py-1 px-2 text-center">POS</th>
              <th className="py-1 px-2 text-center">REC</th>
              <th className="py-1 px-2 text-center">TAR</th>
              <th className="py-1 px-2 text-center">YDS</th>
              <th className="py-1 px-2 text-center">Y/R</th>
              <th className="py-1 px-2 text-center">TD</th>
              <th className="py-1 px-2 text-center">LONG</th>
              <th className="py-1 px-2 text-center">DROP</th>
            </tr>
          </thead>
          <tbody>
            {receivers.length > 0 ? (
              receivers.map((p, i) => (
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
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-2 text-center text-gray-500">No receiving data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
            <PassingTable teamName={awayTeamName} passers={awayPassers} />
            <PassingTable teamName={homeTeamName} passers={homePassers} />
          </div>

          {/* === RUSHING === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RushingTable teamName={awayTeamName} rushers={awayRushers} />
            <RushingTable teamName={homeTeamName} rushers={homeRushers} />
          </div>

          {/* === RECEIVING === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReceivingTable teamName={awayTeamName} receivers={awayReceivers} />
            <ReceivingTable teamName={homeTeamName} receivers={homeReceivers} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedBoxScore;