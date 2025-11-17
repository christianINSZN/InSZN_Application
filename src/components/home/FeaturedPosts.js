import { useState } from 'react';

function FeaturedContent() {
  const [showComingSoon, setShowComingSoon] = useState(false);
  return (
    <div className="p-0 shadow-xl rounded-lg h-full">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Latest Post</h2>
      <div className="h-[200px] flex items-center justify-center bg-gray-100">
        <img
          src="/LatestPost.png"
          alt="Latest Post Home"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default FeaturedContent;