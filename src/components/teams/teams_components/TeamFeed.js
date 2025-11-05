import React from 'react';

const TeamFeed = ({ teamData, year }) => {
  if (!teamData?.id) return null;

  return (
    <div className="h-[300px] overflow-auto bg-white rounded-lg p-2">
      <div
        id="commento"
        data-page-id={`/teams/${teamData.id}/${year}`}
        dangerouslySetInnerHTML={{
          __html: `<script defer src="https://cdn.commento.io/js/commento.js"></script>`,
        }}
      />
    </div>
  );
};

export default TeamFeed;