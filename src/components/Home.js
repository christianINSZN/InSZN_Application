import TopQBs from './home/TopQBs';
import TopTeams from './home/TopTeams';
import TopRBs from './home/TopRBs';
import TopWRs from './home/TopWRs';
import TopTEs from './home/TopTEs';
import FeaturedVideos from './home/FeaturedVideos';
import FeaturedContent from './home/FeaturedContent';
import FeaturedPosts from './home/FeaturedPosts';

function Home() {
  return (
    <div className="p-4 sm:p-4 mt-0 sm:mt-12">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:h-[480px]">
        <div className="w-full sm:w-[100%] h-auto sm:h-full">
          <TopTeams />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:h-[260px] mt-2 sm:mt-4">
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2  mt-2 sm:mt-4">
        <div className="w-full sm:w-[25%] h-auto sm:h-full">
          <TopQBs />
        </div>
        <div className="w-full sm:w-[25%] h-auto sm:h-full">
          <TopWRs />
        </div>
        <div className="w-full sm:w-[25%] h-auto sm:h-full">
          <TopRBs />
        </div>
        <div className="w-full sm:w-[25%] h-auto sm:h-full">
          <TopTEs />
        </div>
      </div>
    </div>
  );
}

export default Home;