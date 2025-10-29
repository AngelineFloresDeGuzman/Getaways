import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WishlistSection from '@/components/WishlistSection';
import {
  MapPin, Star, Heart, Share2, Check, X, ArrowLeft
} from 'lucide-react';
import { accommodations } from '@/pages/Guest/sharedData';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LogIn from '@/pages/Auth/LogIn';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faFacebookMessenger, faXTwitter } from "@fortawesome/free-brands-svg-icons";

const AccommodationDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const accommodation = accommodations.find(item => item.id === Number(id));
  if (!accommodation)
    return <div className="min-h-screen flex items-center justify-center text-foreground"><p>Accommodation not found.</p></div>;

  const mainImage = accommodation.image || "fallback.jpg";
  const favoritesKey = user ? `favorites_${user.uid}` : "favorites";
  const shareUrl = activeShare ? `${window.location.origin}/accommodations/${activeShare}` : '';

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    if (!user || !accommodation) return;
    const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
    setFavorites(storedFavorites);
    setIsFavorite(!!storedFavorites.find(fav => fav && fav.id === accommodation.id && fav.type === "accommodation"));
  }, [user, accommodation?.id]);

  // Listen to localStorage changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `favorites_${user?.uid}`) {
        const storedFavorites = JSON.parse(e.newValue) || [];
        setFavorites(storedFavorites);
        setIsFavorite(!!storedFavorites.find(fav => fav.id === accommodation.id && fav.type === "accommodation"));
      }
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user?.uid) {
        setFavorites(e.detail.favorites);
        setIsFavorite(!!e.detail.favorites.find(fav => fav.id === accommodation.id && fav.type === "accommodation"));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [user, accommodation.id]);

  const handleRequireLogin = () => setShowLoginModal(true);

  const toggleFavorite = () => {
    if (!user) return handleRequireLogin();

    const key = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(key)) || [];

    const exists = storedFavorites.some(fav => fav.id === accommodation.id && fav.type === "accommodation");

    if (exists) {
      storedFavorites = storedFavorites.filter(fav => !(fav.id === accommodation.id && fav.type === "accommodation"));
      setIsFavorite(false);
    } else {
      storedFavorites.push({
        ...accommodation,
        type: "accommodation",
        image: accommodation.image || accommodation.images[0], // Use main card image
        savedDate: new Date().toLocaleDateString(),
      });
      setIsFavorite(true);
    }

    localStorage.setItem(key, JSON.stringify(storedFavorites));
    setFavorites(storedFavorites);
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
      detail: { favorites: storedFavorites, userId: user.uid }
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/accommodations/${accommodation.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reviews = accommodation.reviewsList || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/accommodations" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to accommodations
          </Link>
        </div>

        {/* Title & Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                {accommodation.title}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{accommodation.rating}</span>
                  <span>({accommodation.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{accommodation.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleFavorite}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setActiveShare(accommodation.id)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="grid grid-cols-4 gap-2 h-96 rounded-2xl overflow-hidden">
            <div className="col-span-2 row-span-2">
              <img
                src={mainImage}
                alt={accommodation.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            {accommodation.images.slice(1).map((image, index) => (
              <div key={index} className="overflow-hidden">
                <img
                  src={image}
                  alt={`${accommodation.title} ${index + 2}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {accommodation.host && (
              <div className="flex items-center gap-4 p-6 border border-border rounded-2xl">
                <img
                  src={accommodation.hostImage}
                  alt={accommodation.host}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    Hosted by {accommodation.host}
                  </h3>
                  <p className="text-muted-foreground">Superhost • 4 years hosting</p>
                </div>
              </div>
            )}

            {/* Property Details */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">About this place</h2>
              <div className="flex items-center gap-6 text-muted-foreground">
                <span>{accommodation.bedrooms} bedrooms</span>
                <span>{accommodation.bathrooms} bathrooms</span>
                <span>Up to {accommodation.maxGuests} guests</span>
              </div>
              <p className="font-body text-muted-foreground leading-relaxed">
                {accommodation.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">What this place offers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accommodation.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <amenity.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">{amenity.name}</span>
                    {amenity.available ? (
                      <Check className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-500 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{accommodation.rating}</span>
                  <span className="text-muted-foreground">({accommodation.reviews} reviews)</span>
                </div>
              </div>

              <div className="space-y-6">
                {reviews.length > 0 ? reviews.map((review) => (
                  <div key={review.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={review.avatar}
                        alt={review.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-foreground">{review.author}</p>
                        <p className="text-sm text-muted-foreground">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed pl-13">
                      {review.comment}
                    </p>
                  </div>
                )) : <p className="text-muted-foreground">No reviews yet.</p>}
              </div>
            </div>

            {/* Wishlist Section */}
            <WishlistSection
              listingId={accommodation.id}
              listingTitle={accommodation.title}
              listingType="accommodation"
              hostName={accommodation.host}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="card-listing p-6">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-heading text-3xl font-bold text-foreground">
                      ${accommodation.price}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{accommodation.rating} ({accommodation.reviews} reviews)</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 border border-border rounded-xl">
                      <label className="block text-xs font-medium text-foreground mb-1">Check-in</label>
                      <input type="date" className="w-full bg-transparent text-sm text-muted-foreground" />
                    </div>
                    <div className="p-3 border border-border rounded-xl">
                      <label className="block text-xs font-medium text-foreground mb-1">Check-out</label>
                      <input type="date" className="w-full bg-transparent text-sm text-muted-foreground" />
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-xl">
                    <label className="block text-xs font-medium text-foreground mb-1">Guests</label>
                    <select className="w-full bg-transparent text-sm text-muted-foreground">
                      {[...Array(accommodation.maxGuests)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1} guest{i > 0 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button className="btn-primary w-full mb-4">Reserve</button>
                <p className="text-center text-sm text-muted-foreground mb-4">You won't be charged yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              Share this Accommodation
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose a platform to share on or copy the link below.
            </p>

            {/* Social Buttons */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
              >
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-full hover:bg-gray-800 transition"
              >
                <FontAwesomeIcon icon={faXTwitter} />
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition"
              >
                <FontAwesomeIcon icon={faInstagram} />
              </a>
              <a
                href={`https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
              >
                <FontAwesomeIcon icon={faFacebookMessenger} />
              </a>
            </div>

            {/* Copy Link */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="border border-border rounded-lg px-3 py-2 w-full text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Copy
                </button>
              </div>
              {copied && <p className="text-green-600 text-sm font-medium transition-opacity">✅ Link copied!</p>}
            </div>
          </div>
        </div>
      )}

      <Footer />
      {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default AccommodationDetail;
