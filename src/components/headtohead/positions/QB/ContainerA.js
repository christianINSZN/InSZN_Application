import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

// Metric explanations
const metricExplanations = {
  'Decisiveness': 'Evaluates how quickly the player releases the ball in standard passing situations.',
  'Playmaking': 'Evaluates the ability to create impactful (20yd+) pass plays.',
  'Accuracy': 'Evaluates the accuracy of a designed pass regardless of outcome (catch/drop/INT).',
  'Throwing IQ': 'Evaluates the decision-making ability to avoid turnovers and make efficient throws.',
  'Pocket Presence': 'Evaluates the ability of avoiding sacks in the pocket during defense pressure situations.'
};

const AttributionRadial = ({
  player1,
  player2,
  excludedMetrics = ['bats', 'pressure_to_sack_rate', 'sack_percent', 'sacks', 'scrambles', 'spikes', 'thrown_aways'],
  metricRenames = {
    'ypa': 'YPA',
    'btt_rate': 'Playmaking',
    'qb_rating': 'QB Rating',
    'twp_rate': 'Throwing IQ'
  }
}) => {
  const [percentileGrades1, setPercentileGrades1] = useState(null);
  const [percentileGrades2, setPercentileGrades2] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchData = async (player, setGrades) => {
      if (player) {
        setLoading(true);
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_QB/${player.playerId}/${player.year}`);
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
        'percentile_avg_ttt_attempts',
        'percentile_btt_rate',
        'percentile_accuracy_percent',
        'percentile_twp_rate',
        'percentile_pressure_to_sack_rate'
      ];

      // Use all five metrics, ignoring excludedMetrics
      const labels = gradeKeys.map((key, index) => {
        const metricKey = metricKeys[index].replace('percentile_', '');
        const customLabels = {
          'Grade A': 'Decisiveness',
          'Grade B': 'Playmaking',
          'Grade C': 'Accuracy',
          'Grade D': 'Throwing IQ',
          'Grade E': 'Pocket Presence'
        };
        return customLabels[key] ;
      });

      const getGradeValue = (gradeKey, grades, metricKey) => {
        if (!grades) return 0;
        let value = grades[metricKey] || 0;
        if (['Grade A', 'Grade D', 'Grade E'].includes(gradeKey)) {
          value = 100 - value; // Invert for these grades
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
                  size: 15,
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
            legend: { display: true, position: 'top' },
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
                // Style the tooltip
                tooltipEl.style.maxWidth = '200px';
                tooltipEl.style.wordWrap = 'break-word';
                tooltipEl.style.fontFamily = 'Arial';
                tooltipEl.style.fontSize = '14px';
                tooltipEl.style.padding = '8px';
                tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                tooltipEl.style.color = 'white';
                tooltipEl.style.borderRadius = '4px';
                tooltipEl.style.pointerEvents = 'none';
                tooltipEl.style.position = 'absolute';
                // Safe title & body
                const title = (tooltipModel.title && tooltipModel.title.length) ? tooltipModel.title[0] : '';
                const bodyLines = tooltipModel.body ? tooltipModel.body.map(b => b.lines).flat() : [];
                // Build HTML
                let innerHtml = '';
                if (title) {
                  innerHtml += `<div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${title}</div>`;
                }
                bodyLines.forEach(line => {
                  if (line) {
                    innerHtml += `<div style="margin-bottom: 2px;">${line}</div>`;
                  }
                });
                tooltipEl.innerHTML = innerHtml;
                // Position
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
                  const explanation = metricExplanations[label] || 'No explanation available';
                  return [`Percentile: ${value}`, "────────────", explanation];
                }
              }
            }
          },
          maintainAspectRatio: false,
          responsive: true,
        },
      });
    }
  }, [percentileGrades1, percentileGrades2, metricRenames]);

  return (
    <div className="bg-white rounded-lg shadow-lg row-span-2">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">
        Attribution Radial
      </h2>
      <div className="h-[380px] bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: '600px', maxHeight: '320px' }} />
        {loading && <div className="absolute flex justify-center items-center"><div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
        {!loading && !percentileGrades1 && !percentileGrades2 && <div className="absolute text-red-500">No data available</div>}
      </div>
    </div>
  );
};

export default AttributionRadial;