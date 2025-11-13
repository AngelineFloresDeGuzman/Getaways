import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from '@/components/Navigation';
import { calculateTotalPrice } from '@/pages/Guest/services/bookingService';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import Recommendations from '@/components/Recommendations';
import { Search, MapPin, Calendar, Users, Filter, Share2, Star, X } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import SearchBar from '@/components/SearchBar';
import LogIn from "@/pages/Auth/LogIn";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";

const Accommodations = () => {
    const [searchParams] = useSearchParams();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [user, setUser] = useState(null);
    const [activeShare, setActiveShare] = useState(null);
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [accommodations, setAccommodations] = useState([]);
    const [filteredAccommodations, setFilteredAccommodations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('recommended');
    
    // Search filters from URL
    const [filters, setFilters] = useState({
        location: searchParams.get('location') || '',
        checkIn: searchParams.get('checkIn') || '',
        checkOut: searchParams.get('checkOut') || '',
        guests: searchParams.get('guests') || '',
        adults: searchParams.get('adults') || '',
        children: searchParams.get('children') || '',
        infants: searchParams.get('infants') || '',
        pets: searchParams.get('pets') || '',
        monthFrom: searchParams.get('monthFrom') || '',
        monthTo: searchParams.get('monthTo') || '',
        flexibleOption: searchParams.get('flexibleOption') || '',
        flexibleMonth: searchParams.get('flexibleMonth') || ''
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Load accommodations from Firestore
    useEffect(() => {
        const loadAccommodations = async () => {
            try {
                setLoading(true);
                console.log('📦 Accommodations: Loading published listings...');
                
                // Query listings collection for active accommodations
                const listingsRef = collection(db, 'listings');
                
                // Try with orderBy first, fallback without if index missing
                let querySnapshot;
                try {
                    const q = query(
                        listingsRef,
                        where('category', '==', 'accommodation'),
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
                            where('category', '==', 'accommodation'),
                            where('status', '==', 'active')
                        );
                        querySnapshot = await getDocs(q);
                    } catch (indexError2) {
                        console.warn('⚠️ Index error for status filter, querying by category only:', indexError2.message);
                        // Final fallback: query by category only, filter status in JavaScript
                        const q = query(
                            listingsRef,
                            where('category', '==', 'accommodation')
                        );
                        querySnapshot = await getDocs(q);
                    }
                }
                
                // Map all accommodations with ALL available Firebase data
                const allAccommodationsData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const locationData = data.locationData || {};
                    const pricing = data.pricing || {};
                    const propertyBasics = data.propertyBasics || {};
                    const amenities = data.amenities || {};
                    
                    // Format location display
                    const location = data.location || 
                        (locationData.city && locationData.province 
                            ? `${locationData.city}, ${locationData.province}`
                            : locationData.city || locationData.country || 'No location');
                    
                    // Get main price (weekday price as default)
                                        // Use calculateTotalPrice for accurate price display (matches booking-request)
                                        let price = 0;
                                        if (filters.checkIn && filters.checkOut && pricing) {
                                            price = calculateTotalPrice(pricing, filters.checkIn, filters.checkOut, filters.guests || 1);
                                        } else {
                                            price = pricing.weekdayPrice || pricing.basePrice || 0;
                                        }
                    
                    // Flatten amenities for display (combine all categories)
                    const amenitiesList = [
                        ...(amenities.favorites || []),
                        ...(amenities.standout || []),
                        ...(amenities.safety || [])
                    ];
                    
                    // Debug: Log photos data for this accommodation
                    const photosData = data.photos || [];
                    const firstPhoto = photosData[0];
                    console.log(`📸 Accommodations: Listing ${doc.id} - Photos:`, {
                        photosCount: photosData.length,
                        firstPhoto: firstPhoto ? {
                            id: firstPhoto.id,
                            name: firstPhoto.name,
                            hasBase64: !!firstPhoto.base64,
                            hasUrl: !!firstPhoto.url,
                            base64Length: firstPhoto.base64 ? firstPhoto.base64.length : 0,
                            allKeys: Object.keys(firstPhoto)
                        } : 'no first photo',
                        imageField: data.image,
                        hasImageField: !!data.image
                    });
                    
                    return {
                        id: doc.id,
                        // Core info
                        title: data.title || 'Untitled Listing',
                        description: data.description || '',
                        descriptionHighlights: data.descriptionHighlights || [],
                        location: location,
                        locationData: locationData,
                        price: price,
                        rating: data.rating || 0,
                        reviews: data.reviews || 0,
                        // Images - ensure we always have a valid image URL
                        image: (() => {
                          // Try to get image from photos array first
                          const firstPhoto = photosData[0];
                          if (firstPhoto?.base64) {
                            return firstPhoto.base64;
                          }
                          if (firstPhoto?.url) {
                            return firstPhoto.url;
                          }
                          // Fallback to top-level image field
                          if (data.image) {
                            return data.image;
                          }
                          // Final fallback
                          return "fallback.jpg";
                        })(),
                        images: photosData.map(p => p.base64 || p.url).filter(Boolean) || data.images || [],
                        photos: photosData,
                        // Property details
                        propertyBasics: propertyBasics,
                        bedrooms: propertyBasics.bedrooms || 0,
                        bathrooms: propertyBasics.bathrooms || 0,
                        beds: propertyBasics.beds || 0,
                        maxGuests: propertyBasics.guestCapacity || propertyBasics.guests || 0,
                        // Property type info
                        privacyType: data.privacyType || '',
                        propertyStructure: data.propertyStructure || '',
                        // Amenities
                        amenities: amenities,
                        amenitiesList: amenitiesList,
                        features: amenitiesList.length > 0 ? amenitiesList.slice(0, 4) : (data.descriptionHighlights || []).slice(0, 4), // Show first 4 as features
                        // Pricing details
                        pricing: pricing,
                        weekdayPrice: pricing.weekdayPrice || price,
                        weekendPrice: pricing.weekendPrice || price,
                        // Discounts
                        discounts: data.discounts || {},
                        // Booking info
                        bookingSettings: data.bookingSettings || {},
                        guestSelection: data.guestSelection || {},
                        instantBook: data.guestSelection === 'instant-book',
                        // Safety & details
                        safetyDetails: data.safetyDetails || [],
                        finalDetails: data.finalDetails || {},
                        // Host info
                        ownerId: data.ownerId,
                        ownerEmail: data.ownerEmail,
                        // Meta
                        type: "accommodation",
                        status: data.status,
                        publishedAt: data.publishedAt,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                        imageIndex: data.imageIndex
                        // Note: subscription info is now in user.payment field map, not in listing
                    };
                });
                
                // Filter by status if we had to query without status filter
                const accommodationsData = allAccommodationsData.filter(acc => acc.status === 'active');
                
                // Sort manually if orderBy failed
                if (accommodationsData.length > 0) {
                    accommodationsData.sort((a, b) => {
                        const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
                        const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
                        return bDate - aDate; // Descending
                    });
                }
                
                console.log('✅ Accommodations: Loaded', accommodationsData.length, 'listings');
                console.log('📋 Accommodations data:', accommodationsData);
                setAccommodations(accommodationsData);
                setFilteredAccommodations(accommodationsData);
            } catch (error) {
                console.error('❌ Error loading accommodations:', error);
                console.error('Error details:', error.code, error.message);
                setAccommodations([]);
                setFilteredAccommodations([]);
            } finally {
                setLoading(false);
            }
        };

        loadAccommodations();
    }, []);

    // Update filters when URL params change
    useEffect(() => {
        const newFilters = {
            location: searchParams.get('location') || '',
            checkIn: searchParams.get('checkIn') || '',
            checkOut: searchParams.get('checkOut') || '',
            guests: searchParams.get('guests') || '',
            adults: searchParams.get('adults') || '',
            children: searchParams.get('children') || '',
            infants: searchParams.get('infants') || '',
            pets: searchParams.get('pets') || '',
            monthFrom: searchParams.get('monthFrom') || '',
            monthTo: searchParams.get('monthTo') || '',
            flexibleOption: searchParams.get('flexibleOption') || '',
            flexibleMonth: searchParams.get('flexibleMonth') || ''
        };
        setFilters(newFilters);
    }, [searchParams]);

    // Filter accommodations based on search params
    useEffect(() => {
        let filtered = [...accommodations];

        // Filter by location - improved matching
        if (filters.location) {
            const locationLower = filters.location.toLowerCase().trim();
            // Split search term to check individual parts (e.g., "Manila, Metro Manila" -> ["manila", "metro manila"])
            const searchParts = locationLower.split(',').map(part => part.trim()).filter(Boolean);
            
            filtered = filtered.filter(acc => {
                const accLocation = (acc.location || '').toLowerCase();
                const city = (acc.locationData?.city || '').toLowerCase();
                const province = (acc.locationData?.province || '').toLowerCase();
                const country = (acc.locationData?.country || '').toLowerCase();
                const barangay = (acc.locationData?.barangay || '').toLowerCase();
                
                // Create a combined location string for matching
                const combinedLocation = [
                    barangay,
                    city,
                    province,
                    country,
                    accLocation
                ].filter(Boolean).join(', ').toLowerCase();
                
                // Check if search term matches the combined location
                if (combinedLocation.includes(locationLower)) {
                    return true;
                }
                
                // Also check if any part of the search matches any part of the location
                // This handles cases like searching "Manila" when location is "Manila, Metro Manila"
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
            filtered = filtered.filter(acc => {
                const maxGuests = acc.maxGuests || acc.propertyBasics?.guestCapacity || 0;
                return maxGuests >= finalGuestCount;
            });
        }

        // Filter by dates (check availability)
        if (filters.checkIn && filters.checkOut) {
            const checkIn = new Date(filters.checkIn);
            const checkOut = new Date(filters.checkOut);
            // This would require checking against booking dates - simplified for now
            // In a real implementation, you'd query unavailable dates from bookings
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

        setFilteredAccommodations(sorted);
    }, [accommodations, filters, sortBy]);

    const handleRequireLogin = () => setShowLoginModal(true);

    useEffect(() => {
        if (user) {
            const stored = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
            setFavorites(stored);
        }
    }, [user]);

    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === `favorites_${user.uid}`) {
                setFavorites(JSON.parse(e.newValue) || []);
            }
        };
        
        const handleFavoritesChanged = (e) => {
            if (e.detail.userId === user?.uid) {
                setFavorites(e.detail.favorites);
            }
        };
        
        window.addEventListener('storage', handleStorage);
        window.addEventListener('favoritesChanged', handleFavoritesChanged);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('favoritesChanged', handleFavoritesChanged);
        };
    }, [user]);

    const toggleFavorite = (item, type) => {
        if (!user) {
            handleRequireLogin();
            return;
        }

        const storageKey = `favorites_${user.uid}`;
        let storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];

        // Check both id and type
        const isAlreadyFavorite = storedFavorites.some(
            fav => fav.id === item.id && fav.type === type
        );

        let updatedFavorites;
        if (isAlreadyFavorite) {
            updatedFavorites = storedFavorites.filter(
                fav => !(fav.id === item.id && fav.type === type)
            );
        } else {
            updatedFavorites = [...storedFavorites, { 
                ...item, 
                type 
            }];
        }

        setFavorites(updatedFavorites);
        localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
        
        // Dispatch custom event for same-tab synchronization
        window.dispatchEvent(new CustomEvent('favoritesChanged', {
            detail: { favorites: updatedFavorites, userId: user.uid }
        }));
    };

    return (
        <div className="min-h-screen bg-background">
            <Navigation />

            {/* Hero Section */}
            <section className="pt-36 pb-12 px-6 bg-gradient-to-br from-primary/20 to-secondary/20">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
                        Find Your Perfect <span className="text-primary">Accommodations</span>
                    </h1>
                    <p className="font-body text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
                        Discover unique accommodations from cozy cabins to luxury villas
                    </p>
                </div>
            </section>

            {/* Filters */}
            <section className="py-8 px-6 border-b border-border">
                <div className="max-w-7xl mx-auto">
                    <SearchBar category="accommodation" />
                </div>
            </section>

            {/* Accommodations Grid */}
            <section className="py-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <p className="font-body text-muted-foreground">
                            {loading ? 'Loading...' : `${filteredAccommodations.length} accommodations found`}
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
                        {loading ? (
                            <Loading message="Loading accommodations..." size="default" />
                        ) : accommodations.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No accommodations available yet.</p>
                            </div>
                        ) : (
                            filteredAccommodations.map((accommodation, index) => {
                            // Check if accommodation is null or undefined before accessing its properties
                            if (!accommodation) return null;
                            
                            const accommodationInFavorites = favorites?.find(fav => fav && fav.id === accommodation.id && fav.type === "accommodation");
                            // Support both old format (image field) and new format (photos array)
                            const mainImage = accommodationInFavorites?.image || 
                                            accommodation.image ||
                                            (accommodation.photos?.[0]?.base64 || accommodation.photos?.[0]?.url) ||
                                            (accommodation.images?.[0]) ||
                                            "fallback.jpg";
                            const shareUrl = `${window.location.origin}/accommodations/${accommodation.id}`;

                            return (
                                <div
                                    key={accommodation.id}
                                    className="card-listing hover-lift cursor-pointer animate-slide-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                    onClick={() => navigate(`/accommodations/${accommodation.id}`)}
                                >
                                    <div className="relative overflow-hidden rounded-t-2xl">
                                        <img
                                            src={mainImage}
                                            alt={accommodation.title}
                                            className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                                        />

                                        {/* Favorite + Share Buttons */}
                                        <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <FavoriteButton
                                                item={{ ...accommodation, type: "accommodation" }}
                                                user={user}
                                                isFavorite={favorites.some(fav => fav?.id === accommodation.id && fav?.type === "accommodation")}
                                                onRequireLogin={handleRequireLogin}
                                                onToggle={() => toggleFavorite(accommodation, "accommodation")}
                                            />
                                            <div
                                                onClick={() => setActiveShare(accommodation.id)}
                                                className="p-2 bg-white/90 rounded-full hover:bg-white hover:scale-110 transition-all cursor-pointer"
                                            >
                                                <Share2 className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                                                    {accommodation.title}
                                                </h3>
                                                <p className="font-body text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {accommodation.location}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span className="font-medium text-sm">
                                                    {accommodation.rating}
                                                </span>
                                                <span className="text-muted-foreground text-sm">
                                                    ({accommodation.reviews})
                                                </span>
                                            </div>
                                        </div>
                                        {/* Property Info */}
                                        {(accommodation.bedrooms > 0 || accommodation.bathrooms > 0 || accommodation.maxGuests > 0) && (
                                            <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
                                                {accommodation.bedrooms > 0 && <span>{accommodation.bedrooms} {accommodation.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</span>}
                                                {accommodation.bathrooms > 0 && <span>•</span>}
                                                {accommodation.bathrooms > 0 && <span>{accommodation.bathrooms} {accommodation.bathrooms === 1 ? 'bathroom' : 'bathrooms'}</span>}
                                                {accommodation.maxGuests > 0 && <span>•</span>}
                                                {accommodation.maxGuests > 0 && <span>Up to {accommodation.maxGuests} {accommodation.maxGuests === 1 ? 'guest' : 'guests'}</span>}
                                            </div>
                                        )}
                                        
                                        {/* Property Type Badge */}
                                        {(accommodation.privacyType || accommodation.propertyStructure) && (
                                            <div className="mb-3">
                                                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                                                    {accommodation.privacyType && accommodation.propertyStructure
                                                        ? `${accommodation.privacyType} in ${accommodation.propertyStructure}`
                                                        : accommodation.privacyType || accommodation.propertyStructure}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Features/Amenities Preview */}
                                        {accommodation.features && accommodation.features.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                                {accommodation.features.slice(0, 3).map((feature, idx) => {
                                                    const featureName = typeof feature === 'string' ? feature : (feature.name || feature);
                                                    return (
                                                <span
                                                    key={idx}
                                                            className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground capitalize"
                                                >
                                                            {typeof featureName === 'string' ? featureName.replace(/_/g, ' ') : featureName}
                                                </span>
                                                    );
                                                })}
                                        </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-heading text-2xl font-bold text-foreground">
                                                    ₱{accommodation.price.toLocaleString()}
                                                </span>
                                                <span className="font-body text-muted-foreground">
                                                    {" "} / night
                                                </span>
                                            </div>
                                            <button
                                                className="btn-primary cursor-pointer"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    navigate(`/accommodations/${accommodation.id}`);
                                                }}
                                            >
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                        )}
                    </div>

                    <div className="text-center mt-12">
                    </div>
                </div>
            </section>

            {/* Recommendations Section */}
            <Recommendations 
              title="Recommended Accommodations for You" 
              showTitle={true} 
              limit={12}
              category="accommodation"
            />

            <Footer />

            {/* Login Modal */}
            {showLoginModal && (
                <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />
            )}

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
                        <button
                            onClick={() => setActiveShare(null)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <h2 className="text-xl font-heading font-bold mb-4">
                            Share this Accommodation
                        </h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            Choose a platform to share on or copy the link below.
                        </p>

                        {/* Social Buttons */}
                        <div className="flex justify-center gap-4 mb-6 flex-wrap">
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/accommodations/${activeShare}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                                title="Share on Facebook"
                            >
                                <FontAwesomeIcon icon={faFacebookF} />
                            </a>

                            <a
                                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/accommodations/${activeShare}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
                                title="Share on X"
                            >
                                <FontAwesomeIcon icon={faXTwitter} />
                            </a>

                            <a
                                href={`https://www.instagram.com/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
                                title="Share on Instagram"
                            >
                                <FontAwesomeIcon icon={faInstagram} />
                            </a>

                            <a
                                href={`https://www.messenger.com/t/?link=${encodeURIComponent(`${window.location.origin}/accommodations/${activeShare}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                                title="Share on Messenger"
                            >
                                <FontAwesomeIcon icon={faFacebookMessenger} />
                            </a>

                            <button
                                onClick={async () => {
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({
                                                title: "Check out this accommodation!",
                                                text: "Explore this amazing accommodation!",
                                                url: `${window.location.origin}/accommodations/${activeShare}`,
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
                                    value={`${window.location.origin}/accommodations/${activeShare}`}
                                    className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/accommodations/${activeShare}`);
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

export default Accommodations;
