import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import SearchBar from "@/components/SearchBar";
import Recommendations from "@/components/Recommendations";
import { Mountain, Clock, MapPin, Star, Share2, Users, X } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import LogIn from "@/pages/Auth/LogIn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";

const Experiences = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [filteredExperiences, setFilteredExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Experiences");
  const [sortBy, setSortBy] = useState('recommended');
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    when: searchParams.get('when') || '',
    guests: searchParams.get('guests') || '',
    adults: searchParams.get('adults') || '',
    children: searchParams.get('children') || '',
    infants: searchParams.get('infants') || ''
  });
  const [unavailableListings, setUnavailableListings] = useState(new Set());
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

  // Load experiences from Firestore
  useEffect(() => {
    const loadExperiences = async () => {
      try {
        setLoading(true);
        console.log('📦 Experiences: Loading published listings...');
        
        // Query listings collection for active experiences
        const listingsRef = collection(db, 'listings');
        
        // Try with orderBy first, fallback without if index missing
        let querySnapshot;
        try {
          const q = query(
            listingsRef,
            where('category', '==', 'experience'),
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
              where('category', '==', 'experience'),
              where('status', '==', 'active')
            );
            querySnapshot = await getDocs(q);
          } catch (indexError2) {
            console.warn('⚠️ Index error for status filter, querying by category only:', indexError2.message);
            // Final fallback: query by category only, filter status in JavaScript
            const q = query(
              listingsRef,
              where('category', '==', 'experience')
            );
            querySnapshot = await getDocs(q);
          }
        }
        
        // Map all experiences with Firestore data
        const allExperiencesData = querySnapshot.docs.map(doc => {
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
            title: data.title || 'Untitled Experience',
            description: data.description || '',
            location: location,
            locationData: locationData,
            price: price,
            rating: data.rating || 0,
            reviews: data.reviews || 0,
            image: image,
            category: data.experienceCategory || data.category || 'Experience',
            host: data.ownerName || data.ownerEmail?.split('@')[0] || 'Host',
            duration: data.duration || data.experienceDuration || '2 hours',
            groupSize: data.maxParticipants || data.maxGuests || 'Up to 10',
            maxParticipants: data.maxParticipants || data.maxGuests || 10,
            status: data.status,
            publishedAt: data.publishedAt,
            createdAt: data.createdAt
          };
        });
        
        // Filter by status if we had to query without status filter
        const experiencesData = allExperiencesData.filter(exp => exp.status === 'active');
        
        // Sort manually if orderBy failed
        if (experiencesData.length > 0) {
          experiencesData.sort((a, b) => {
            const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
            const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
            return bDate - aDate; // Descending
          });
        }
        
        console.log('✅ Experiences: Loaded', experiencesData.length, 'listings');
        setExperiences(experiencesData);
        setFilteredExperiences(experiencesData);
      } catch (error) {
        console.error('❌ Error loading experiences:', error);
        setExperiences([]);
        setFilteredExperiences([]);
      } finally {
        setLoading(false);
      }
    };

    loadExperiences();
  }, []);


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

  // Update filters when URL params change
  useEffect(() => {
    setFilters({
      location: searchParams.get('location') || '',
      checkIn: searchParams.get('checkIn') || '',
      checkOut: searchParams.get('checkOut') || '',
      when: searchParams.get('when') || '',
      guests: searchParams.get('guests') || '',
      adults: searchParams.get('adults') || '',
      children: searchParams.get('children') || '',
      infants: searchParams.get('infants') || ''
    });
  }, [searchParams]);

  // Load unavailable listings based on date filters
  useEffect(() => {
    const loadUnavailableListings = async () => {
      if (!filters.checkIn || !filters.checkOut) {
        setUnavailableListings(new Set());
        return;
      }

      try {
        const checkIn = new Date(filters.checkIn);
        const checkOut = new Date(filters.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);

        // Generate all dates in the search range
        // For same-day bookings (checkIn = checkOut), include the check-in date
        const searchDates = new Set();
        const currentDate = new Date(checkIn);
        // If check-in and check-out are the same, include that single date
        if (checkIn.getTime() === checkOut.getTime()) {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          searchDates.add(dateStr);
        } else {
          // For date ranges, include all dates from check-in (inclusive) to check-out (exclusive)
          while (currentDate < checkOut) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            searchDates.add(dateStr);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // Get all confirmed bookings for experiences
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('category', '==', 'experience'),
          where('status', '==', 'confirmed')
        );
        const querySnapshot = await getDocs(q);

        // Map listing IDs to their unavailable dates
        const listingUnavailableDates = new Map();
        
        querySnapshot.forEach((doc) => {
          const booking = doc.data();
          const listingId = booking.listingId;
          const existingCheckIn = booking.checkInDate?.toDate ? booking.checkInDate.toDate() : new Date(booking.checkInDate);
          const existingCheckOut = booking.checkOutDate?.toDate ? booking.checkOutDate.toDate() : new Date(booking.checkOutDate);
          
          existingCheckIn.setHours(0, 0, 0, 0);
          existingCheckOut.setHours(0, 0, 0, 0);

          // Generate all unavailable dates for this booking
          const bookingDate = new Date(existingCheckIn);
          while (bookingDate < existingCheckOut) {
            const dateStr = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
            
            if (!listingUnavailableDates.has(listingId)) {
              listingUnavailableDates.set(listingId, new Set());
            }
            listingUnavailableDates.get(listingId).add(dateStr);
            
            bookingDate.setDate(bookingDate.getDate() + 1);
          }
        });

        // Check if any search date is unavailable for each listing
        const unavailable = new Set();
        listingUnavailableDates.forEach((unavailableDates, listingId) => {
          // Check if any date in search range is unavailable
          for (const searchDate of searchDates) {
            if (unavailableDates.has(searchDate)) {
              unavailable.add(listingId);
              break; // No need to check other dates for this listing
            }
          }
        });

        setUnavailableListings(unavailable);
      } catch (error) {
        console.error('Error loading unavailable listings:', error);
        setUnavailableListings(new Set());
      }
    };

    loadUnavailableListings();
  }, [filters.checkIn, filters.checkOut]);

  // Extract unique categories from loaded experiences
  const categories = ["All Experiences", ...new Set(experiences.map(exp => exp.category).filter(Boolean))];

  // Update filtered experiences when filters or category changes
  useEffect(() => {
    let filtered = [...experiences];
    
    // Filter by category
    if (selectedCategory !== "All Experiences") {
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    
    // Filter by location - improved matching
    if (filters.location) {
      const locationLower = filters.location.toLowerCase().trim();
      // Split search term to check individual parts
      const searchParts = locationLower.split(',').map(part => part.trim()).filter(Boolean);
      
      filtered = filtered.filter(exp => {
        const expLocation = (exp.location || '').toLowerCase();
        const city = (exp.locationData?.city || '').toLowerCase();
        const province = (exp.locationData?.province || '').toLowerCase();
        const country = (exp.locationData?.country || '').toLowerCase();
        
        // Create a combined location string for matching
        const combinedLocation = [
          city,
          province,
          country,
          expLocation
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
    
    // Filter by guest capacity (check total guests from adults, children, infants)
    const totalGuests = (parseInt(filters.adults || '1', 10) || 1) + 
                       (parseInt(filters.children || '0', 10) || 0) + 
                       (parseInt(filters.infants || '0', 10) || 0);
    
    // Also check if guests param exists (for backward compatibility)
    const guestParam = parseInt(filters.guests || '0', 10);
    const finalGuestCount = guestParam > 0 ? guestParam : totalGuests;
    
    if (finalGuestCount > 0) {
      filtered = filtered.filter(exp => {
        if (exp.maxParticipants) {
          return exp.maxParticipants >= finalGuestCount;
        }
        return true;
      });
    }

    // Filter by dates (check availability) - only filter if dates are provided
    if (filters.checkIn && filters.checkOut) {
      filtered = filtered.filter(exp => {
        // Exclude listings that are unavailable for the selected dates
        return !unavailableListings.has(exp.id);
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
    
    setFilteredExperiences(sorted);
  }, [experiences, selectedCategory, filters, sortBy, unavailableListings]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <section className="pt-36 pb-12 px-6 bg-gradient-to-br from-muted/20 to-primary/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-4 animate-fade-in">
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground">
              Unique <span className="text-primary">Experiences</span>
            </h1>
          </div>
          <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Discover unforgettable activities and local adventures crafted by passionate hosts
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="py-8 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <SearchBar category="experience" />
        </div>
      </section>


      {/* Experience Cards */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <Loading message="Loading experiences..." />
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <p className="font-body text-muted-foreground">
                  {filteredExperiences.length} experiences available
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
                        ₱{experience.price.toLocaleString()}
                      </span>
                      <span className="font-body text-muted-foreground"> / person</span>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/experiences/${experience.id}`);
                      }}
                    >
                      Book Experience
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

              {filteredExperiences.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Mountain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No experiences found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
                </div>
              )}

              {filteredExperiences.length > 0 && (
                <div className="text-center mt-12">
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Recommendations Section */}
      <Recommendations 
        title="Recommended Experiences for You" 
        showTitle={true} 
        limit={12}
        category="experience"
      />

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
                        title: "Check out this experience on Getaways!",
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
