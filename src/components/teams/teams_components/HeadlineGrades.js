import React from 'react';

const HeadlineGrades = ({ percentileGrades, className }) => {
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

  if (isMobile) {
    return (
      <div className="h-auto bg-white rounded-lg shadow-lg">
        <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
        <div className="grid grid-cols-1 gap-4 mb-4 h-auto">
          <div className="bg-gray-0 p-2 rounded shadow-lg">
            <h3 className="text-sm font-semibold text-center mb-2">Offense</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Overall Passing</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Overall Rushing</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Pass Route</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Route Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Run Block</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Block Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Block Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Pass Block</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Block Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Block Grade'))}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-0 p-2 rounded shadow-lg">
            <h3 className="text-sm font-semibold text-center mb-2">Defense</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Coverage Defense</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Coverage Defense Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Coverage Defense Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Pass Rush Defense</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Rush Defense Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Rush Defense Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center shadow-lg min-h-[120px]">
                <h3 className="text-sm font-medium">Run Defense</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Defense Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Defense Grade'))}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-120 bg-white rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
      <div className="mb-4 h-[50%]">
        <h3 className="text-md font-semibold text-center mb-2">Offense</h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-md font-medium">Overall Passing</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
            <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-md font-medium">Overall Rushing</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Grade'))}</p>
            <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-md font-medium">Pass Route</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Route Grade'))}</p>
            <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Route Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-md font-medium">Run Block</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Block Grade'))}</p>
            <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Block Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-md font-medium">Pass Block</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Block Grade'))}</p>
            <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Block Grade'))}</p>
          </div>
        </div>
      </div>
      <div className="h-[40%]">
        <h3 className="text-md font-semibold text-center mb-2">Defense</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-sm font-medium">Coverage Defense</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Coverage Defense Grade'))}</p>
            <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Coverage Defense Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-sm font-medium">Pass Rush Defense</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Rush Defense Grade'))}</p>
            <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Pass Rush Defense Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center shadow-lg">
            <h3 className="text-sm font-medium">Run Defense</h3>
            <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Defense Grade'))}</p>
            <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Run Defense Grade'))}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadlineGrades;