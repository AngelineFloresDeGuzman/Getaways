import React, { useState, useEffect } from "react";
import { Moon, Sun, Menu, Home, Mountain, ConciergeBell } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useTheme } from "../components/ThemeContext.jsx";
import HostTypeModal from "./HostTypeModal";

const Navigation = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();

  // 🔹 Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        setCurrentUser(user);
      } else {
        await signOut(auth);
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

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
            <img src="/logo.jpg" alt="Havenly Logo" className="w-8 h-8" />
            <span
              className={`font-heading text-xl font-bold transition-colors ${
                darkMode ? "text-white" : "text-primary"
              }`}
            >
              Havenly
            </span>
          </Link>

          {/* Tabs */}
          <div className="hidden md:flex items-center space-x-8">
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
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHostModal(true)}
              className={`hidden md:block text-sm font-medium transition-colors ${
                darkMode ? "text-gray-300 hover:text-white" : "hover:text-primary"
              }`}
            >
              Become a host
            </button>

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
                      <Link to="/favorites" className="block px-4 py-2 hover:bg-muted">Wishlists</Link>
                      <Link to="/bookings" className="block px-4 py-2 hover:bg-muted">Bookings</Link>
                      <Link to="/messages" className="block px-4 py-2 hover:bg-muted">Messages</Link>
                      <Link to="/profile" className="block px-4 py-2 hover:bg-muted">Profile</Link>
                      <Link to="/notifications" className="block px-4 py-2 hover:bg-muted">Notifications</Link>
                      <Link to="/accountsettings" className="block px-4 py-2 hover:bg-muted">Account settings</Link>
                      <Link to="/languages" className="block px-4 py-2 hover:bg-muted">Languages & currency</Link>
                      <Link to="/help" className="block px-4 py-2 hover:bg-muted">Help Center</Link>
                      <hr className="my-2 mx-4 border-border" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-muted">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/become-host" className="block px-4 py-2 hover:bg-muted">Become a host</Link>
                      <p className="px-4 py-1 text-xs text-muted-foreground">
                        It's easy to start hosting and earn extra income.
                      </p>
                      <Link to="/refer" className="block px-4 py-2 hover:bg-muted">Refer a Host</Link>
                      <Link to="/find-cohost" className="block px-4 py-2 hover:bg-muted">Find a co-host</Link>
                      <Link to="/gift-cards" className="block px-4 py-2 hover:bg-muted">Gift cards</Link>
                      <hr className="my-2 mx-4 border-border" />
                      <Link to="/login" className="block px-4 py-2 hover:bg-muted">Login / Signup</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <HostTypeModal
        isOpen={showHostModal}
        onClose={() => setShowHostModal(false)}
      />
    </>
  );
};

export default Navigation;
