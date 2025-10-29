// home/FeaturedContent.jsx - Mobile-optimized
function FeaturedContent() {
  const items = [
    {
      image: '/Home_1.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=9ZT3NlMEYTc',
      title: 'SEC WEEK 9 QB Ratings & Recap',
      desc: 'We recap every SEC QB play from this weekend. We spend time talking about Texas A&M quarterback Marcel Reeds performance vs LSU, we talk about Joey Aguilar , Ty Simpson, Trinidad Chambliss and more!'
    },
    {
      image: '/Home_2.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=OmpiXtg-1nc&t=367s',
      title: 'Texas A&M Football: Marcel Reeds\' PERFORMANCE vs LSU, Reaction & Recap',
      desc: 'We talk about Texas A&M quarterback, Marcel Reed, and his performance vs LSU. We breakdown what stood out and what he was able to do well to have success in Death Valley.'
    },
    {
      image: '/Home_3.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=s_0oX0rDYdc',
      title: 'Oklahoma Football: Keys for John Mateer vs Tennessee in Week 10',
      desc: 'We discuss several keys for John Mateer to find success against Tennessee\'s defense in this major SEC Week 10 contest. '
    },
    {
      image: '/Home_4.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=x2eLQmUMQy4',
      title: 'Tennessee Football: Keys for Joey Aguilar vs Oklahoma in Week 10',
      desc: 'We discuss several keys for Joey Aguilar to find success against OU\'s defense in this major SEC Week 10 contest. '
    },
    {
      image: '/Home_5.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=ktPVqHoYrIQ',
      title: 'Alabama Football: Ty Simpson\'s PERFORMANCE vs South Carolina, Reaction & RecapTy Simpson',
      desc: 'We breakdown what stood out in Ty\'s performance and how he was able to keep on even keel and lead the Crimson Tide to a come-from-behind victory in Week 9.'
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