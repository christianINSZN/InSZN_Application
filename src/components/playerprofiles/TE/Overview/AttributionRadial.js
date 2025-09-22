import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

const AttributionRadial = ({ playerId, year, percentileGrades }) => {
  // Function to get grade value from percentileGrades
  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Grade A': return percentileGrades.percentile_targets || 'N/A';
      case 'Grade B': return percentileGrades.percentile_yards_after_catch || 'N/A';
      case 'Grade C': return percentileGrades.percentile_caught_percent || 'N/A';
      case 'Grade D': return percentileGrades.percentile_contested_catch_rate || 'N/A';
      case 'Grade E': return percentileGrades.percentile_drop_rate || 'N/A';
      
      case 'Grade F': return percentileGrades.percentile_medium_grades_pass || 'N/A';
      case 'Grade G': return percentileGrades.percentile_deep_grades_pass || 'N/A';
      case 'Grade H': return percentileGrades.percentile_pressure_grades_pass || 'N/A';
      case 'Grade J': return percentileGrades.percentile_blitz_grades_pass || 'N/A';
      default: return 'N/A';
    }
  };

  // Function to format percentile with two decimals (matching HeadlineGrades)
  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  // Manually adjustable label mappings (customize these as needed)
  const customLabels = {
    'Grade A': 'Usage Share',
    'Grade B': 'Explosiveness',
    'Grade C': 'Consistency',
    'Grade D': 'Strength', // Indicate inversion in label
    'Grade E': 'Ball Security'
  };
  const [data, setData] = useState({ labels: [], data: [] });
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('AttributionRadial props:', { playerId, year, percentileGrades });
    console.log(`Processing data for playerId: ${playerId}, year: ${year}, percentileGrades:`, percentileGrades);

    if (!percentileGrades) {
      console.warn('percentileGrades is undefined, setting empty data');
      setData({ labels: [], data: [] });
      return;
    }

    // Extract data for the 5 specific grades
    const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
    const labels = gradeKeys.map(key => customLabels[key] || key.replace('Grade ', '').replace(/([A-Z])/g, ' $1').trim());
    const dataValues = gradeKeys.map(key => {
      const value = getGradeValue(key);
      console.log(`Processing ${key}: ${value}`);
      let numericValue = value === 'N/A' ? 0 : parseFloat(value) || 0;
      if (key === 'Grade F') { // Invert for Ball Security (lower fumble rate is better)
        numericValue = 100 - numericValue;
      }
      return numericValue;
    });

    if (dataValues.every(v => v === 0)) {
      console.warn('All data values are 0, chart may be blank');
    }

    console.log('Processed data:', { labels, data: dataValues });
    setData({ labels, data: dataValues });
  }, [playerId, year, percentileGrades]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      console.log('Previous chart destroyed');
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && data.labels.length > 0 && data.data.length > 0 && data.data.some(v => v > 0)) {
      console.log('Creating chart with data:', data);
      chartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Percentile',
            data: data.data,
            backgroundColor: 'rgba(35, 83, 71, 0.3)',
            borderColor: 'rgba(35, 83, 71, 1)',
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
          }],
        },
        options: {
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: {
                stepSize: 20,
                font: {
                  size: 10,
                },
              },
              pointLabels: {
                font: {
                  size: 16,
                  family: 'Arial',
                  weight: 'bold'
                },
                color: '#235347',
              },
              angleLines: { display: true },
              grid: { circular: true },
            },
          },
          plugins: {
            legend: { display: false },
          },
          maintainAspectRatio: false,
          responsive: true,
        },
      });
      console.log('Chart created successfully');
    } else {
      console.log('Chart not created - data or context missing:', { labels: data.labels.length, data: data.data, somePositive: data.data.some(v => v > 0) });
    }
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-lg row-span-2">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Attribution Radial</h2>
      <div className="h-[380px] bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: '600px', maxHeight: '320px' }} />
        {!data.labels.length && <div className="absolute text-red-500">No data available</div>}
      </div>
    </div>
  );
};

export default AttributionRadial;

