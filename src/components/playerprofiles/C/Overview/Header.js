// In src/components/players/Header.js
import React from 'react';

const Header = ({ firstName, lastName, school, position, jersey, height, weight, year, gradesData = {} }) => {
  return (
    <div className="bg-gradient-to-r from-gray-100 to-white p-6 rounded-xl shadow-xl mb-6 grid grid-cols-[3fr_2fr] gap-6 items-center">
      {/* Left Column: Player Info */}
      <div className="space-y-4">
        <div className="flex items-center space-x-6">
          {/* Container for First and Last Name */}
          <div>
            <h1 className="text-3xl  text-gray-900">{firstName}</h1>
            <h2 className="text-4xl font-semibold text-gray-700">{lastName}</h2>
          </div>
          {/* Vertical Line */}
          <div className="h-20 border-l-2 border-gray-400"></div> {/* Vertical line */}
          {/* Container for Metadata */}
          <div className="flex flex-col text-lg text-gray-600">
            <span>{school || 'N/A'} · {position || 'N/A'} · #{jersey || 'N/A'}</span>
            <span className="text-md text-gray-500">{height ? `${height}in` : 'N/A'} · {weight ? `${weight}lbs` : 'N/A'}</span>
          </div>
        </div>
      </div>
      {/* Right Column: Stats */}
      <div className="space-y-4">
        <p className="text-md text-gray-600 text-center">{year || 'N/A'} Season</p>
        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.yards || 'N/A'}</p>
            <p className="text-md text-gray-600">Yards</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.touchdowns || 'N/A'}</p>
            <p className="text-md text-gray-600">TD</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.receptions || 'N/A'}</p>
            <p className="text-md text-gray-600">REC</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.grades_pass_route || 'N/A'}</p>
            <p className="text-md text-gray-600">Rec. Grade</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;