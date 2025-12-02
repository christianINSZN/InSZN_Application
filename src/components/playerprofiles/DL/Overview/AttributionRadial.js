import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

// Metric explanations
const metricExplanations = {
  'Usage Rate': 'Evaluates the usage rates of the player on defensive snaps.',
  'Stoppage': 'Evaluates the ability of stopping yards effectively.',
  'Tackling': 'Evaluates the ability of executing tackles effectively.',
  'Run Defense': 'Evaluates the ability of executing run defense effectively.',
  'Pass Rushing': 'Evaluates the ability of executing pass rush effectively.'
};

const AttributionRadial = ({ playerId, year, percentileGrades }) => {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';
  const isPremium = isSubscribed;

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Grade A': return percentileGrades.percentile_snap_counts_defense || 'N/A';
      case 'Grade B': return percentileGrades.stops || 'N/A';
      case 'Grade C': return percentileGrades.grades_tackle || 'N/A';
      case 'Grade D': return percentileGrades.percentile_grades_run_defense || 'N/A';
      case 'Grade E': return percentileGrades.percentile_grades_pass_rush_defense || 'N/A';
      case 'Grade F': return percentileGrades.percentile_medium_grades_pass || 'N/A';
      case 'Grade G': return percentileGrades.percentile_deep_grades_pass || 'N/A';
      case 'Grade H': return percentileGrades.percentile_pressure_grades_pass || 'N/A';
      case 'Grade J': return percentileGrades.percentile_blitz_grades_pass || 'N/A';
      default: return 'N/A';
    }
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const customLabels = {
    'Grade A': 'Usage Rate',
    'Grade B': 'Stoppage',
    'Grade C': 'Tackling',
    'Grade D': 'Run Defense',
    'Grade E': 'Pass Rushing'
  };

  const [data, setData] = useState({ labels: [], data: [] });
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!percentileGrades) {
      setData({ labels: [], data: [] });
      return;
    }
    const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
    const labels = gradeKeys.map(key => customLabels[key] || key);
    const dataValues = gradeKeys.map(key => {
      const value = getGradeValue(key);
      let numericValue = value === 'N/A' ? 0 : parseFloat(value) || 0;
      if (key === 'Grade F') {
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
                  size: window.innerWidth < 640 ? 12 : 16,
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
                tooltipEl.style.fontSize = '14px';
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
                  innerHtml += `<div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${title}</div>`;
                }
                bodyLines.forEach(line => {
                  if (line) {
                    innerHtml += `<div style="margin-bottom: 2px;">${line}</div>`;
                  }
                });
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
    <div className="bg-white rounded-lg shadow-lg row-span-2 relative">
      {/* Title — Always Visible */}
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">
        Attribution Radial
      </h2>

      {/* Chart + Paywall */}
      <div className="relative">
        <div className="h-[380px] bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
          <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: '600px', maxHeight: '400px' }} />
          {!data.labels.length && <div className="absolute text-red-500">No data available</div>}
        </div>

        {/* Premium Lock Overlay — Covers Chart Only */}
        {!isPremium && (
          <div className="absolute inset-0 top-[0px] flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-md rounded-b-lg h-auto">
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
    </div>
  );
};

export default AttributionRadial;