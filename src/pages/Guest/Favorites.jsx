import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Star, MapPin, Share2, Grid, List, Heart, X } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import LogIn from "@/pages/Auth/LogIn";
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";
import { useNavigate } from 'react-router-dom';

const Favorites = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const handleRequireLogin = () => setShowLoginModal(true);

  const tabTypeMap = {
    all: null,
    accommodations: 'accommodation',
    experiences: 'experience',
    services: 'service'
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // Load favorites
  useEffect(() => {
    if (!user) return;

    const loadFavorites = () => {
      const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
      const normalized = storedFavorites
        .filter(item => item && item.id)
        .map(item => ({
          ...item,
          type: item.type || item.category || "accommodation"
        }));
      setFavorites(normalized);
    };

    loadFavorites();

    const handleStorage = e => {
      if (e.key === `favorites_${user?.uid}`) loadFavorites();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  const toggleFavorite = (item) => {
    if (!item || !item.id) return;
    if (!user) return setShowLoginModal(true);

    const key = `favorites_${user.uid}`;
    const stored = JSON.parse(localStorage.getItem(key)) || [];
    const exists = stored.some(fav => fav?.id === item.id && fav?.type === item.type);

    const updatedFavorites = exists
      ? stored.filter(fav => !(fav?.id === item.id && fav?.type === item.type))
      : [...stored, item];

    localStorage.setItem(key, JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites); // instant UI update
  };

  const filteredFavorites = favorites
    .filter(item => item && item.id && item.type)
    .filter(item => {
      if (filter === 'all') return true;
      return item.type === (tabTypeMap[filter] || filter);
    });

  const tabCounts = {
    all: favorites.length,
    accommodations: favorites.filter(f => f?.type === 'accommodation').length,
    experiences: favorites.filter(f => f?.type === 'experience').length,
    services: favorites.filter(f => f?.type === 'service').length,
  };

  const getTypeColor = type => {
    switch (type) {
      case 'accommodation': return 'bg-blue-100 text-blue-700';
      case 'service': return 'bg-green-100 text-green-700';
      case 'experience': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredFavorites.map(item => (
        <div
          key={`${item.id}-${item.type}`}
          className="card-listing cursor-pointer"
          onClick={() => navigate(`/${item.type}s/${item.id}`)}
        >
          <div className="relative w-full overflow-hidden rounded-lg aspect-[4/3]">
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 flex gap-2" onClick={e => e.stopPropagation()}>
              <FavoriteButton
                item={item}
                user={user}
                isFavorite={favorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                onRequireLogin={handleRequireLogin}
                onToggle={() => toggleFavorite(item)}
              />
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-heading text-xl font-semibold text-foreground">{item.title}</h3>
            <p className="font-body text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {item.location}
            </p>
            <div className="flex justify-between mt-2">
              <span className="font-heading text-2xl font-bold text-foreground">${item.price}</span>
              <span className="text-xs text-muted-foreground">Saved {item.savedDate}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {filteredFavorites.map(item => (
        <div
          key={`${item.id}-${item.type}`}
          className="card-listing hover-lift cursor-pointer"
          onClick={() => navigate(`/${item.type}s/${item.id}`)}
        >
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-1">
                <FavoriteButton
                  item={item}
                  user={user}
                  isFavorite={favorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                  onRequireLogin={handleRequireLogin}
                  onToggle={() => toggleFavorite(item)}
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="font-body text-muted-foreground">{item.location}</p>
              <span className="text-sm text-muted-foreground">${item.price}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const shareUrl = window.location.href; // simple placeholder

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <Heart className="w-8 h-8 text-red-500" />
              <h1 className="font-heading text-4xl font-bold text-foreground">My Favorites</h1>
            </div>
            <p className="font-body text-xl text-muted-foreground">
              {filteredFavorites.length} saved items ready for your next adventure
            </p>
          </div>
        </div>

        {/* Tabs + View toggle */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 border-b border-border mb-8">
              {['all', 'accommodations', 'experiences', 'services'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${filter === type
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({tabCounts[type]})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Grid className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {filteredFavorites.length > 0
  ? (viewMode === 'grid' ? renderGridView() : renderListView())
  : (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-center text-lg">No favorites yet.</p>
                <p className="text-muted-foreground mt-6">Start exploring and save your favorite accommodations, services, and experiences</p>
              </div>
            )}
        </div>

        {/* Share Modal */}
        {activeShare && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActiveShare(null)}>
            <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-center relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setActiveShare(null)} className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <h2 className="text-xl font-heading font-bold mb-4">Share this Favorite</h2>
              <p className="text-muted-foreground text-sm mb-6">Choose a platform to share or copy the link below.</p>

              <div className="flex justify-center gap-4 mb-6 flex-wrap">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
                  <FontAwesomeIcon icon={faFacebookF} />
                </a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition">
                  <FontAwesomeIcon icon={faXTwitter} />
                </a>
                <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition">
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a href={`https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
                  <FontAwesomeIcon icon={faFacebookMessenger} />
                </a>
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: "Check out this item I saved!", text: "Explore this amazing place!", url: shareUrl });
                      } catch (error) { console.error("Share failed:", error); }
                    } else alert("Sharing not supported on this browser.");
                  }}
                  className="flex items-center justify-center w-12 h-12 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition font-bold"
                  title="More Options"
                >
                  ⋮
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={shareUrl} className="border border-border rounded-lg px-3 py-2 w-full text-sm" />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-outline px-4 py-2 text-sm">Copy</button>
                </div>
                {copied && <p className="text-green-600 text-sm font-medium transition-opacity">✅ Link copied!</p>}
              </div>
            </div>
          </div>
        )}

        <Footer />
        {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
      </div>
    </div>
  );
};

export default Favorites;
