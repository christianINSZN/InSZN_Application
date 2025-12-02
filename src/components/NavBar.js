// src/components/NavBar.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { BsFillPersonFill } from 'react-icons/bs';
import { RiTeamFill } from 'react-icons/ri';
import { MdPeople, MdOutlineJoinFull } from 'react-icons/md';
import { CgProfile } from 'react-icons/cg';
import { HiMenu, HiX } from 'react-icons/hi';

function NavBar() {
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false);
  const [isPlayersDropdownOpen, setIsPlayersDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  const teamsDropdownRef = useRef(null);
  const playersDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const hamburgerRef = useRef(null);
  const teamsButtonRef = useRef(null);
  const playersButtonRef = useRef(null);
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
        playersDropdownRef.current &&
        !playersDropdownRef.current.contains(event.target) &&
        (!playersButtonRef.current || !playersButtonRef.current.contains(event.target))
      ) {
        setIsPlayersDropdownOpen(false);
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

  const handleMobileLinkClick = () => {
    setIsTeamsDropdownOpen(false);
    setIsPlayersDropdownOpen(false);
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
        <div className="max-w-8xl mx-auto flex items-center px-4 xl:px-6 h-full relative">
          {/* Mobile: Centered Logo and Hamburger */}
          <div className="xl:hidden flex items-center w-full relative">
            <div className="absolute left-1/2 transform -translate-x-[calc(65px)]">
              <Link to="/" className="flex items-center">
                <img src="/INSZN_LogoHeader.png" alt="INSZN Logo" className="h-8 w-auto" />
              </Link>
            </div>
            <button
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              className="ml-auto text-white hover:text-black focus:outline-none"
            >
              {isHamburgerOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
            </button>
          </div>

          {/* Desktop: Main navigation (centered) */}
          <div className="hidden xl:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center gap-4 xl:gap-6">
            {/* Players Dropdown */}
            <div className="relative" ref={playersDropdownRef}>
              <button
                ref={playersButtonRef}
                onClick={() => setIsPlayersDropdownOpen(!isPlayersDropdownOpen)}
                className="flex items-center space-x-2 text-white hover:bg-[#829994] hover:text-black px-3 py-2 rounded text-base xl:text-lg"
              >
                <BsFillPersonFill /> <span>Players</span>
              </button>
              {isPlayersDropdownOpen && (
                <ul className="absolute left-0 mt-2 w-48 bg-white border-2 border-[#235347] rounded shadow-lg z-20">
                  <li>
                    <Link
                      to="/players"
                      className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                      onClick={() => setIsPlayersDropdownOpen(false)}
                    >
                      By Position
                    </Link>
                  </li>
                  <li>
                    <div
                      className="group relative block px-4 py-2 text-gray-400 cursor-not-allowed"
                      title="Coming Soon"
                    >
                      Transfer Portal
                      <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Coming Soon
                      </span>
                    </div>
                  </li>
                </ul>
              )}
            </div>

            {/* Teams Dropdown */}
            <div className="relative" ref={teamsDropdownRef}>
              <button
                ref={teamsButtonRef}
                onClick={() => setIsTeamsDropdownOpen(!isTeamsDropdownOpen)}
                className="flex items-center space-x-2 text-white hover:bg-[#829994] hover:text-black px-2 py-2 rounded text-base xl:text-lg"
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

            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center justify-center px-3 py-2">
                <img src="/INSZN_LogoHeader.png" alt="INSZN Logo" className="h-10 xl:h-8 w-auto mr-1" />
              </Link>
            </div>

            <div className="flex items-center">
              <Link
                to="/h2h"
                className="flex items-center space-x-2 text-white hover:bg-[#829994] hover:text-black px-4 py-2 rounded text-base xl:text-lg"
              >
                <MdPeople /> <span>H2H</span>
              </Link>
            </div>

            <div className="flex items-center">
              <Link
                to="/games"
                className="flex items-center space-x-2 text-white hover:bg-[#829994] hover:text-black px-4 py-2 rounded text-base xl:text-lg"
              >
                <MdOutlineJoinFull /> <span>Games</span>
              </Link>
            </div>
          </div>

          {/* Desktop: Profile or Sign In/Sign Up/Subscribe (right-aligned) */}
          <div className="hidden lg:flex items-center ml-auto space-x-4">
            <Link
              to="/subscribe"
              className="flex items-center space-x-2 bg-[#235347] text-white hover:bg-[#235347]/70 px-3 py-1 rounded text-sm sm:text-base"
            >
              <span>Subscribe</span>
            </Link>
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
                  className="flex items-center space-x-2 bg-[#235347] text-white hover:bg-[#235347]/70 px-3 py-1 rounded text-xl xl:text-base"
                >
                  <span>Sign Up</span>
                </Link>
                <Link
                  to="/sign-in"
                  className="flex items-center space-x-2 bg-[#235347] text-white hover:bg-[#235347]/70 px-3 py-1 rounded text-xl xl:text-base"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: Hamburger Dropdown */}
          {isHamburgerOpen && (
            <div ref={hamburgerRef} className="xl:hidden absolute top-[64px] left-0 w-full bg-white border-b-2 border-[#235347] shadow-lg z-30">
              <ul className="flex flex-col items-start p-4 space-y-2">
                {/* Players Dropdown */}
                <li className="relative w-full" ref={playersDropdownRef}>
                  <button
                    ref={playersButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlayersDropdownOpen(!isPlayersDropdownOpen);
                    }}
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base w-full text-left"
                  >
                    <BsFillPersonFill /> <span>Players</span>
                  </button>
                  {isPlayersDropdownOpen && (
                    <ul className="pl-6 space-y-2 z-40">
                      <li>
                        <Link
                          to="/players"
                          className="block px-4 py-2 text-black hover:bg-[#235347]/70 hover:text-white text-base"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMobileLinkClick();
                          }}
                        >
                          By Position
                        </Link>
                      </li>
                      <li>
                        <div
                          className="group relative block px-4 py-2 text-gray-400 cursor-not-allowed"
                          title="Coming Soon"
                        >
                          Transfer Portal
                          <span className="absolute hidden group-hover:block -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            Coming Soon
                          </span>
                        </div>
                      </li>
                    </ul>
                  )}
                </li>

                {/* Teams Dropdown */}
                <li className="relative w-full" ref={teamsDropdownRef}>
                  <button
                    ref={teamsButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
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
                    to="/games"
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                    onClick={() => handleMobileLinkClick()}
                  >
                    <MdOutlineJoinFull /> <span>Games</span>
                  </Link>
                </li>

                <li>
                  <Link
                    to="/subscribe"
                    className="flex items-center space-x-2 text-black hover:bg-[#235347]/70 hover:text-white px-3 py-2 rounded text-base"
                    onClick={() => handleMobileLinkClick()}
                  >
                    <span>Subscribe</span>
                  </Link>
                </li>

                {isSignedIn ? (
                  <li className="relative w-full" ref={profileDropdownRef}>
                    <button
                      ref={profileButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
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