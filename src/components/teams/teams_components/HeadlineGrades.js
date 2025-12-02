import React from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const HeadlineGrades = ({ percentileGrades, className = "text-sm sm:text-base" }) => {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';
  const isPremium = isSubscribed;

  const convertToLetterGrade = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    if (numValue >= 100) return '#1';
    if (numValue >= 95) return 'A+';
    if (numValue >= 87.91666667) return 'A';
    if (numValue >= 80.83333333) return 'A-';
    if (numValue >= 73.75) return 'B+';
    if (numValue >= 66.66666667) return 'B';
    if (numValue >= 59.58333333) return 'B-';
    if (numValue >= 52.5) return 'C+';
    if (numValue >= 45.41666667) return 'C';
    if (numValue >= 38.33333333) return 'C-';
    if (numValue >= 31.25) return 'D+';
    if (numValue >= 24.16666667) return 'D';
    if (numValue >= 17.08333333) return 'D-';
    return 'F';
  };

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Pass Grade': return percentileGrades.percentile_qb_rating || 'N/A';
      case 'Run Grade': return percentileGrades.percentile_grades_run || 'N/A';
      case 'Pass Route Grade': return percentileGrades.percentile_grades_pass_route || 'N/A';
      case 'Run Block Grade': return percentileGrades.percentile_grades_run_block || 'N/A';
      case 'Pass Block Grade': return percentileGrades.percentile_grades_pass_block || 'N/A';
      case 'Coverage Defense Grade': return percentileGrades.percentile_grades_coverage_defense || 'N/A';
      case 'Pass Rush Defense Grade': return percentileGrades.percentile_grades_pass_rush_defense || 'N/A';
      case 'Run Defense Grade': return percentileGrades.percentile_grades_run_defense || 'N/A';
      default: return 'N/A';
    }
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const isMobile = window.innerWidth < 640;

  const content = isMobile ? (
    <div className="h-auto bg-white rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
      <div className="grid grid-cols-1 gap-4 mb-4 h-auto">
        <div className="bg-gray-0 p-2 rounded shadow-lg">
          <h3 className="text-sm font-semibold text-center mb-2">Offense</h3>
          <div className="grid grid-cols-1 gap-4">
            {['Pass Grade', 'Run Grade', 'Pass Route Grade', 'Run Block Grade', 'Pass Block Grade'].map((key) => (
              <div key={key} className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">{key.replace(' Grade', '')}</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue(key))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue(key))}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-0 p-2 rounded shadow-lg">
          <h3 className="text-sm font-semibold text-center mb-2">Defense</h3>
          <div className="grid grid-cols-1 gap-4">
            {['Coverage Defense Grade', 'Pass Rush Defense Grade', 'Run Defense Grade'].map((key) => (
              <div key={key} className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">{key.replace(' Grade', '')}</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue(key))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue(key))}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-120 bg-white rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
      <div className="mb-4 h-[50%]">
        <h3 className="text-md font-semibold text-center mb-2">Offense</h3>
        <div className="grid grid-cols-5 gap-4">
          {['Pass Grade', 'Run Grade', 'Pass Route Grade', 'Run Block Grade', 'Pass Block Grade'].map((key) => (
            <div key={key} className="bg-gray-0 p-2 rounded text-center shadow-lg">
              <h3 className="text-md font-medium">{key.replace(' Grade', '')}</h3>
              <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue(key))}</p>
              <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue(key))}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[40%]">
        <h3 className="text-md font-semibold text-center mb-2">Defense</h3>
        <div className="grid grid-cols-3 gap-2">
          {['Coverage Defense Grade', 'Pass Rush Defense Grade', 'Run Defense Grade'].map((key) => (
            <div key={key} className="bg-gray-0 p-2 rounded text-center shadow-lg">
              <h3 className="text-sm font-medium">{key.replace(' Grade', '')}</h3>
              <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue(key))}</p>
              <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue(key))}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {content}
      {!isPremium && (
        <div className="absolute inset-0 top-[40px] flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-b-lg">
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
  );
};

export default HeadlineGrades;