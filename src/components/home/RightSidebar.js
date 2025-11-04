// home/RightSidebar.jsx
import TopQBs from './TopQBs';
import TopRBs from './TopRBs';
import TopWRs from './TopWRs';
import TopTEs from './TopTEs';

function RightSidebar() {
  return (
    <div className="space-y-6">
      <TopQBs />
      <TopRBs />
      <TopWRs />
      <TopTEs />
    </div>
  );
}

export default RightSidebar;