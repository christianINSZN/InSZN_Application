import React from 'react';

const TeamStats = ({ teamData }) => {
  return (
    <div className="p-0 shadow-xl rounded-lg h-full">
      <div
        className="h-[300px] overflow-auto bg-gray-100 rounded-lg p-4"
        dangerouslySetInnerHTML={{
          __html: `
            <div id="commento" data-page-id="team-${teamData.id}"></div>
            <script defer src="https://cdn.commento.io/js/commento.js"></script>
          `,
        }}
      />
    </div>
  );
};

export default TeamStats;