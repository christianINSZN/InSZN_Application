import { Link } from 'react-router-dom';
import { BsFillPersonFill } from 'react-icons/bs';
import { RiTeamFill } from 'react-icons/ri';
import { MdOutlineJoinFull, MdPeople } from "react-icons/md";

function NavBar() {
  return (
    <div className="w-full">
      <div
        className="text-black text-[16px] w-full fixed top-0 left-0 z-10 py-3 mb-6 border-2 border-[#235347]"
        style={{
          height: '64px',
          backgroundImage: 'url(/Header_Gradient.png)',
          backgroundSize: 'auto 64px', // Auto width, fixed 64px height
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="flex items-center justify-between px-6 max-w-7xl mx-auto h-full">
          {/* Left side nav */}
          <ul className="flex flex-row space-x-6 items-center justify-end flex-1">
            <li>
              <Link to="/players" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-lg">
                <BsFillPersonFill /> <span>Players</span>
              </Link>
            </li>
            <li>
              <Link to="/teams" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-lg">
                <RiTeamFill /> <span>Teams</span>
              </Link>
            </li>
          </ul>
          {/* Center logo */}
          <div className="flex-none px-6">
            <Link to="/" className="flex items-center justify-center">
              <img
                src="/TurfLogo_RemovedBkg.png"
                alt="INSZN Logo"
                className="h-14 w-auto"
              />
            </Link>
          </div>
          {/* Right side nav */}
          <ul className="flex flex-row space-x-6 items-center justify-start flex-1">
            <li>
              <Link to="/h2h" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-lg">
                <MdPeople /> <span>H2H</span>
              </Link>
            </li>
            <li>
              <Link to="/subscribe" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-lg">
                <MdOutlineJoinFull /> <span>Subscribe</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NavBar;