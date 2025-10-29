// Home.jsx - 3 Column Layout (25% | 50% | 25%)
import LeftSidebar from './home/LeftSidebar';
import MainContent from './home/MainContent';
import RightSidebar from './home/RightSidebar';

function Home() {
  return (
    <div className="max-w-8xl mx-auto p-4 sm:p-6 mt-0 sm:mt-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: 25% */}
        <aside className="md:col-span-1">
          <LeftSidebar />
        </aside>

        {/* Center: 50% */}
        <main className="md:col-span-2">
          <MainContent />
        </main>

        {/* Right: 25% */}
        <aside className="md:col-span-1">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}

export default Home;