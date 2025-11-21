// src/pages/Home.jsx
import React from 'react';
import LeftSidebar from './home/LeftSidebar';
import MainContent from './home/MainContent';
import RightSidebar from './home/RightSidebar';
import WeeklyGames from './home/WeeklyGames'; // Import

function Home() {
  return (
    <div className="max-w-8xl mx-auto p-2 sm:p-0 mt-0 sm:mt-10">
      {/* Games of the Week */}
      <WeeklyGames year="2025" week={13} />

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <LeftSidebar />
        </aside>
        <main className="md:col-span-2">
          <MainContent />
        </main>
        <aside className="md:col-span-1">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

export default Home;