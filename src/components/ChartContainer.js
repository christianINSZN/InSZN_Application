import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement);

function ChartContainer() {
  const data = {
    labels: ['Player 1', 'Player 2', 'Player 3'],
    datasets: [{ label: 'Points', data: [10, 20, 15], backgroundColor: '#36A2EB' }],
  };
  return (
    <div className="p-4">
      <Bar data={data} />
    </div>
  );
}
export default ChartContainer;