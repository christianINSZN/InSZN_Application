import React, { useEffect } from 'react';

const TeamFeed = ({ teamData, year }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.commento.io/js/commento.js';
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!teamData?.id) return null;

  return (
    <div className="h-[300px] overflow-auto bg-white rounded-lg p-4">
      <div
        id="commento"
        data-page-id={`/teams/${teamData.id}/${year}`}
      />
    </div>
  );
};

export default TeamFeed;