import TopQBs from './home/TopQBs';
import TopTeams from './home/TopTeams';
import TopRBs from './home/TopRBs';
import FeaturedVideos from './home/FeaturedVideos';
import FeaturedContent from './home/FeaturedContent';
import FeaturedPosts from './home/FeaturedPosts';

function Home() {
  return (
    <div className="p-4">
      <div className="flex flex-row gap-4 h-[490px]">
        <div className="w-[23%] h-full">
          <TopQBs />
        </div>
        <div className="w-[54%] h-full">
          <TopTeams />
        </div>
        <div className="w-[23%] h-full">
          <TopRBs />
        </div>
      </div>
      <div className="flex flex-row gap-4 h-[260px] mt-4">
        <div className="w-[23%] h-full">
          <FeaturedVideos />
        </div>
        <div className="w-[54%] h-full">
          <FeaturedContent />
        </div>
        <div className="w-[23%] h-full">
          <FeaturedPosts />
        </div>
      </div>
    </div>
  );
}

export default Home;