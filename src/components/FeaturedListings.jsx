import React, { useState } from "react";

import { Heart, Star, MapPin, Share2 } from 'lucide-react';
const FeaturedListings = () => {
    const [favorites, setFavorites] = useState([]);
    const listings = [
        {
            id: '1',
            title: 'Luxury Mountain Retreat',
            location: 'Aspen, Colorado',
            price: 450,
            rating: 4.9,
            reviewCount: 127,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
            category: 'accommodation',
            amenities: ['WiFi', 'Pool', 'Kitchen', 'Parking'],
            host: 'Sarah Johnson'
        },
        {
            id: '2',
            title: 'Private Spa Experience',
            location: 'Napa Valley, California',
            price: 200,
            rating: 5.0,
            reviewCount: 89,
            image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop',
            category: 'service',
            amenities: ['Massage', 'Sauna', 'Aromatherapy', 'Meditation'],
            host: 'Wellness Center'
        },
        {
            id: '3',
            title: 'Wine Tasting Adventure',
            location: 'Tuscany, Italy',
            price: 120,
            rating: 4.8,
            reviewCount: 203,
            image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop',
            category: 'experience',
            amenities: ['Expert Guide', 'Transportation', 'Lunch', 'Certificates'],
            host: 'Marco Vitelli'
        },
        {
            id: '4',
            title: 'Oceanfront Villa',
            location: 'Malibu, California',
            price: 750,
            rating: 4.9,
            reviewCount: 156,
            image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&h=600&fit=crop',
            category: 'accommodation',
            amenities: ['Beach Access', 'Pool', 'Chef', 'Gym'],
            host: 'Michael Chen'
        }
    ];
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
    return (React.createElement("section", { className: "py-20 px-6" },
        React.createElement("div", { className: "max-w-7xl mx-auto" },
            React.createElement("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between mb-12" },
                React.createElement("div", { className: "animate-fade-in" },
                    React.createElement("h2", { className: "font-heading text-4xl md:text-5xl font-bold text-foreground mb-4" }, "Featured Listings"),
                    React.createElement("p", { className: "font-body text-xl text-muted-foreground" }, "Handpicked accommodations, services, and experiences")),
                React.createElement("button", { className: "btn-outline mt-6 md:mt-0 self-start" }, "View All Listings")),
            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" }, listings.map((listing, index) => (React.createElement("div", { key: listing.id, className: "card-listing hover-lift animate-slide-up", style: { animationDelay: `${index * 100}ms` } },
                React.createElement("div", { className: "relative h-64 overflow-hidden" },
                    React.createElement("img", { src: listing.image, alt: listing.title, className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" }),
                    React.createElement("div", { className: `absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getCategoryColor(listing.category)}` }, listing.category),
                    React.createElement("div", { className: "absolute top-3 right-3 flex gap-2" },
                        React.createElement("button", { onClick: () => toggleFavorite(listing.id), className: `p-2 rounded-full bg-white/90 hover:bg-white transition-all ${favorites.includes(listing.id) ? 'text-red-500' : 'text-gray-600'}` },
                            React.createElement(Heart, { className: `w-4 h-4 ${favorites.includes(listing.id) ? 'fill-current' : ''}` })),
                        React.createElement("button", { className: "p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 transition-all" },
                            React.createElement(Share2, { className: "w-4 h-4" })))),
                React.createElement("div", { className: "p-6" },
                    React.createElement("div", { className: "mb-3" },
                        React.createElement("h3", { className: "font-heading text-xl font-semibold text-foreground mb-1 line-clamp-1" }, listing.title),
                        React.createElement("p", { className: "font-body text-muted-foreground flex items-center gap-1" },
                            React.createElement(MapPin, { className: "w-4 h-4" }),
                            listing.location)),
                    React.createElement("div", { className: "flex items-center gap-1 mb-3" },
                        React.createElement(Star, { className: "w-4 h-4 text-yellow-500 fill-current" }),
                        React.createElement("span", { className: "font-body text-sm font-semibold" }, listing.rating),
                        React.createElement("span", { className: "font-body text-sm text-muted-foreground" },
                            "(",
                            listing.reviewCount,
                            " reviews)")),
                    React.createElement("div", { className: "flex flex-wrap gap-1 mb-4" },
                        listing.amenities.slice(0, 3).map((amenity) => (React.createElement("span", { key: amenity, className: "font-body text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full" }, amenity))),
                        listing.amenities.length > 3 && (React.createElement("span", { className: "font-body text-xs text-muted-foreground px-2 py-1" },
                            "+",
                            listing.amenities.length - 3,
                            " more"))),
                    React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement("div", null,
                            React.createElement("span", { className: "font-heading text-2xl font-bold text-foreground" },
                                "$",
                                listing.price),
                            React.createElement("span", { className: "font-body text-muted-foreground" }, " / night")),
                        React.createElement("span", { className: "font-body text-xs text-muted-foreground" },
                            "by ",
                            listing.host))))))),
            React.createElement("div", { className: "text-center mt-16 animate-fade-in" },
                React.createElement("p", { className: "font-body text-muted-foreground mb-6" }, "Discover thousands more listings around the world"),
                React.createElement("div", { className: "flex flex-col sm:flex-row gap-4 justify-center" },
                    React.createElement("button", { className: "btn-primary" }, "Explore All Accommodations"),
                    React.createElement("button", { className: "btn-secondary" }, "Browse Services & Experiences"))))));
};
export default FeaturedListings;
