import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

// Metric explanations
const metricExplanations = {
  'Usage Share': 'Measures the player\'s share of total team rushing attempts.',
  'Explosiveness': 'Evaluates the ability to generate big plays in the run game.',
  'Breakaway': 'Assesses the frequency of long runs resulting in significant yardage.',
  'Strength': 'Evaluates yards gained after contact, indicating physicality.',
  'Ball Security': 'Measures the ability to avoid fumbles during runs.'
};

const AttributionRadial = ({
  player1,
  player2,
  excludedMetrics = ['first_downs', 'fumbles_lost', 'longest', 'total_touches'],
  metricRenames = {
    'ypa': 'YPA',
    'elu_rush_mtf': 'Missed Tackles Forced',
    'breakaway_percent': 'Breakaway %',
    'yards_after_contact': 'Yards After Contact',
    'yco_attempt': 'Yards After Contact per Attempt',
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
      if (player) {
        setLoading(true);
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_RB/${player.playerId}/${player.year}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
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

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && percentileGrades1 && percentileGrades2) {
      const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
      const metricKeys = [
        'percentile_total_touches',
        'percentile_explosive',
        'percentile_breakaway_percent',
        'percentile_yards_after_contact',
        'percentile_grades_hands_fumble_rushing'
      ];
      const labels = gradeKeys.map((key, index) => {
        const customLabels = {
          'Grade A': 'Usage Share',
          'Grade B': 'Explosiveness',
          'Grade C': 'Breakaway',
          'Grade D': 'Strength',
          'Grade E': 'Ball Security'
        };
        return customLabels[key];
      });

      const getGradeValue = (gradeKey, grades, metricKey) => {
        if (!grades) return 0;
        let value = grades[metricKey] || 0;
        if (gradeKey === 'Grade E') {
          value = 100 - value; // Invert for Ball Security
        }
        return value;
      };

      const data1 = gradeKeys.map((key, index) =>
        getGradeValue(key, percentileGrades1, metricKeys[index])
      );
      const data2 = gradeKeys.map((key, index) =>
        getGradeValue(key, percentileGrades2, metricKeys[index])
      );

      chartRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
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
          ],
        },
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
                  size: isMobile ? 12 : 16,
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
                font: {
                  size: isMobile ? 12 : 12,
                  family: isMobile ? 'Arial' : undefined,
                  weight: isMobile ? 'bold' : undefined,
                },
                color: isMobile ? '#235347' : undefined,
              },
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
                innerHtml += `<div style="margin-top: 4px; font-style: italic;">${explanation}</div>`;
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
                  const value = tooltipItem.raw.toFixed(2) + '%';
                  return `Percentile: ${value}`;
                }
              }
            }
          },
          maintainAspectRatio: false,
          responsive: true,
        },
      });
    }
  }, [percentileGrades1, percentileGrades2]);

  return (
    <div className="bg-white rounded-lg shadow-lg row-span-2">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">
        Attribution Radial
      </h2>
      <div className={isMobile ? "h-[320px] bg-white flex items-center justify-center relative" : "h-[380px] bg-white flex items-center justify-center relative"} style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: isMobile ? '360px' : '600px', maxHeight: isMobile ? '320px' : '400px' }} />
        {loading && <div className="absolute flex justify-center items-center"><div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
        {!loading && !percentileGrades1 && !percentileGrades2 && <div className={isMobile ? "absolute text-red-500 text-sm" : "absolute text-red-500 text-base"}>No data available</div>}
      </div>
    </div>
  );
};

export default AttributionRadial;