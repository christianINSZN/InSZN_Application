import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart } from 'chart.js/auto';

// Metric explanations for WR
const metricExplanations = {
  'Yards': 'Total receiving yards gained against man coverage.',
  'Receptions': 'Number of receptions made against man coverage.',
  'Yards Per Reception': 'Average yards per reception against man coverage.',
  'Catch Rate': 'Percentage of catchable passes caught against man coverage.',
  'Depth of Target': 'Average depth of target for passes against man coverage.'
};

const AttributionRadial = ({
  player1,
  player2,
  excludedMetrics = ['first_downs', 'fumbles_lost', 'longest', 'total_touches'],
  metricRenames = {
    'yards_per_reception': 'Yards Per Reception',
    'caught_percent': 'Catch Rate',
    'contested_catch_rate': 'Contested Catch %',
    'drop_rate': 'Drop Rate'
  }
}) => {
  const [percentileGrades1, setPercentileGrades1] = useState(null);
  const [percentileGrades2, setPercentileGrades2] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    const fetchData = async (player, setGrades) => {
      if (player && player.playerId && player.year) {
        setLoading(true);
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_WR/${player.playerId}/${player.year}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log(`Fetched data for player ${player.playerId}:`, data);
          setGrades(data);
        } catch (error) {
          console.error(`Error fetching data for player ${player.playerId}:`, error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setGrades(null);
      }
    };
    fetchData(player1, setPercentileGrades1);
    fetchData(player2, setPercentileGrades2);
  }, [player1, player2]);

  const chartData = useMemo(() => {
    if (!percentileGrades1 || !percentileGrades2) return null;

    const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
    const metricKeys = [
      'percentile_man_yards',
      'percentile_man_receptions',
      'percentile_man_yards_per_reception',
      'percentile_man_caught_percent',
      'percentile_man_avg_depth_of_target'
    ];

    const labels = gradeKeys.map((key, index) => {
      const customLabels = {
        'Grade A': 'Yards',
        'Grade B': 'Receptions',
        'Grade C': 'Yards Per Reception',
        'Grade D': 'Catch Rate',
        'Grade E': 'Depth of Target'
      };
      return customLabels[key] || key.replace('Grade ', '').replace(/([A-Z])/g, ' $1').trim();
    });

    const getGradeValue = (gradeKey, grades, metricKey) => {
      if (!grades) return 0;
      const value = grades[metricKey] || 0;
      // No inversion needed for WR metrics
      return value;
    };

    const data1 = gradeKeys.map((key, index) => getGradeValue(key, percentileGrades1, metricKeys[index]));
    const data2 = gradeKeys.map((key, index) => getGradeValue(key, percentileGrades2, metricKeys[index]));

    return {
      labels,
      datasets: [
        {
          label: player1 ? `${player1.name} (${player1.year})` : 'Player 1',
          data: data1,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
        },
        {
          label: player2 ? `${player2.name} (${player2.year})` : 'Player 2',
          data: data2,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          pointRadius: 2,
          fill: true,
        },
      ]
    };
  }, [percentileGrades1, percentileGrades2, player1, player2]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && chartData) {
      try {
        chartRef.current = new Chart(ctx, {
          type: 'radar',
          data: chartData,
          options: {
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 20,
                  font: {
                    size: isMobile ? 12 : 15,
                  },
                },
                pointLabels: {
                  font: {
                    size: isMobile ? 14 : 16,
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
              legend: { 
                display: true, 
                position: 'top',
                labels: {
                  font: { size: isMobile ? 12 : 14 }
                }
              },
              tooltip: {
                enabled: false,
                external: (context) => {
                  const tooltipModel = context.tooltip;
                  let tooltipEl = document.getElementById('chartjs-tooltip');
                  if (!tooltipEl) {
                    tooltipEl = document.createElement('div');
                    tooltipEl.id = 'chartjs-tooltip';
                    document.body.appendChild(tooltipEl);
                  }
                  if (tooltipModel.opacity === 0) {
                    tooltipEl.style.opacity = 0;
                    return;
                  }
                  tooltipEl.style.maxWidth = '200px';
                  tooltipEl.style.wordWrap = 'break-word';
                  tooltipEl.style.fontFamily = 'Arial';
                  tooltipEl.style.fontSize = isMobile ? '12px' : '14px';
                  tooltipEl.style.padding = '8px';
                  tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                  tooltipEl.style.color = 'white';
                  tooltipEl.style.borderRadius = '4px';
                  tooltipEl.style.pointerEvents = 'none';
                  tooltipEl.style.position = 'absolute';
                  const title = (tooltipModel.title && tooltipModel.title.length) ? tooltipModel.title[0] : '';
                  const bodyLines = tooltipModel.body ? tooltipModel.body.map(b => b.lines).flat() : [];
                  let innerHtml = '';
                  if (title) {
                    innerHtml += `<div style="font-size: ${isMobile ? '14px' : '16px'}; font-weight: bold; margin-bottom: 4px;">${title}</div>`;
                  }
                  bodyLines.forEach(line => {
                    if (line) {
                      innerHtml += `<div style="margin-bottom: 2px;">${line}</div>`;
                    }
                  });
                  const explanation = metricExplanations[title] || 'No explanation available';
                  innerHtml += `<div style="margin-top: 4px;">${explanation}</div>`;
                  tooltipEl.innerHTML = innerHtml;
                  const { left, top } = context.chart.canvas.getBoundingClientRect();
                  tooltipEl.style.left = left + window.pageXOffset + tooltipModel.caretX + 'px';
                  tooltipEl.style.top = top + window.pageYOffset + tooltipModel.caretY + 'px';
                  tooltipEl.style.opacity = 1;
                },
                callbacks: {
                  title: (tooltipItems) => {
                    return tooltipItems[0].label;
                  },
                  label: (tooltipItem) => {
                    const label = tooltipItem.label;
                    const value = tooltipItem.raw.toFixed(2) + '%';
                    return [`Percentile: ${value}`, "────────────"];
                  }
                }
              }
            },
            maintainAspectRatio: false,
            responsive: true,
          },
        });
      } catch (error) {
        console.error('Chart creation failed:', error);
      }
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData, isMobile]);

  return (
    <div className="bg-white rounded-lg shadow-lg row-span-2">
      <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">
        Attribution Radial
      </h2>
      <div className="h-[380px] bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: '600px', maxHeight: '320px' }} />
        {loading && <div className="absolute flex justify-center items-center"><div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
        {!loading && !percentileGrades1 && !percentileGrades2 && <div className="absolute text-red-500 text-sm sm:text-base">No data available</div>}
      </div>
    </div>
  );
};

export default AttributionRadial;