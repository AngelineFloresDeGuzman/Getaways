
import React, { useState, useEffect } from "react";
import { Moon, Sun, Menu, Home, Mountain, ConciergeBell, Calendar, List, MessageSquare, Clock, Settings, Globe, BookOpen, HelpCircle, UserPlus, Plus, Users, LogOut, Sparkles } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../components/ThemeContext.jsx";
import HostTypeModal from "./HostTypeModal";
import { OnboardingProvider } from "@/pages/Host/contexts/OnboardingContext";

// Move getRoleSwitchButton above Navigation to avoid ReferenceError
const getRoleSwitchButton = (currentUser, userRoles, isOnHostPages, hasMultipleRoles, hasHostRole, setShowHostModal, navigate) => {
  // For logged-out users, always show "Become a host"
  if (!currentUser) {
    return {
      text: "Become a host",
      action: () => setShowHostModal(true),
      icon: <Mountain className="w-4 h-4" />
    };
  }
  // For authenticated users with multiple roles
  if (hasMultipleRoles) {
    if (isOnHostPages) {
      return {
        text: "Switch to Traveler",
        action: () => navigate('/'),
        icon: <Mountain className="w-4 h-4" />
      };
    } else {
      return {
        text: "Switch to Host",
        action: () => navigate('/host/hostdashboard'),
        icon: <Home className="w-4 h-4" />
      };
    }
  } else if (!hasHostRole) {
    // For authenticated users without host role
    return {
      text: "Become a host",
      action: () => setShowHostModal(true),
      icon: <Mountain className="w-4 h-4" />
    };
  }
  return null;
};


const Navigation = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();




  // Compute role/route state for role switch button
  const isOnHostPages = location.pathname.includes('/host/') || 
    location.pathname.includes('/hostdashboard') ||
    location.pathname.includes('/pages/property') ||
    location.pathname.includes('/pages/onboarding') ||
    (location.pathname.startsWith('/pages/') && (
      location.pathname.includes('property') ||
      location.pathname.includes('amenities') ||
      location.pathname.includes('photos') ||
      location.pathname.includes('pricing') ||
      location.pathname.includes('description')
    ));
  const hasMultipleRoles = userRoles.includes('guest') && userRoles.includes('host');
  const hasHostRole = userRoles.includes('host');

  // For smooth role switch button transitions
  const [roleSwitchButtonState, setRoleSwitchButtonState] = useState(() => getRoleSwitchButton(
    null, [], false, false, false, setShowHostModal, navigate
  ));
  const [roleSwitchButtonVisible, setRoleSwitchButtonVisible] = useState(true);


  // Track if login just completed from modal
  const [pendingShowHostModal, setPendingShowHostModal] = useState(false);

  // 🔹 Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        setCurrentUser(user);
        // Fetch user roles from Firestore
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const roles = userData.roles || [userData.role]; // Handle both old and new role structure
            setUserRoles(roles);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles([]);
        }
        // If login just completed from modal, show HostTypeModal
        if (pendingShowHostModal) {
          setShowHostModal(true);
          setPendingShowHostModal(false);
        }
      } else {
        await signOut(auth);
        setCurrentUser(null);
        setUserRoles([]);
      }
    });
    return () => unsubscribe();
  }, [pendingShowHostModal]);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");





  // Smoothly animate role switch button changes
  useEffect(() => {
    setRoleSwitchButtonVisible(false);
    const timeout = setTimeout(() => {
      setRoleSwitchButtonState(getRoleSwitchButton(
        currentUser,
        userRoles,
        isOnHostPages,
        hasMultipleRoles,
        hasHostRole,
        setShowHostModal,
        navigate
      ));
      setRoleSwitchButtonVisible(true);
    }, 150); // 150ms fade out, then swap, then fade in
    return () => clearTimeout(timeout);
  }, [userRoles, location.pathname, currentUser, isOnHostPages, hasMultipleRoles, hasHostRole, setShowHostModal, navigate]);

  const roleSwitchButton = roleSwitchButtonState;

  // Smooth scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <>
      <nav
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-6xl transition-colors duration-300
        ${darkMode ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-border"} 
        rounded-full shadow-lg border`}
      >
        <div className="flex items-center justify-between px-8 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.jpg" alt="Getaways Logo" className="w-8 h-8" />
            <span
              className={`font-heading text-xl font-bold transition-colors ${
                darkMode ? "text-white" : "text-primary"
              }`}
            >
              Getaways
            </span>
          </Link>

          {/* Tabs */}
          <div className="hidden md:flex items-center space-x-8">
            {isOnHostPages && hasHostRole ? (
              // Host Navigation
              <>
                <Link
                  to="/host/hostdashboard"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    location.pathname === "/host/hostdashboard"
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <Clock className="w-5 h-5" /> Today
                </Link>

                <Link
                  to="/host/calendar"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/host/calendar")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <Calendar className="w-5 h-5" /> Calendar
                </Link>

                <Link
                  to="/host/listings"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/host/listings")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <List className="w-5 h-5" /> Listings
                </Link>

                <Link
                  to="/host/messages"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/host/messages")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" /> Messages
                </Link>
              </>
            ) : (
              // Guest Navigation
              <>
                <Link
                  to="/accommodations"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/accommodations")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <Home className="w-5 h-5" /> Accommodations
                </Link>

                <Link
                  to="/experiences"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/experiences")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <Mountain className="w-5 h-5" /> Experiences
                </Link>

                <Link
                  to="/services"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/services")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <ConciergeBell className="w-5 h-5" /> Services
                </Link>
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {roleSwitchButton && (
              <button
                onClick={roleSwitchButton.action}
                className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors transition-opacity duration-200
                  ${roleSwitchButtonVisible
                    ? (darkMode ? "text-gray-300 hover:text-white" : "hover:text-primary")
                    : "text-white"
                  }
                  ${roleSwitchButtonVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={!roleSwitchButtonVisible ? { color: '#fff', fill: '#fff' } : {}}
              >
                <span className={!roleSwitchButtonVisible ? 'text-white fill-white' : ''}>
                  {roleSwitchButton.icon}
                </span>
                <span className={!roleSwitchButtonVisible ? 'text-white' : ''}>
                  {roleSwitchButton.text}
                </span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              className="p-2 rounded-full hover:bg-muted dark:hover:bg-gray-800 transition"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400 transition-transform duration-300 rotate-180" />
              ) : (
                <Moon className="w-5 h-5 transition-transform duration-300 rotate-0" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex items-center gap-2 border rounded-full px-3 py-2 hover:shadow-md transition ${
                  darkMode ? "border-gray-700" : "border-border"
                }`}
              >
                <Menu className={`w-5 h-5 transition-colors ${darkMode ? "text-white" : ""}`} />
              </button>

              {menuOpen && (
                <div
                  className={`absolute right-0 mt-3 w-64 rounded-xl shadow-lg overflow-hidden border ${
                    darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-border"
                  }`}
                >
                  {currentUser ? (
                    <>
                      {isOnHostPages && hasHostRole ? (
                        // Host Menu
                        <>
                          {/* Role switching for mobile */}
                          {roleSwitchButton && (
                            <>
                              <button 
                                onClick={() => {
                                  roleSwitchButton.action();
                                  setMenuOpen(false);
                                }} 
                                className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted font-medium"
                              >
                                {roleSwitchButton.icon}
                                {roleSwitchButton.text}
                              </button>
                              <hr className="my-1 mx-4 border-border" />
                            </>
                          )}
                          
                          <Link to="/host/wishlists" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Sparkles className="w-5 h-5" />
                            Wishlists
                          </Link>
                          <Link to="/accountsettings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Settings className="w-5 h-5" />
                            Account settings
                          </Link>
                          <Link to="/languages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Globe className="w-5 h-5" />
                            Languages & currency
                          </Link>
                          <Link to="/host/resources" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <BookOpen className="w-5 h-5" />
                            Hosting resources
                          </Link>
                          <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <HelpCircle className="w-5 h-5" />
                            Get help
                          </Link>
                          <Link to="/find-cohost" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <UserPlus className="w-5 h-5" />
                            Find a co-host
                          </Link>
                          <button 
                            onClick={() => {
                              setShowHostModal(true);
                              setMenuOpen(false);
                            }} 
                            className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted"
                          >
                            <Plus className="w-5 h-5" />
                            Create a new listing
                          </button>
                          <Link to="/refer" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Users className="w-5 h-5" />
                            Refer a host
                          </Link>
                          <hr className="my-1 mx-4 border-border" />
                          <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted">
                            <LogOut className="w-5 h-5" />
                            Log out
                          </button>
                        </>
                      ) : (
                        // Guest Menu
                        <>
                          {/* Role switching for mobile */}
                          {roleSwitchButton && (
                            <>
                              <button 
                                onClick={() => {
                                  roleSwitchButton.action();
                                  setMenuOpen(false);
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-muted font-medium"
                              >
                                {roleSwitchButton.icon}
                                {roleSwitchButton.text}
                              </button>
                              <hr className="my-2 mx-4 border-border" />
                            </>
                          )}
                          
                          <Link to="/favorites" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Favorites</Link>
                          <Link to="/bookings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Bookings</Link>
                          <Link to="/messages" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Messages</Link>
                          <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Profile</Link>
                          <Link to="/notifications" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Notifications</Link>
                          <Link to="/accountsettings" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Account settings</Link>
                          <Link to="/languages" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Languages & currency</Link>
                          <Link to="/help" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Help Center</Link>
                          <hr className="my-2 mx-4 border-border" />
                          <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-muted">
                            Logout
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {roleSwitchButton && (
                        <button 
                          onClick={() => {
                            roleSwitchButton.action();
                            setMenuOpen(false);
                          }} 
                          className="block w-full text-left px-4 py-2 hover:bg-muted"
                        >
                          {roleSwitchButton.text}
                        </button>
                      )}
                      <p className="px-4 py-1 text-xs text-muted-foreground">
                        It's easy to start hosting and earn extra income.
                      </p>
                      <Link to="/refer" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Refer a Host</Link>
                      <Link to="/find-cohost" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Find a co-host</Link>
                      <Link to="/gift-cards" onClick={() => setMenuOpen(false)} className="block px-4 py-2 hover:bg-muted">Gift cards</Link>
                      <hr className="my-2 mx-4 border-border" />
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-muted"
                        onClick={() => { navigate('/login'); setMenuOpen(false); }}
                      >
                        Login / Signup
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <OnboardingProvider>
        <HostTypeModal
          isOpen={showHostModal}
          onClose={() => setShowHostModal(false)}
          currentUser={currentUser}
          fromNavbar={true}
        />
      </OnboardingProvider>
    </>
  );
};

export default Navigation;
