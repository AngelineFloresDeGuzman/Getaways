import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Heart, MapPin, Grid, List, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import LogIn from "@/pages/Auth/LogIn";
import FavoriteButton from "@/components/FavoriteButton";

const Favorites = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setShowLoginModal(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const storageKey = `favorites_${user.uid}`;
      const loadFavorites = () => {
        const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        const normalized = storedFavorites
          .filter(item => item && item.id)
          .map(item => ({
            ...item,
            type: item.type || item.category || "accommodation"
          }));
        setFavorites(normalized);
      };

      loadFavorites();

      const handleStorage = (e) => {
        if (e.key === storageKey) loadFavorites();
      };
      
      const handleFavoritesChanged = (e) => {
        if (e.detail.userId === user.uid) {
          loadFavorites();
        }
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener("favoritesChanged", handleFavoritesChanged);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("favoritesChanged", handleFavoritesChanged);
      };
    } else {
      setFavorites([]);
    }
  }, [user]);

  const toggleFavorite = (item) => {
    if (!item || !item.id || !user) return;

    const key = `favorites_${user.uid}`;
    const stored = JSON.parse(localStorage.getItem(key)) || [];
    const exists = stored.some(fav => fav?.id === item.id && fav?.type === item.type);

    const updatedFavorites = exists
      ? stored.filter(fav => !(fav?.id === item.id && fav?.type === item.type))
      : [...stored, item];

    localStorage.setItem(key, JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: updatedFavorites, userId: user.uid }
    }));
  };

  const tabTypeMap = {
    all: null,
    accommodations: 'accommodation',
    experiences: 'experience',
    services: 'service'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background pt-36 pb-20 flex items-center justify-center">
          <div className="max-w-md w-full px-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to view your favorites.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="btn-primary w-full"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
        <Footer />
        {showLoginModal && <LogIn onClose={() => setShowLoginModal(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-36 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Favorites</h1>
          <p className="text-muted-foreground">Your saved accommodations, experiences, and services</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 border-b border-border">
            {['all', 'accommodations', 'experiences', 'services'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === type
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({tabCounts[type]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredFavorites.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFavorites.map(item => (
                <div
                  key={`${item.id}-${item.type}`}
                  className="card-listing cursor-pointer"
                  onClick={() => navigate(`/${item.type}s/${item.id}`)}
                >
                  <div className="relative w-full overflow-hidden rounded-lg aspect-[4/3]">
                    <img 
                      src={item.image || item.images?.[0] || '/placeholder-image.jpg'} 
                      alt={item.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2" onClick={e => e.stopPropagation()}>
                      <FavoriteButton
                        item={item}
                        user={user}
                        isFavorite={favorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                        onRequireLogin={() => setShowLoginModal(true)}
                        onToggle={() => toggleFavorite(item)}
                      />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-heading text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="font-body text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" /> {item.location}
                    </p>
                    <div className="flex justify-between mt-2">
                      <span className="font-heading text-2xl font-bold text-foreground">
                        ₱{item.price ? item.price.toLocaleString() : '0'}
                      </span>
                      {item.savedDate && (
                        <span className="text-xs text-muted-foreground">Saved {item.savedDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFavorites.map(item => (
                <div
                  key={`${item.id}-${item.type}`}
                  className="card-listing hover-lift cursor-pointer"
                  onClick={() => navigate(`/${item.type}s/${item.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0 w-36 h-36 overflow-hidden rounded-lg">
                      <img 
                        src={item.image || item.images?.[0] || '/placeholder-image.jpg'} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <FavoriteButton
                          item={item}
                          user={user}
                          isFavorite={favorites.some(fav => fav?.id === item.id && fav?.type === item.type)}
                          onRequireLogin={() => setShowLoginModal(true)}
                          onToggle={() => toggleFavorite(item)}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="font-body text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" /> {item.location}
                      </p>
                      <span className="text-sm text-muted-foreground mt-2 block">
                        ₱{item.price ? item.price.toLocaleString() : '0'}
                      </span>
                      {item.savedDate && (
                        <span className="text-xs text-muted-foreground">Saved {item.savedDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-center text-lg">No favorites yet.</p>
            <p className="text-muted-foreground mt-6">Start exploring and save your favorite accommodations, services, and experiences</p>
          </div>
        )}
      </main>

      <Footer />
      {showLoginModal && <LogIn onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default Favorites;

