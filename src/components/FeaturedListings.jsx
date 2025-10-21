import React, { useState } from "react";
import { Heart, Star, MapPin, Share2 } from 'lucide-react';

const FeaturedListings = () => {
    const [favorites, setFavorites] = useState([]);
    // TODO: This will be populated dynamically from API/database
    const listings = [];

    const toggleFavorite = (listingId) => {
        setFavorites(prev => prev.includes(listingId)
            ? prev.filter(id => id !== listingId)
            : [...prev, listingId]);
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
                    <button className="btn-outline mt-6 md:mt-0 self-start">
                        View All Listings
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {listings.length > 0 ? (
                        listings.map((listing, index) => (
                            <div
                                key={listing.id}
                                className="card-listing hover-lift animate-slide-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <img
                                        src={listing.image}
                                        alt={listing.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getCategoryColor(listing.category)}`}>
                                        {listing.category}
                                    </div>
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <button
                                            onClick={() => toggleFavorite(listing.id)}
                                            className={`p-2 rounded-full bg-white/90 hover:bg-white transition-all ${favorites.includes(listing.id) ? 'text-red-500' : 'text-gray-600'}`}
                                        >
                                            <Heart className={`w-4 h-4 ${favorites.includes(listing.id) ? 'fill-current' : ''}`} />
                                        </button>
                                        <button className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 transition-all">
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

                                    <div className="flex items-center gap-1 mb-3">
                                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                        <span className="font-body text-sm font-semibold">{listing.rating}</span>
                                        <span className="font-body text-sm text-muted-foreground">
                                            ({listing.reviewCount} reviews)
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {listing.amenities.slice(0, 3).map((amenity) => (
                                            <span
                                                key={amenity}
                                                className="font-body text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                                            >
                                                {amenity}
                                            </span>
                                        ))}
                                        {listing.amenities.length > 3 && (
                                            <span className="font-body text-xs text-muted-foreground px-2 py-1">
                                                +{listing.amenities.length - 3} more
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-heading text-2xl font-bold text-foreground">
                                                ${listing.price}
                                            </span>
                                            <span className="font-body text-muted-foreground"> / night</span>
                                        </div>
                                        <span className="font-body text-xs text-muted-foreground">
                                            by {listing.host}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Placeholder for empty listings */
                        <div className="col-span-full text-center py-16">
                            <p className="text-muted-foreground">Featured listings will be loaded dynamically</p>
                        </div>
                    )}
                </div>

                <div className="text-center mt-16 animate-fade-in">
                    <p className="font-body text-muted-foreground mb-6">
                        Discover thousands more listings around the world
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="btn-primary">Explore All Accommodations</button>
                        <button className="btn-secondary">Browse Services & Experiences</button>
                    </div>
                </div>
            </div>
        </section>
    );
};
export default FeaturedListings;
