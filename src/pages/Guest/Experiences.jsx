import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Mountain, Clock, MapPin, Star, Share2, Users, X } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import LogIn from "@/pages/Auth/LogIn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";

const Experiences = () => {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All Experiences");
  const navigate = useNavigate();
  const handleRequireLogin = () => setShowLoginModal(true);
  useEffect(() => {
    const handleStorageChange = () => {
      if (user) {
        const storageKey = `favorites_${user.uid}`;
        const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        setFavoriteItems(storedFavorites);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const storageKey = `favorites_${user.uid}`;
      const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
      setFavoriteItems(storedFavorites);
    }
  }, [user]);

  const experiences = [
    { id: 1, title: "Sunset Hot Air Balloon Ride", host: "Sky Adventures", location: "Napa Valley, CA", price: 280, duration: "3 hours", groupSize: "Up to 8 people", rating: 4.9, reviews: 234, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80", category: "Adventure", type: "experience" },
    { id: 2, title: "Wine Tasting & Vineyard Tour", host: "Vine & Dine Tours", location: "Tuscany, Italy", price: 95, duration: "4 hours", groupSize: "Up to 12 people", rating: 4.8, reviews: 187, image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80", category: "Food & Drink", type: "experience" },
    { id: 3, title: "Traditional Cooking Class", host: "Chef Maria's Kitchen", location: "Barcelona, Spain", price: 75, duration: "2.5 hours", groupSize: "Up to 6 people", rating: 4.9, reviews: 156, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80", category: "Cultural", type: "experience" },
    { id: 4, title: "Guided Mountain Hike", host: "Alpine Guides", location: "Swiss Alps, Switzerland", price: 120, duration: "6 hours", groupSize: "Up to 10 people", rating: 4.7, reviews: 289, image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80", category: "Adventure", type: "experience" },
  ];

  const toggleFavorite = (item, type) => {
    if (!user) {
      handleRequireLogin();
      return;
    }

    const storageKey = `favorites_${user.uid}`;
    const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
    const isAlreadyFavorite = storedFavorites.some(fav => fav.id === item.id && fav.type === type);
    const updatedFavorites = isAlreadyFavorite
      ? storedFavorites.filter(fav => !(fav.id === item.id && fav.type === type))
      : [...storedFavorites, { ...item, type }];
    localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
    setFavoriteItems(updatedFavorites);
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
        detail: { favorites: updatedFavorites, userId: user.uid }
    }));
  };

  const categories = ["All Experiences", "Adventure", "Cultural", "Food & Drink", "Nature", "Art & History", "Sports", "Workshops"];

  const filteredExperiences =
    selectedCategory === "All Experiences"
      ? experiences
      : experiences.filter(exp => exp.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <section className="pt-36 pb-12 px-6 bg-gradient-to-br from-muted/20 to-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4 animate-fade-in">
            <Mountain className="w-8 h-8 text-primary" />
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
              Unique Experiences
            </h1>
          </div>
          <p className="font-body text-xl text-muted-foreground max-w-2xl animate-fade-in">
            Discover unforgettable activities and local adventures crafted by passionate hosts
          </p>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="py-8 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all ${selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Cards */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <p className="font-body text-muted-foreground">
              {filteredExperiences.length} experiences available
            </p>
            <select className="p-2 border border-border rounded-lg bg-background text-foreground">
              <option>Sort by: Recommended</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Rating: High to Low</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {filteredExperiences.map((experience, index) => (
              <div
                key={experience.id}
                className="card-listing hover-lift cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/experiences/${experience.id}`)}
              >
                <div className="relative overflow-hidden rounded-t-2xl">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />

                  {/* Favorite and Share buttons */}
                  <div
                    className="absolute top-4 right-4 flex gap-2"
                    onClick={(e) => e.stopPropagation()} // stops card navigation only for buttons
                  >
                    <FavoriteButton
                      item={{ ...(experience || {}), type: "experience" }}
                      user={user}
                      isFavorite={favoriteItems.some(
                        fav => experience && fav && fav.id === experience.id && fav.type === "experience"
                      )}
                      onRequireLogin={handleRequireLogin}
                      onToggle={() => toggleFavorite(experience, "experience")}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveShare(experience.id);
                      }}
                      className="p-2 bg-white/90 rounded-full hover:bg-white hover:scale-110 transition-all"
                    >
                      <Share2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 bg-white/90 rounded-full px-3 py-1">
                    <span className="text-sm font-medium text-foreground">
                      {experience.category}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                        {experience.title}
                      </h3>
                      <p className="font-body text-primary font-medium mb-1">
                        hosted by {experience.host}
                      </p>
                      <p className="font-body text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {experience.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-sm">{experience.rating}</span>
                      <span className="text-muted-foreground text-sm">
                        ({experience.reviews})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{experience.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{experience.groupSize}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-heading text-2xl font-bold text-foreground">
                        ${experience.price}
                      </span>
                      <span className="font-body text-muted-foreground"> / person</span>
                    </div>
                    <button className="btn-primary">Book Experience</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="btn-outline px-8 py-3">Load More Experiences</button>
          </div>
        </div>
      </section>

      <Footer />

      {showLoginModal && (
        <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />
      )}

      {/* Share Modal */}
      {activeShare && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setActiveShare(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveShare(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h2 className="text-xl font-heading font-bold mb-4">
              Share this Experience
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
              >
                <FontAwesomeIcon icon={faXTwitter} />
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>

              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(`${window.location.origin}/experiences/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} />
              </a>

              {/* More Options */}
              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Check out this experience on Havenly!",
                        text: "Explore this amazing experience!",
                        url: `${window.location.origin}/experiences/${activeShare}`,
                      });
                    } catch (error) {
                      console.error("Share cancelled or failed:", error);
                    }
                  } else {
                    alert("Sharing via device apps is not supported on this browser.");
                  }
                }}
                className="flex items-center justify-center w-12 h-12 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition font-bold"
                title="More Options"
              >
                ⋮
              </button>
            </div>

            {/* Copy Link Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/experiences/${activeShare}`}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/experiences/${activeShare}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Copy
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm font-medium transition-opacity">
                  ✅ Link copied!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Experiences;
