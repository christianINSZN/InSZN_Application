import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

// Metric explanations
const metricExplanations = {
  'Usage Share': "Measures the player's share of total team receiving targets.",
  'Explosiveness': 'Evaluates the ability to generate yards after the catch.',
  'Consistency': 'Assesses the percentage of catchable passes successfully caught.',
  'Strength': 'Evaluates ability to secure catches in contested situations.',
  'Ball Security': 'Measures the ability to avoid drops on catchable passes.'
};

const AttributionRadial = ({ playerId, year, percentileGrades, className = "text-sm sm:text-base" }) => {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';
  const isPremium = isSubscribed;

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Grade A': return percentileGrades.percentile_targets || 'N/A';
      case 'Grade B': return percentileGrades.percentile_yards_after_catch || 'N/A';
      case 'Grade C': return percentileGrades.percentile_caught_percent || 'N/A';
      case 'Grade D': return percentileGrades.percentile_contested_catch_rate || 'N/A';
      case 'Grade E': return percentileGrades.percentile_drop_rate || 'N/A';
      default: return 'N/A';
    }
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const customLabels = {
    'Grade A': 'Usage Share',
    'Grade B': 'Explosiveness',
    'Grade C': 'Consistency',
    'Grade D': 'Strength',
    'Grade E': 'Ball Security'
  };

  const isMobile = window.innerWidth < 640;

  const [data, setData] = useState({ labels: [], data: [] });
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('AttributionRadial props:', { playerId, year, percentileGrades });
    if (!percentileGrades) {
      console.warn('percentileGrades is undefined, setting empty data');
      setData({ labels: [], data: [] });
      return;
    }
    const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'];
    const labels = gradeKeys.map(key => customLabels[key] || key.replace('Grade ', '').replace(/([A-Z])/g, ' $1').trim());
    const dataValues = gradeKeys.map(key => {
      const value = getGradeValue(key);
      console.log(`Processing ${key}: ${value}`);
      let numericValue = value === 'N/A' ? 0 : parseFloat(value) || 0;
      if (key === 'Grade E') { // Invert for Ball Security (lower drop rate is better)
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
                  const value = formatPercentile(tooltipItem.raw);
                  return `Percentile: ${value}`;
                }
              }
            }
          },
          maintainAspectRatio: false,
          responsive: true,
        },
      });
      console.log('Chart created successfully');
    } else {
      console.log('Chart not created - data or context missing:', { labels: data.labels.length, data: data.data, somePositive: data.data.some(v => v > 0) });
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        console.log('Chart destroyed on cleanup');
      }
    };
  }, [data, isMobile]);

  return (
    <div className={`bg-white rounded-lg shadow-lg row-span-2 relative ${className}`}>
      {/* Title — Always Visible */}
      <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">
        Attribution Radial
      </h2>

      {/* Chart + Paywall */}
      <div className="relative">
        <div className={isMobile ? "h-[320px] bg-white flex items-center justify-center relative" : "h-[380px] bg-white flex items-center justify-center relative"} style={{ position: 'relative', width: '100%' }}>
          <canvas ref={canvasRef} id="attributionChart" style={{ width: '100%', height: '100%', maxWidth: isMobile ? '360px' : '600px', maxHeight: isMobile ? '320px' : '400px' }} />
          {!data.labels.length && <div className={`absolute text-red-500 ${isMobile ? 'text-sm' : 'text-base'}`}>No data available</div>}
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