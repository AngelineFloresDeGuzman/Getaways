import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import SearchBar from "@/components/SearchBar";
import Recommendations from "@/components/Recommendations";
import { Sparkles, Clock, MapPin, Star, Heart, Share2, X } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import LogIn from "@/pages/Auth/LogIn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";
import FavoriteButton from "@/components/FavoriteButton";

const Services = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/services/${activeShare}`;
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recommended');
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    when: searchParams.get('when') || '',
    serviceType: searchParams.get('serviceType') || ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load services from Firestore
  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        console.log('📦 Services: Loading published listings...');
        
        // Query listings collection for active services
        const listingsRef = collection(db, 'listings');
        
        // Try with orderBy first, fallback without if index missing
        let querySnapshot;
        try {
          const q = query(
            listingsRef,
            where('category', '==', 'service'),
            where('status', '==', 'active'),
            orderBy('publishedAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch (indexError) {
          console.warn('⚠️ Index error (expected on first use), trying without orderBy:', indexError.message);
          try {
            // Fallback: query without orderBy
            const q = query(
              listingsRef,
              where('category', '==', 'service'),
              where('status', '==', 'active')
            );
            querySnapshot = await getDocs(q);
          } catch (indexError2) {
            console.warn('⚠️ Index error for status filter, querying by category only:', indexError2.message);
            // Final fallback: query by category only, filter status in JavaScript
            const q = query(
              listingsRef,
              where('category', '==', 'service')
            );
            querySnapshot = await getDocs(q);
          }
        }
        
        // Map all services with Firestore data
        const allServicesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const locationData = data.locationData || {};
          const photosData = data.photos || [];
          
          // Format location display
          const location = data.location || 
            (locationData.city && locationData.province 
              ? `${locationData.city}, ${locationData.province}`
              : locationData.city || locationData.country || 'No location');
          
          // Get main price
          const price = data.price || 0;
          
          // Get image
          const image = (() => {
            const firstPhoto = photosData[0];
            if (firstPhoto?.base64) return firstPhoto.base64;
            if (firstPhoto?.url) return firstPhoto.url;
            if (data.image) return data.image;
            return "fallback.jpg";
          })();
          
          return {
            id: doc.id,
            title: data.title || 'Untitled Service',
            description: data.description || '',
            location: location,
            locationData: locationData,
            price: price,
            rating: data.rating || 0,
            reviews: data.reviews || 0,
            image: image,
            category: data.serviceCategory || data.category || 'Service',
            provider: data.ownerName || data.ownerEmail?.split('@')[0] || 'Provider',
            duration: data.duration || data.serviceDuration || '1 hour',
            status: data.status,
            publishedAt: data.publishedAt,
            createdAt: data.createdAt
          };
        });
        
        // Filter by status if we had to query without status filter
        const servicesData = allServicesData.filter(svc => svc.status === 'active');
        
        // Sort manually if orderBy failed
        if (servicesData.length > 0) {
          servicesData.sort((a, b) => {
            const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
            const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
            return bDate - aDate; // Descending
          });
        }
        
        console.log('✅ Services: Loaded', servicesData.length, 'listings');
        setServices(servicesData);
        setFilteredServices(servicesData);
      } catch (error) {
        console.error('❌ Error loading services:', error);
        setServices([]);
        setFilteredServices([]);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);


  // Update filters when URL params change
  useEffect(() => {
    setFilters({
      location: searchParams.get('location') || '',
      when: searchParams.get('when') || '',
      serviceType: searchParams.get('serviceType') || ''
    });
  }, [searchParams]);

  // Extract unique categories from loaded services
  const categories = ["All Services", ...new Set(services.map(svc => svc.category).filter(Boolean))];
  const [selectedCategory, setSelectedCategory] = useState("All Services");

  // Update filtered services when filters or category changes
  useEffect(() => {
    let filtered = [...services];
    
    // Filter by category (from selectedCategory button)
    if (selectedCategory !== "All Services") {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }
    
    // Filter by serviceType (from search bar)
    if (filters.serviceType) {
      filtered = filtered.filter(service => service.category === filters.serviceType);
    }
    
    // Filter by location - improved matching
    if (filters.location) {
      const locationLower = filters.location.toLowerCase().trim();
      // Split search term to check individual parts
      const searchParts = locationLower.split(',').map(part => part.trim()).filter(Boolean);
      
      filtered = filtered.filter(service => {
        const serviceLocation = (service.location || '').toLowerCase();
        const city = (service.locationData?.city || '').toLowerCase();
        const province = (service.locationData?.province || '').toLowerCase();
        const country = (service.locationData?.country || '').toLowerCase();
        
        // Create a combined location string for matching
        const combinedLocation = [
          city,
          province,
          country,
          serviceLocation
        ].filter(Boolean).join(', ').toLowerCase();
        
        // Check if search term matches the combined location
        if (combinedLocation.includes(locationLower)) {
          return true;
        }
        
        // Also check if any part of the search matches any part of the location
        const locationParts = combinedLocation.split(',').map(part => part.trim());
        return searchParts.some(searchPart => 
          locationParts.some(locPart => locPart.includes(searchPart) || searchPart.includes(locPart))
        );
      });
    }
    
    // Apply sorting
    let sorted = [...filtered];
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating-high':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'recommended':
      default:
        // Sort by published date (newest first) as recommended
        sorted.sort((a, b) => {
          const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
          const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
          return bDate - aDate;
        });
        break;
    }
    
    setFilteredServices(sorted);
  }, [services, selectedCategory, filters, sortBy]);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowCollectionModal(true);
  };

  const toggleFavorite = (item, type) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const storageKey = `favorites_${user.uid}`;
    const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
    const isAlreadyFavorite = storedFavorites.some(fav => fav.id === item.id && fav.type === type);
    
    const updatedFavorites = isAlreadyFavorite
      ? storedFavorites.filter(fav => !(fav.id === item.id && fav.type === type))
      : [...storedFavorites, { ...item, type }];

    setFavoriteItems(updatedFavorites);
    localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
        detail: { favorites: updatedFavorites, userId: user.uid }
    }));
  };

  useEffect(() => {
    if (!user) return;

    const loadFavorites = () => {
      const storageKey = `favorites_${user.uid}`;
      const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
      setFavoriteItems(storedFavorites);
    };

    loadFavorites();

    const handleStorage = (e) => {
      if (e.key === `favorites_${user.uid}`) {
        loadFavorites();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* ✅ Real Login Modal (uses existing LogIn.jsx) */}
      {showLoginModal && (
        <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />
      )}

      <section className="pt-36 pb-12 px-6 bg-gradient-to-br from-secondary/20 to-accent/20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-4 animate-fade-in">
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
              Premium <span className="text-primary">Services</span>
            </h1>
          </div>
          <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Enhance your stay with personalized services from local professionals
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="py-8 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <SearchBar category="service" />
        </div>
      </section>


      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <Loading message="Loading services..." />
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <p className="font-body text-muted-foreground">
                  {filteredServices.length} services available
                  {filters.location && ` in ${filters.location}`}
                </p>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="recommended">Sort by: Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating-high">Rating: High to Low</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {filteredServices.map((service, index) => (
              <div
                key={service.id}
                className="card-listing hover-lift cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/services/${service.id}`)} // move navigation here
              >
                <div className="relative overflow-hidden rounded-t-2xl">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />

                  {/* Favorite and Share buttons */}
                  <div
                    className="absolute top-4 right-4 flex gap-2"
                    onClick={(e) => e.stopPropagation()} // stops card navigation
                  >
                    <FavoriteButton
                      item={{ ...(service || {}), type: "service" }}
                      user={user}
                      isFavorite={favoriteItems.some(
                        fav => service && fav && fav.id === service.id && fav.type === "service"
                      )}
                      onRequireLogin={() => setShowLoginModal(true)}
                      onToggle={() => toggleFavorite(service, "service")}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShare(service.id);
                      }}
                      className="p-2 bg-white/90 rounded-full hover:bg-white hover:scale-110 transition-all"
                    >
                      <Share2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                    {service.title}
                  </h3>
                  <p className="font-body text-primary font-medium mb-1">
                    by {service.provider}
                  </p>
                  <p className="font-body text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {service.location}
                  </p>

                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-sm">{service.rating}</span>
                    <span className="text-muted-foreground text-sm">({service.reviews})</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{service.duration}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="font-heading text-2xl font-bold text-foreground">
                        ₱{service.price.toLocaleString()}
                      </span>
                      <span className="font-body text-muted-foreground"> / session</span>
                    </div>
                    <button className="btn-primary">Book Service</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

              {filteredServices.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No services found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
                </div>
              )}

              {filteredServices.length > 0 && (
                <div className="text-center mt-12">
                  <button className="btn-outline px-8 py-3">Load More Services</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 🔗 Share Popup Modal */}
      {activeShare && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setActiveShare(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ❌ X Button */}
            <button
              onClick={() => setActiveShare(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <h2 className="text-xl font-heading font-bold mb-4">
              Share this Service
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share on or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              {/** All buttons: same size, fully rounded */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                title="Share on Facebook"
              >
                <FontAwesomeIcon icon={faFacebookF} className="w-5 h-5" />
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
                title="Share on X"
              >
                <FontAwesomeIcon icon={faXTwitter} className="w-5 h-5" />
              </a>

              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
                title="Share on Instagram"
              >
                <FontAwesomeIcon icon={faInstagram} className="w-5 h-5" />
              </a>

              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(`${window.location.origin}/services/${activeShare}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                title="Share on Messenger"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} className="w-5 h-5" />
              </a>

              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "Check out this service on Getaways!",
                        text: "Explore this amazing service!",
                        url: `${window.location.origin}/services/${activeShare}`,
                      });
                    } catch (error) {
                      console.error("Share cancelled or failed:", error);
                    }
                  } else {
                    alert("Sharing via device apps is not supported on this browser.");
                  }
                }}
                className="flex items-center justify-center w-12 h-12 bg-gray-300 text-gray-800 rounded-full hover:bg-gray-400 transition"
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
                  value={shareUrl}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000); // hide after 2 seconds
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

      {/* Recommendations Section */}
      <Recommendations 
        title="Recommended Services for You" 
        showTitle={true} 
        limit={12}
        category="service"
      />

      <Footer />
    </div>
  );
};

export default Services;
