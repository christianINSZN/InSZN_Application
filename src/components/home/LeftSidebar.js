// home/LeftSidebar.jsx
import TopTeams from './TopTeams';
import FeaturedVideos from './FeaturedVideos';
import DailyPoll from './DailyPoll'; // <-- Add this import

function LeftSidebar() {
  return (
    <div className="space-y-6">
      <DailyPoll />          {/* <-- Poll appears first */}
      <TopTeams />
    </div>
  );
}
export default LeftSidebar;