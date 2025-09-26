import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { BsFillPersonFill } from 'react-icons/bs';
import { RiTeamFill } from 'react-icons/ri';
import { MdPeople, MdOutlineJoinFull } from 'react-icons/md';
import { CgProfile } from 'react-icons/cg';
import { HiMenu, HiX } from 'react-icons/hi';

function NavBar() {
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const teamsDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const hamburgerRef = useRef(null);
  const teamsButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        teamsDropdownRef.current && 
        !teamsDropdownRef.current.contains(event.target) && 
        (!teamsButtonRef.current || !teamsButtonRef.current.contains(event.target))
      ) {
        setIsTeamsDropdownOpen(false);
      }
      if (
        profileDropdownRef.current && 
        !profileDropdownRef.current.contains(event.target) && 
        (!profileButtonRef.current || !profileButtonRef.current.contains(event.target))
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setIsHamburgerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle click for mobile dropdown links to ensure navigation and close dropdowns
  const handleMobileLinkClick = () => {
    console.log('Mobile link clicked');
    setIsTeamsDropdownOpen(false);
    setIsHamburgerOpen(false);
  };

  return (
    <div className="w-full fixed top-0 left-0 z-10">
      <div
        className="text-black text-[16px] w-full py-3 border-b-2 border-[#235347] bg-cover bg-center"
        style={{
          height: '64px',
          backgroundImage: 'url(/Header_Gradient.png)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center px-4 sm:px-6 h-full relative">
          {/* Mobile: Centered Logo and Hamburger */}
          <div className="sm:hidden flex items-center w-full relative">
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className="flex items-center">
                <img src="/TurfLogo_RemovedBkg.png" alt="INSZN Logo" className="h-10 w-auto" />
              </Link>
            </div>
            <button
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              className="ml-auto text-black hover:text-[#235347] focus:outline-none"
            >
              {isHamburgerOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
            </button>
          </div>
          {/* Desktop: Main navigation (centered) */}
          <div className="hidden sm:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center">
              <Link to="/players" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base sm:text-lg">
                <BsFillPersonFill /> <span>Players</span>
              </Link>
            </div>
            <div className="relative" ref={teamsDropdownRef}>
              <button
                onClick={() => setIsTeamsDropdownOpen(!isTeamsDropdownOpen)}
                className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base sm:text-lg focus:outline-none"
              >
                <RiTeamFill /> <span>Teams</span>
              </button>
              {isTeamsDropdownOpen && (
                <ul className="absolute left-0 mt-2 w-48 bg-white border-2 border-[#235347] rounded shadow-lg z-20">
                  <li>
                    <Link
                      to="/teams"
                      className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                      onClick={() => setIsTeamsDropdownOpen(false)}
                    >
                      By Conference
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/team_rankings"
                      className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                      onClick={() => setIsTeamsDropdownOpen(false)}
                    >
                      Rankings
                    </Link>
                  </li>
                </ul>
              )}
            </div>
            <div className="flex items-center">
              <Link to="/" className="flex items-center justify-center px-3 py-2">
                <img src="/TurfLogo_RemovedBkg.png" alt="INSZN Logo" className="h-10 sm:h-14 w-auto" />
              </Link>
            </div>
            <div className="flex items-center">
              <Link to="/h2h" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base sm:text-lg">
                <MdPeople /> <span>H2H</span>
              </Link>
            </div>
            <div className="flex items-center">
              <Link to="/subscribe" className="flex items-center space-x-2 hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base sm:text-lg">
                <MdOutlineJoinFull /> <span>Subscribe</span>
              </Link>
            </div>
          </div>
          {/* Desktop: Profile or Sign In/Sign Up (right-aligned) */}
          <div className="hidden sm:flex items-center ml-auto">
            {isSignedIn ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  ref={profileButtonRef}
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 text-white px-3 py-2 rounded text-base sm:text-lg focus:outline-none"
                >
                  <CgProfile className="text-2xl" />
                </button>
                {isProfileDropdownOpen && (
                  <ul className="absolute right-0 mt-2 w-48 bg-white border-2 border-[#235347] rounded shadow-lg z-20">
                    <li className="px-4 py-2 text-black text-base">
                      {user.primaryEmailAddress?.emailAddress || 'No email'}
                    </li>
                    <li>
                      <SignOutButton>
                        <button className="block w-full text-left px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base">
                          Logout
                        </button>
                      </SignOutButton>
                    </li>
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/sign-up"
                  className="flex items-center space-x-2 bg-[#235347] text-white hover:bg-[#235347]/70 px-3 py-1 rounded text-sm sm:text-base"
                >
                  <span>Sign Up</span>
                </Link>
                <Link
                  to="/sign-in"
                  className="flex items-center space-x-2 bg-[#235347] text-white hover:bg-[#235347]/70 px-3 py-1 rounded text-sm sm:text-base"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>
          {/* Mobile: Hamburger Dropdown */}
          {isHamburgerOpen && (
            <div ref={hamburgerRef} className="sm:hidden absolute top-[64px] left-0 w-full bg-white border-b-2 border-[#235347] shadow-lg z-30">
              <ul className="flex flex-col items-start p-4 space-y-2">
                <li>
                  <Link
                    to="/players"
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                    onClick={() => handleMobileLinkClick()}
                  >
                    <BsFillPersonFill /> <span>Players</span>
                  </Link>
                </li>
                <li className="relative w-full" ref={teamsDropdownRef}>
                  <button
                    ref={teamsButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Teams button clicked, isTeamsDropdownOpen:', !isTeamsDropdownOpen);
                      setIsTeamsDropdownOpen(!isTeamsDropdownOpen);
                    }}
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base w-full text-left"
                  >
                    <RiTeamFill /> <span>Teams</span>
                  </button>
                  {isTeamsDropdownOpen && (
                    <ul className="pl-6 space-y-2 z-40">
                      <li>
                        <Link
                          to="/teams"
                          className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Navigating to /teams');
                            handleMobileLinkClick();
                          }}
                        >
                          By Conference
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/team_rankings"
                          className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Navigating to /team_rankings');
                            handleMobileLinkClick();
                          }}
                        >
                          Rankings
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
                <li>
                  <Link
                    to="/h2h"
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                    onClick={() => handleMobileLinkClick()}
                  >
                    <MdPeople /> <span>H2H</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/subscribe"
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                    onClick={() => handleMobileLinkClick()}
                  >
                    <MdOutlineJoinFull /> <span>Subscribe</span>
                  </Link>
                </li>
                {isSignedIn ? (
                  <li className="relative w-full" ref={profileDropdownRef}>
                    <button
                      ref={profileButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Profile button clicked, isProfileDropdownOpen:', !isProfileDropdownOpen);
                        setIsProfileDropdownOpen(!isProfileDropdownOpen);
                      }}
                      className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base w-full text-left"
                    >
                      <CgProfile className="text-2xl" /> <span>Profile</span>
                    </button>
                    {isProfileDropdownOpen && (
                      <ul className="pl-6 space-y-2 z-40">
                        <li className="px-4 py-2 text-black text-base">
                          {user.primaryEmailAddress?.emailAddress || 'No email'}
                        </li>
                        <li>
                          <SignOutButton>
                            <button
                              className="block w-full text-left px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                              onClick={() => handleMobileLinkClick()}
                            >
                              Logout
                            </button>
                          </SignOutButton>
                        </li>
                      </ul>
                    )}
                  </li>
                ) : (
                  <>
                    <li>
                      <Link
                        to="/sign-up"
                        className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                        onClick={() => handleMobileLinkClick()}
                      >
                        <span>Sign Up</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/sign-in"
                        className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                        onClick={() => handleMobileLinkClick()}
                      >
                        <span>Sign In</span>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavBar;