import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Search, MapPin, Calendar, Users, Filter, Share2, Star, X } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import LogIn from "@/pages/Auth/LogIn";
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faFacebookF, faInstagram, faFacebookMessenger } from "@fortawesome/free-brands-svg-icons";

const accommodationsData = [
    {
        id: 1,
        title: "Luxury Beachfront Villa",
        location: "Malibu, CA",
        price: 450,
        rating: 4.9,
        reviews: 127,
        image:
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
        features: ["Ocean View", "Private Pool", "5 Bedrooms", "WiFi"],
        type: "accommodation",
    },
    {
        id: 2,
        title: "Cozy Mountain Cabin",
        location: "Aspen, CO",
        price: 280,
        rating: 4.8,
        reviews: 89,
        image:
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80",
        features: ["Mountain View", "Fireplace", "3 Bedrooms", "Hot Tub"],
        type: "accommodation",
    },
    {
        id: 3,
        title: "Modern City Loft",
        location: "New York, NY",
        price: 320,
        rating: 4.7,
        reviews: 156,
        image:
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
        features: ["City View", "Rooftop Access", "2 Bedrooms", "Gym"],
        type: "accommodation",
    },
    {
        id: 4,
        title: "Charming Country House",
        location: "Tuscany, Italy",
        price: 380,
        rating: 4.9,
        reviews: 203,
        image:
            "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=800&q=80",
        features: ["Vineyard View", "Garden", "4 Bedrooms", "Kitchen"],
        type: "accommodation",
    },
];

const Accommodations = () => {
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [user, setUser] = useState(null);
    const [activeShare, setActiveShare] = useState(null);
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

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
                <div className="max-w-7xl mx-auto">
                    <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
                        Find Your Perfect Stay
                    </h1>
                    <p className="font-body text-xl text-muted-foreground max-w-2xl animate-fade-in">
                        Discover unique accommodations from cozy cabins to luxury villas
                    </p>
                </div>
            </section>

            {/* Filters */}
            <section className="py-8 px-6 border-b border-border">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 bg-white rounded-2xl shadow-medium p-2 max-w-4xl">
                        {/* Location */}
                        <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-sm text-foreground">Where</p>
                                <p className="text-muted-foreground text-sm">Search destinations</p>
                            </div>
                        </div>
                        {/* Check-in */}
                        <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-sm text-foreground">Check-in</p>
                                <p className="text-muted-foreground text-sm">Add dates</p>
                            </div>
                        </div>
                        {/* Check-out */}
                        <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l border-border">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-sm text-foreground">Check-out</p>
                                <p className="text-muted-foreground text-sm">Add dates</p>
                            </div>
                        </div>
                        {/* Guests + Search */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-sm text-foreground">Guests</p>
                                    <p className="text-muted-foreground text-sm">Add guests</p>
                                </div>
                            </div>
                            <button className="btn-primary p-3 rounded-full">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button className="btn-outline flex items-center gap-2 cursor-pointer">
                        <Filter className="w-5 h-5" /> Filters
                    </button>
                </div>
            </section>

            {/* Accommodations Grid */}
            <section className="py-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <p className="font-body text-muted-foreground">
                            {accommodationsData.length} accommodations found
                        </p>
                        <select className="p-2 border border-border rounded-lg bg-background text-foreground">
                            <option>Sort by: Recommended</option>
                            <option>Price: Low to High</option>
                            <option>Price: High to Low</option>
                            <option>Rating: High to Low</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {accommodationsData.map((accommodation, index) => {
                            // Check if accommodation is null or undefined before accessing its properties
                            if (!accommodation) return null;
                            
                            const accommodationInFavorites = favorites?.find(fav => fav && fav.id === accommodation.id && fav.type === "accommodation");
                            const mainImage = accommodationInFavorites?.image || accommodation.image || "fallback.jpg";
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
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {accommodation.features.map((feature, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
                                                >
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-heading text-2xl font-bold text-foreground">
                                                    ${accommodation.price}
                                                </span>
                                                <span className="font-body text-muted-foreground">
                                                    {" "} / night
                                                </span>
                                            </div>
                                            <button className="btn-primary cursor-pointer">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-12">
                        <button className="btn-outline px-8 py-3 cursor-pointer">
                            Load More Accommodations
                        </button>
                    </div>
                </div>
            </section>

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
