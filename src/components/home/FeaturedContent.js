// home/FeaturedContent.jsx - Mobile-optimized
function FeaturedContent() {
  const items = [
    {
      image: '/Home_1.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=DlHHh66Qxug&t',
      title: 'INSZN College Football Show: Week 13 Preview',
      desc: 'Welcome to the first episode of the INSZN College Football Show.  In this video, we preview six 6 matchups to watch out for in Week 10 with a deep dive into the data and analytics.'
    },
    {
      image: '/Home_2.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=yDFhMyLGDp4&t',
      title: 'INSZN College Football Show: AQR Rankings',
      desc: 'In this video, we recap the most-recent College Football Playoff Rankings, highlight the objectives, and discussed unbiased rankings system provided by INSZN with the Adjusted-Quadrant Resume (AQR) Rankings.'
    },
    {
      image: '/Home_3.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=kIAEe9N11uE&t',
      title: 'Missouri vs. Oklahoma: INSZN\'s Week 13 Scouting Report',
      desc: 'In this video, we preview a key matchup in the SEC, as the Oklahoma Sooners\' play host to the Missouri Tigers.'
    },
    {
      image: '/Home_4.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=U_CPvYBle5o',
      title: 'USC vs. Oregon: INSZN\'s Week 13 Scouting Report',
      desc: 'In this video, we preview a matchup between two Big Ten teams trying to make a late season push to qualify for both the Big Ten Championship Game and the College Football Playoff.'
    },
    {
      image: '/Home_5.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=C4RPgK0gbHg',
      title: 'BYU vs. Cincinnati: INSZN\'s Week 13 Scouting Report',
      desc: 'In this video, we preview a matchup with perhaps the biggest College Football Playoff implications in the Big 12 with the BYU Cougars traveling to Ohio to take on the Cincinnati Bearcats.'
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-8">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block shadow-md sm:shadow-xl rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-lg sm:hover:shadow-2xl transition-shadow bg-white"
        >
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-[13rem] sm:h-[26.5rem] object-cover"
          />
          <div className="p-3 sm:p-4">
            <h3 className="font-bold text-base sm:text-lg text-[#235347] line-clamp-2">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 mt-1 line-clamp-2">
              {item.desc}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default FeaturedContent;