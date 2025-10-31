// home/FeaturedContent.jsx - Mobile-optimized
function FeaturedContent() {
  const items = [
    {
      image: '/Home_1.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=IG7tNp4vhkU',
      title: 'INSZN College Football Show: Week 10 Preview',
      desc: 'Welcome to the first episode of the INSZN College Football Show.  In this video, we preview six 6 matchups to watch out for in Week 10 with a deep dive into the data and analytics.'
    },
    {
      image: '/Home_2.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=0g6lgdQqJak&t=62s',
      title: 'Oklahoma vs Tennessee: INSZN\'s Week 10 Scouting Report',
      desc: 'We preview the Oklahoma Sooners contest against the Tennessee Volunteers and discuss how the Sooners\' defense can slow down Joey Aguilar and the high-powered Volunteers\' offense.'
    },
    {
      image: '/Home_3.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=jX1Icc6fDLE',
      title: 'Vanderbilt vs. Texas: INSZN\'s Week 10 Scouting Report',
      desc: 'We preview the Vanderbilt Commodores matchup against the Texas Longhorns and discuss how the Longhorns\' defense can slow down Diego Pavia and the Commodores\' offense, as well as what to expect out of Arch Manning and the Longhorns\' offense in Austin on Saturday.'
    },
    {
      image: '/Home_4.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=x8eJuyOMSkQ',
      title: 'Georgia vs. Florida: INSZN\'s Week 10 Scouting Report',
      desc: 'We preview a premiere SEC Week 10 contest and a rivalry game as the Georgia Bulldogs traveling to Florida to take on the Florida Gators.  We discuss the vaunted Georgia defense, how DJ Lagway and the Gators\' offense need to sustain drives and protect the ball, and how the advanced analytics show that this could be a much closer game than many expect.'
    },
    {
      image: '/Home_5.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=Kxx0Ao78bIg',
      title: 'Miami vs. SMU: INSZN\'s Week 10 Scouting Report',
      desc: 'We preview the a quality ACC Week 10 matchup as the Miami Hurricanes travel to Dallas to take on the SMU Mustangs.  We discuss the efficiency by which Miami has played on both sides of the ball this year, and how Miami can come out of Dallas with a victory.'
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