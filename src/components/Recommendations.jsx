import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, MapPin, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getRecommendations, getPopularRecommendations } from '@/pages/Guest/services/recommendationsService';
import Loading from './Loading';

const Recommendations = ({ title = "Recommended for You", showTitle = true, limit = 12, category = null }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const storageKey = `favorites_${currentUser.uid}`;
        const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        setFavorites(storedFavorites);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      let recommendationsData = [];

      if (user) {
        // Get personalized recommendations based on booking history
        console.log('🔍 Loading personalized recommendations for user:', user.uid, category ? `for category: ${category}` : '');
        recommendationsData = await getRecommendations(user.uid, limit, category);
        console.log('✅ Personalized recommendations:', recommendationsData.length);
      }

      // If no personalized recommendations or user not logged in, get popular ones
      if (recommendationsData.length === 0) {
        console.log('📊 Loading popular recommendations (fallback)', category ? `for category: ${category}` : '');
        recommendationsData = await getPopularRecommendations(limit, category);
        console.log('✅ Popular recommendations:', recommendationsData.length);
      }

      // Format listings for display
      let formattedRecommendations = recommendationsData.map(listing => {
        const locationData = listing.locationData || {};
        const photos = listing.photos || [];
        
        return {
          id: listing.id,
          title: listing.title || 'Untitled Listing',
          location: listing.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location'),
          price: listing.price || 0,
          rating: listing.rating || 0,
          reviewCount: listing.reviews || 0,
          category: listing.category || 'accommodation',
          image: photos[0]?.base64 || photos[0]?.url || listing.image || null,
          recommendationReason: listing.recommendationReason || 'Recommended for you'
        };
      });

      // Filter by category if specified
      if (category) {
        formattedRecommendations = formattedRecommendations.filter(
          listing => listing.category === category
        );
      }

      console.log('📦 Final formatted recommendations:', formattedRecommendations.length);
      setRecommendations(formattedRecommendations);
    } catch (error) {
      console.error('❌ Error loading recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (listing) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const storageKey = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];

    const isFavorite = storedFavorites.some(
      fav => fav.id === listing.id && fav.type === listing.category
    );

    let updatedFavorites;
    if (isFavorite) {
      updatedFavorites = storedFavorites.filter(
        fav => !(fav.id === listing.id && fav.type === listing.category)
      );
    } else {
      updatedFavorites = [...storedFavorites, {
        id: listing.id,
        type: listing.category,
        title: listing.title,
        location: listing.location,
        price: listing.price,
        image: listing.image
      }];
    }

    setFavorites(updatedFavorites);
    localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: updatedFavorites, userId: user.uid }
    }));
  };

  const isFavorite = (listingId, category) => {
    return favorites.some(fav => fav.id === listingId && fav.type === category);
  };

  if (loading) {
    return (
      <div className="py-12">
        <Loading message="Loading recommendations..." />
      </div>
    );
  }

  if (recommendations.length === 0) {
    console.log('⚠️ No recommendations to display');
    // Show empty state instead of hiding completely
    return (
      <section className="py-12 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          {showTitle && (
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="font-heading text-3xl font-bold text-foreground">
                {title}
              </h2>
            </div>
          )}
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {user 
                ? "No recommendations available yet. Complete a booking to get personalized suggestions!"
                : "Sign in to see personalized recommendations based on your bookings."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {showTitle && (
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-3xl font-bold text-foreground">
              {title}
            </h2>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recommendations.map((listing) => {
            const favorite = isFavorite(listing.id, listing.category);
            
            return (
              <div
                key={listing.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/${listing.category}s/${listing.id}`)}
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all duration-300">
                  {/* Image */}
                  <div className="relative h-64 overflow-hidden">
                    {listing.image ? (
                      <img
                        src={listing.image}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = '/fallback.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(listing);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-lg"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          favorite
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>

                    {/* Recommendation Badge */}
                    {listing.recommendationReason && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-primary/90 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Recommended
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-lg font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{listing.location}</span>
                        </p>
                      </div>
                    </div>

                    {/* Rating */}
                    {listing.rating > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-foreground">
                          {listing.rating.toFixed(1)}
                        </span>
                        {listing.reviewCount > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({listing.reviewCount})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <div>
                        <span className="text-lg font-bold text-foreground">
                          ₱{listing.price.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">/night</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full capitalize">
                        {listing.category}
                      </span>
                    </div>

                    {/* Recommendation Reason (tooltip on hover) */}
                    {listing.recommendationReason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {listing.recommendationReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Recommendations;

