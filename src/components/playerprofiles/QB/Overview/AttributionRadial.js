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

const AttributionRadial = ({ playerId, year, percentileGrades }) => {
  // Function to get grade value from percentileGrades
  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Grade A': return percentileGrades.percentile_avg_ttt_attempts || 'N/A';
      case 'Grade B': return percentileGrades.percentile_btt_rate || 'N/A';
      case 'Grade C': return percentileGrades.percentile_accuracy_percent || 'N/A';
      case 'Grade D': return percentileGrades.percentile_twp_rate || 'N/A';
      case 'Grade E': return percentileGrades.percentile_pressure_to_sack_rate || 'N/A';
      case 'Grade F': return percentileGrades.percentile_medium_grades_pass || 'N/A';
      case 'Grade G': return percentileGrades.percentile_deep_grades_pass || 'N/A';
      case 'Grade H': return percentileGrades.percentile_pressure_grades_pass || 'N/A';
      case 'Grade J': return percentileGrades.percentile_blitz_grades_pass || 'N/A';
      default: return 'N/A';
    }
  };

  // Function to format percentile with two decimals
  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  // Manually adjustable label mappings
  const customLabels = {
    'Grade A': 'Decisiveness',
    'Grade B': 'Playmaking',
    'Grade C': 'Accuracy',
    'Grade D': 'Throwing IQ',
    'Grade E': 'Pocket Presence'
  };

  const [data, setData] = useState({ labels: [], data: [] });
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!percentileGrades) {
      setData({ labels: [], data: [] });
      return;
    }

    // Extract data for the 5 specific grades
    const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
    const labels = gradeKeys.map(key => customLabels[key] || key);
    const dataValues = gradeKeys.map(key => {
      const value = getGradeValue(key);
      let numericValue = value === 'N/A' ? 0 : parseFloat(value) || 0;
      if (key === 'Grade A' || key === 'Grade D' || key === 'Grade E') {
        numericValue = 100 - numericValue;
      }
      return numericValue;
    });

    setData({ labels, data: dataValues });
  }, [playerId, year, percentileGrades]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && data.labels.length > 0 && data.data.length > 0 && data.data.some(v => v > 0)) {
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
            legend: { display: false },
            tooltip: {
              enabled: false, // disable default
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
                  const value = formatPercentile(tooltipItem.raw);
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
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow-lg row-span-2">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">
        Attribution Radial
      </h2>
      <div className="h-[380px] bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: '600px', maxHeight: '320px' }} />
        {!data.labels.length && <div className="absolute text-red-500">No data available</div>}
      </div>
    </div>
  );
};

export default AttributionRadial;
