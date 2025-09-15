import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

const ContainerA = ({ title = 'Affinity', player1, player2 }) => {
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
      const gradeKeys = ['Grade A', 'Grade B', 'Grade C', 'Grade E', 'Grade D'];
      const labels = gradeKeys.map(key => {
        const customLabels = {
          'Grade A': 'Decisiveness',
          'Grade B': 'Playmaking',
          'Grade C': 'Accuracy',
          'Grade D': 'Throwing IQ', // Indicate inversion
          'Grade E': 'Pocket Presence',
        };
        return customLabels[key] || key.replace('Grade ', '').replace(/([A-Z])/g, ' $1').trim();
      });

      const getGradeValue = (gradeKey, grades) => {
        if (!grades) return 0;
        const mappings = {
          'Grade A': grades.percentile_avg_ttt_attempts || 0,
          'Grade B': grades.percentile_btt_rate || 0,
          'Grade C': grades.percentile_accuracy_percent || 0,
          'Grade D': grades.percentile_twp_rate || 0,
          'Grade E': grades.percentile_pressure_to_sack_rate || 0,
        };
        let value = mappings[gradeKey] || 0;
        if (['Grade A', 'Grade D', 'Grade E'].includes(gradeKey)) {
          value = 100 - value; // Invert for these grades
        }
        return value;
      };

      const data1 = gradeKeys.map(key => getGradeValue(key, percentileGrades1));
      const data2 = gradeKeys.map(key => getGradeValue(key, percentileGrades2));

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
              pointRadius: 5,
              fill: true,
            },
            {
              label: player2 ? `${player2.name} (${player2.year})` : 'Player 2',
              data: data2,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              pointRadius: 5,
              fill: true,
            },
          ],
        },
        options: {
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: { stepSize: 20, font: { size: 10 } },
              pointLabels: { font: { size: 12 } },
              angleLines: { display: true },
              grid: { circular: true },
            },
          },
          plugins: { legend: { display: true, position: 'top' } },
          maintainAspectRatio: true,
          responsive: true,
        },
      });
    }
  }, [percentileGrades1, percentileGrades2]);

  return (
    <main className="w-full p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-center">{title}</h2>
        <div className="text-gray-700">
          {loading && <div className="flex justify-center mb-2"><div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
          {!loading && !percentileGrades1 && !percentileGrades2 && <div className="text-red-500 text-center">No data available</div>}
          <div className="h-96 bg-white flex items-center justify-center relative" style={{ position: 'relative', width: '100%' }}>
            <canvas ref={canvasRef} id="attributionChart" className="w-full h-full" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ContainerA;