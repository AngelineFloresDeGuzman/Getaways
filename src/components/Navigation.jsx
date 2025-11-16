
import React, { useState, useEffect } from "react";
import { Moon, Sun, Menu, Home, Mountain, ConciergeBell, Calendar, List, MessageSquare, Clock, Settings, Globe, BookOpen, HelpCircle, UserPlus, Plus, Users, LogOut, Sparkles, Wallet, Heart, Bell, Shield, BarChart3 } from "lucide-react";
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
        action: () => {
          sessionStorage.setItem('lastActiveMode', 'guest');
          navigate('/');
        },
        icon: <Mountain className="w-4 h-4" />
      };
    } else {
      return {
        text: "Switch to Host",
        action: () => {
          sessionStorage.setItem('lastActiveMode', 'host');
          navigate('/host/hostdashboard');
        },
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
  const [activeMode, setActiveMode] = useState(null); // Track current active mode: 'guest' | 'host' | null
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();




  // Compute role/route state for role switch button
  // Check if path is a host-specific page OR if user has host role and is on shared host pages
  // This ensures hosts accessing shared pages from host menu see host navigation
  
  // First determine user roles (needed for isOnHostPages calculation)
  const hasMultipleRoles = userRoles.includes('guest') && userRoles.includes('host');
  const hasHostRole = userRoles.includes('host');
  
  // These are pages that should always show host navigation when accessed by hosts
  const hostMenuPaths = [
    '/host/resources',
    '/find-cohost',
    '/refer',
    '/languages',
    '/help'
  ];
  
  // Shared pages that can be accessed by both guests and hosts
  // They should show appropriate nav based on user role
  const sharedPages = ['/accountsettings', '/ewallet'];
  
  const isHostSpecificPath = 
    location.pathname.includes('/host/') || 
    location.pathname.includes('/hostdashboard') ||
    location.pathname.includes('/pages/property') ||
    location.pathname.includes('/pages/onboarding') ||
    hostMenuPaths.some(path => location.pathname === path || location.pathname.startsWith(path)) ||
    (location.pathname.startsWith('/pages/') && (
      location.pathname.includes('property') ||
      location.pathname.includes('amenities') ||
      location.pathname.includes('photos') ||
      location.pathname.includes('pricing') ||
      location.pathname.includes('description') ||
      location.pathname.includes('hostingsteps') ||
      location.pathname.includes('location') ||
      location.pathname.includes('booking')
    ));
  
  // Check if current path is a shared page
  const isSharedPage = sharedPages.some(path => location.pathname === path || location.pathname.startsWith(path));
  
  // For users with both roles, we need to detect the "current mode" based on context
  // Rules:
  // 1. Host-specific paths → ALWAYS host nav (if user has host role)
  // 2. Shared pages (like /accountsettings) → DEFAULT to guest nav unless on host menu path
  // 3. Users without host role → ALWAYS guest nav
  
  const isOnSharedPage = isSharedPage;
  const isOnSharedHostMenuPath = hostMenuPaths.some(path => location.pathname === path || location.pathname.startsWith(path));
  
  // Track active mode based on current path
  // This determines which "context" the user is in (host vs guest)
  useEffect(() => {
    if (!hasMultipleRoles) {
      // For single-role users, mode is determined by role
      if (hasHostRole) {
        setActiveMode('host');
      } else {
        setActiveMode('guest');
      }
    } else {
      // For users with both roles, determine mode based on current path
      if (isHostSpecificPath || isOnSharedHostMenuPath) {
        setActiveMode('host');
      } else if (isSharedPage) {
        // For shared pages, maintain the last known mode if available
        // Otherwise default to guest
        const lastMode = sessionStorage.getItem('lastActiveMode');
        setActiveMode(lastMode === 'host' || lastMode === 'guest' ? lastMode : 'guest');
      } else {
        // Guest pages default to guest mode
        setActiveMode('guest');
        sessionStorage.setItem('lastActiveMode', 'guest');
      }
    }
  }, [location.pathname, hasMultipleRoles, hasHostRole, isHostSpecificPath, isOnSharedHostMenuPath, isSharedPage]);
  
  // Save mode to sessionStorage when on host-specific paths
  useEffect(() => {
    if (isHostSpecificPath || isOnSharedHostMenuPath) {
      sessionStorage.setItem('lastActiveMode', 'host');
    } else if (!isSharedPage) {
      sessionStorage.setItem('lastActiveMode', 'guest');
    }
  }, [location.pathname, isHostSpecificPath, isOnSharedHostMenuPath, isSharedPage]);
  
  // Determine if we're in "host mode"
  // For users with both roles: Use activeMode to determine context
  // For single-role users: Use path-based logic
  const isOnHostPages = hasMultipleRoles
    ? (activeMode === 'host')
    : (isHostSpecificPath || (hasHostRole && isOnSharedHostMenuPath));
  
  // Check if user is admin
  const isAdmin = userRoles.includes('admin');
  
  // Final decision: Show host nav only if user has host role AND we're in host mode AND not admin
  // Admin users should always see admin navigation
  const shouldShowHostNav = hasHostRole && isOnHostPages && !isAdmin;
  const shouldShowGuestNav = !isAdmin && !shouldShowHostNav;
  const shouldShowAdminNav = isAdmin;
  
  // Debug: Log to help diagnose navigation issues
  useEffect(() => {
    if (location.pathname === '/accountsettings') {
      console.log('🔍 Account Settings Nav Debug:', { 
        pathname: location.pathname, 
        hasHostRole, 
        hasMultipleRoles,
        activeMode,
        isHostSpecificPath, 
        isSharedPage, 
        isOnHostPages,
        shouldShowHostNav,
        lastActiveMode: sessionStorage.getItem('lastActiveMode'),
        userRoles,
        userRolesString: JSON.stringify(userRoles)
      });
    }
  }, [location.pathname, hasHostRole, hasMultipleRoles, activeMode, isHostSpecificPath, isSharedPage, isOnHostPages, shouldShowHostNav, userRoles]);

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
      if (user) {
        // Fetch user roles from Firestore first to check if admin
        let isAdmin = false;
        let isEmailVerified = false;
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            let roles = userData.roles || [userData.role]; // Handle both old and new role structure
            // Ensure roles is always an array
            if (!Array.isArray(roles)) {
              roles = roles ? [roles] : ['guest']; // Default to guest if no role specified
            }
            // If roles array is empty, default to guest
            if (roles.length === 0) {
              roles = ['guest'];
            }
            isAdmin = roles.includes('admin');
            // Use Firestore emailVerified (set by EmailJS) instead of Firebase Auth's emailVerified
            isEmailVerified = userData.emailVerified === true;
            setUserRoles(roles);
          } else {
            // If user doc doesn't exist, default to guest
            setUserRoles(['guest']);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setUserRoles(['guest']); // Default to guest on error
        }
        
        // Allow admin users even if email not verified, otherwise require email verification
        // Use Firestore emailVerified (set by EmailJS) instead of Firebase Auth's emailVerified
        if (isEmailVerified || isAdmin) {
          setCurrentUser(user);
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

  // Smooth scroll to top on route change (except for messages pages which handle their own scrolling)
  useEffect(() => {
    // Don't auto-scroll on messages pages - they handle their own scroll behavior
    if (location.pathname === '/messages' || location.pathname === '/host/messages') {
      return;
    }
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
          <Link 
            to={shouldShowAdminNav ? "/admin/admindashboard" : shouldShowHostNav ? "/host/hostdashboard" : "/"} 
            className="flex items-center gap-2 flex-shrink-0"
          >
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
            {shouldShowAdminNav ? (
              // Admin Navigation - All items in navbar
              <>
                <Link
                  to="/admin/admindashboard"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    location.pathname === "/admin/admindashboard" || location.pathname.startsWith("/admin/")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <BarChart3 className="w-5 h-5" /> Dashboard
                </Link>
                <Link
                  to="/ewallet"
                  className={`flex items-center gap-1 font-body transition-colors ${
                    isActive("/ewallet")
                      ? darkMode
                        ? "text-white font-semibold"
                        : "text-primary font-semibold"
                      : darkMode
                        ? "text-gray-300 hover:text-white"
                        : "text-foreground hover:text-primary"
                  }`}
                >
                  <Wallet className="w-5 h-5" /> GetPay
                </Link>
              </>
            ) : shouldShowHostNav ? (
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

                {/* Host Notifications Bell */}
                {/* Notifications link moved to host dropdown menu below */}

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
            {/* Hide role switch button for admin users */}
            {!isAdmin && roleSwitchButton && (
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

            {/* Admin Logout Button */}
            {shouldShowAdminNav && currentUser && (
              <button
                onClick={async () => {
                  await signOut(auth);
                  navigate('/login');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                  darkMode
                    ? "border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-600"
                    : "border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                }`}
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            )}

            {/* User Menu - Only show for non-admin users */}
            {!shouldShowAdminNav && (
              // Guest/Host: Show menu button with dropdown
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
                      {shouldShowHostNav ? (
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
                          
                          <Link to="/ewallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Wallet className="w-5 h-5" />
                            GetPay
                          </Link>
                          <Link to="/host/policies" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Shield className="w-5 h-5" />
                            Policies & Guidelines
                          </Link>
                          <Link to="/accountsettings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Settings className="w-5 h-5" />
                            Account Settings
                          </Link>
                          <Link to="/help" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <HelpCircle className="w-5 h-5" />
                            Get help
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
                          
                          <Link to="/favorites" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Heart className="w-5 h-5" />
                            Favorites
                          </Link>
                          <Link to="/messages" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <MessageSquare className="w-5 h-5" />
                            Messages
                          </Link>
                          <Link to="/ewallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Wallet className="w-5 h-5" />
                            GetPay
                          </Link>
                          <Link to="/guest/policies" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Shield className="w-5 h-5" />
                            Policies & Guidelines
                          </Link>
                          <Link to="/accountsettings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <Settings className="w-5 h-5" />
                            Account Settings
                          </Link>
                          <hr className="my-2 mx-4 border-border" />
                          <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-muted">
                            <LogOut className="w-5 h-5" />
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
            )}
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
