// home/LeftSidebar.jsx
import TopTeams from './TopTeams';
import FeaturedVideos from './FeaturedVideos';
import PollWidget from './DailyPoll'; // <-- Add this import

function LeftSidebar() {
  return (
    <div className="space-y-6">
      <PollWidget slug="heisman" />
      <TopTeams />
    </div>
  );
}
export default LeftSidebar;