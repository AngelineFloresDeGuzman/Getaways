import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Star, MapPin, Share2, Camera } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const FeaturedListings = () => {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

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
        loadListings();
    }, []);

    const loadListings = async () => {
        try {
            setLoading(true);
            const listingsRef = collection(db, 'listings');
            
            // Query for active listings across all categories
            let querySnapshot;
            try {
                const q = query(
                    listingsRef,
                    where('status', '==', 'active'),
                    orderBy('publishedAt', 'desc'),
                    limit(8) // Limit to 8 featured listings
                );
                querySnapshot = await getDocs(q);
            } catch (indexError) {
                // Index error, trying without orderBy
                try {
                    const q = query(
                        listingsRef,
                        where('status', '==', 'active'),
                        limit(8)
                    );
                    querySnapshot = await getDocs(q);
                } catch (error2) {
                    // Index error for status filter, querying all
                    const q = query(listingsRef, limit(8));
                    querySnapshot = await getDocs(q);
                }
            }

            const listingsData = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const locationData = data.locationData || {};
                    const photosData = data.photos || [];
                    
                    return {
                        id: doc.id,
                        title: data.title || 'Untitled Listing',
                        location: data.location || 
                            (locationData.city && locationData.province 
                                ? `${locationData.city}, ${locationData.province}`
                                : locationData.city || locationData.country || 'No location'),
                        price: data.price || 0,
                        rating: data.rating || 0,
                        reviewCount: data.reviews || 0,
                        category: data.category || 'accommodation',
                        image: photosData[0]?.base64 || photosData[0]?.url || data.image || null,
                        amenities: [
                            ...(data.amenities?.favorites || []),
                            ...(data.amenities?.standout || []),
                            ...(data.amenities?.safety || [])
                        ].slice(0, 5),
                        host: data.ownerName || 'Host',
                        status: data.status,
                        publishedAt: data.publishedAt
                    };
                })
                .filter(listing => listing.status === 'active')
                .sort((a, b) => {
                    // Sort by publishedAt if available
                    const aDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
                    const bDate = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
                    return bDate - aDate;
                });

            setListings(listingsData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading listings:', error);
            setListings([]);
            setLoading(false);
        }
    };

    const toggleFavorite = (listing, e) => {
        e.stopPropagation();
        if (!user) {
            // Could show login modal here
            return;
        }

        const storageKey = `favorites_${user.uid}`;
        const storedFavorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        const isAlreadyFavorite = storedFavorites.some(fav => fav.id === listing.id);

        const updatedFavorites = isAlreadyFavorite
            ? storedFavorites.filter(fav => fav.id !== listing.id)
            : [...storedFavorites, { ...listing, type: listing.category }];

        localStorage.setItem(storageKey, JSON.stringify(updatedFavorites));
        setFavorites(updatedFavorites);
        
        window.dispatchEvent(new CustomEvent('favoritesChanged', {
            detail: { favorites: updatedFavorites, userId: user.uid }
        }));
    };

    const handleListingClick = (listing) => {
        const routeMap = {
            'accommodation': `/accommodations/${listing.id}`,
            'experience': `/experiences/${listing.id}`,
            'service': `/services/${listing.id}`
        };
        navigate(routeMap[listing.category] || `/accommodations/${listing.id}`);
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'accommodation': return 'text-primary bg-primary/10';
            case 'service': return 'text-secondary bg-secondary/10';
            case 'experience': return 'text-accent bg-accent/10';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    return (
        <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
                    <div className="animate-fade-in">
                        <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Featured Listings
                        </h2>
                        <p className="font-body text-xl text-muted-foreground">
                            Handpicked accommodations, services, and experiences
                        </p>
                    </div>
                    <button 
                        onClick={() => navigate('/accommodations')}
                        className="btn-outline mt-6 md:mt-0 self-start"
                    >
                        View All Listings
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {loading ? (
                        <div className="col-span-full text-center py-16">
                            <p className="text-muted-foreground">Loading featured listings...</p>
                        </div>
                    ) : listings.length > 0 ? (
                        listings.map((listing, index) => {
                            const isFavorite = favorites.some(fav => fav.id === listing.id);
                            return (
                                <div
                                    key={listing.id}
                                    onClick={() => handleListingClick(listing)}
                                    className="card-listing hover-lift animate-slide-up cursor-pointer"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="relative h-64 overflow-hidden rounded-t-lg">
                                        {listing.image ? (
                                            <img
                                                src={listing.image}
                                                alt={listing.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${listing.image ? 'hidden' : ''}`}>
                                            <Camera className="w-12 h-12 text-gray-400" />
                                        </div>
                                        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getCategoryColor(listing.category)}`}>
                                            {listing.category}
                                        </div>
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            <button
                                                onClick={(e) => toggleFavorite(listing, e)}
                                                className={`p-2 rounded-full bg-white/90 hover:bg-white transition-all ${isFavorite ? 'text-red-500' : 'text-gray-600'}`}
                                            >
                                                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                                            </button>
                                            <button 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 transition-all"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="mb-3">
                                            <h3 className="font-heading text-xl font-semibold text-foreground mb-1 line-clamp-1">
                                                {listing.title}
                                            </h3>
                                            <p className="font-body text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {listing.location}
                                            </p>
                                        </div>

                                        {listing.rating > 0 && (
                                            <div className="flex items-center gap-1 mb-3">
                                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                                <span className="font-body text-sm font-semibold">{listing.rating}</span>
                                                {listing.reviewCount > 0 && (
                                                    <span className="font-body text-sm text-muted-foreground">
                                                        ({listing.reviewCount} reviews)
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {listing.amenities && listing.amenities.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {listing.amenities.slice(0, 3).map((amenity, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="font-body text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                                                    >
                                                        {typeof amenity === 'string' ? amenity : amenity.name || amenity}
                                                    </span>
                                                ))}
                                                {listing.amenities.length > 3 && (
                                                    <span className="font-body text-xs text-muted-foreground px-2 py-1">
                                                        +{listing.amenities.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-heading text-2xl font-bold text-foreground">
                                                    ₱{listing.price.toLocaleString()}
                                                </span>
                                                <span className="font-body text-muted-foreground"> / night</span>
                                            </div>
                                            <span className="font-body text-xs text-muted-foreground">
                                                by {listing.host}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-16">
                            <p className="text-muted-foreground">No featured listings available at the moment</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
export default FeaturedListings;
