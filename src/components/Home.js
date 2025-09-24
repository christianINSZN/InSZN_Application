import TopQBs from './home/TopQBs';
import TopTeams from './home/TopTeams';
import TopRBs from './home/TopRBs';
import FeaturedVideos from './home/FeaturedVideos';
import FeaturedContent from './home/FeaturedContent';
import FeaturedPosts from './home/FeaturedPosts';

function Home() {
  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:h-[490px]">
        <div className="w-full sm:w-[100%] h-auto sm:h-full">
          <TopTeams />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:h-[260px] mt-2 sm:mt-4">
        <div className="w-full sm:w-[23%] h-auto sm:h-full">
          <FeaturedVideos />
        </div>
        <div className="w-full sm:w-[54%] h-auto sm:h-full">
          <FeaturedContent />
        </div>
        <div className="w-full sm:w-[23%] h-auto sm:h-full">
          <FeaturedPosts />
        </div>
      </div>
    </div>
  );
}

export default Home;