import { useState, useEffect } from 'react';

function FeaturedVideos() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Array of image paths and corresponding YouTube video links
  const slides = [
    {
      image: '/Home_1.jpg', // Replace with actual path
      videoUrl: 'https://www.youtube.com/watch?v=IG7tNp4vhkU', // Replace with actual YouTube link
    },
    {
      image: '/Home_2.jpg', // Replace with actual path
      videoUrl: 'https://youtube.com/watch?v=0g6lgdQqJak', // Replace with actual YouTube link
    },
    {
      image: '/Home_3.jpg', // Replace with actual path
      videoUrl: 'https://www.youtube.com/watch?v=s_0oX0rDYdc', // Replace with actual YouTube link
    },
    {
      image: '/Home_4.jpg', // Replace with actual path
      videoUrl: 'https://www.youtube.com/watch?v=x2eLQmUMQy4', // Replace with actual YouTube link
    },
    {
      image: '/Home_5.jpg', // Replace with actual path
      videoUrl: 'https://www.youtube.com/watch?v=ktPVqHoYrIQ&t=7s', // Replace with actual YouTube link
    },
  ];

  // Auto-swipe every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000); // 3 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [slides.length]);

  // Handle manual indicator click
  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="p-0 shadow-xl rounded-lg h-full relative">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Featured Videos</h2>
      <div className="h-[200px] flex items-center justify-center bg-gray-100 overflow-hidden relative">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <a
              key={index}
              href={slide.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex-shrink-0"
            >
              <img
                src={slide.image}
                alt={`Featured Video ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </a>
          ))}
        </div>
        {/* Indicator lines */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-6 h-1 cursor-pointer ${currentIndex === index ? 'bg-[#235347]' : 'bg-gray-300'}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default FeaturedVideos;