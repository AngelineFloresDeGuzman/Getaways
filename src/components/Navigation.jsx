import React, { useState, useEffect } from "react";
import { Heart, Settings } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocation, Link } from "react-router-dom";

const Navigation = ({ role: initialRole = "guest" }) => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    window.location.href = "/login";
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-6xl">
      <div className="flex items-center justify-between px-8 py-3 rounded-full shadow-lg bg-white/95 backdrop-blur-md transition-all duration-300 border border-border">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link to="/guest" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Havenly Logo" className="w-8 h-8" />
            <span className="font-heading text-xl font-bold text-primary">Havenly</span>
          </Link>
        </div>

        {/* Navigation links */}
        <div className="hidden md:flex items-center space-x-8">
          {[
            { path: "/accommodations", label: "Accommodations" },
            { path: "/experiences", label: "Experiences" },
            { path: "/services", label: "Services" },
          ].map(({ path, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`relative font-body transition-colors
                  ${active ? "text-primary" : "text-foreground hover:text-primary"}
                  after:content-[''] after:absolute after:left-0 after:-bottom-1
                  after:h-[2px] after:bg-primary after:transition-all after:duration-300
                  ${active ? "after:w-full" : "after:w-0 hover:after:w-full"}
                `}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Auth section */}
        <div className="hidden md:flex items-center space-x-6">
          {!user && (
            <Link
              to="/become-host"
              className={`relative font-body transition-colors
                ${isActive("/become-host") ? "text-primary" : "text-foreground hover:text-primary"}
                after:content-[''] after:absolute after:left-0 after:-bottom-1
                after:h-[2px] after:bg-primary after:transition-all after:duration-300
                ${isActive("/become-host") ? "after:w-full" : "after:w-0 hover:after:w-full"}
              `}
            >
              Become a Host
            </Link>
          )}

          {user ? (
            <>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Heart className="w-5 h-5 text-foreground" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Settings className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={handleLogout}
                className="border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="border border-border text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
