import React, { useState, useEffect } from 'react';
import { experiences } from './sharedData';
import { useParams, Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WishlistSection from '@/components/WishlistSection';
import {
  MapPin, Star, Heart, Share2, Clock, Users, ArrowLeft, X, Check
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LogIn from '@/pages/Auth/LogIn';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram, faFacebookMessenger, faXTwitter } from "@fortawesome/free-brands-svg-icons";

const ExperiencesDetails = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeShare, setActiveShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/experiences/${activeShare}`;



  const experience = experiences.find(item => item.id === Number(id));

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Handle favorite state
  useEffect(() => {
    if (!user || !experience) {
      setIsFavorite(false);
      return;
    }
    const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.uid}`)) || [];
    const found = storedFavorites.find(fav => fav && fav.id === experience.id && fav.type === "experience");
    setIsFavorite(!!found);
  }, [experience?.id, user]);

  // Listen to localStorage changes from other pages
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `favorites_${user?.uid}`) {
        const storedFavorites = JSON.parse(e.newValue) || [];
        const found = storedFavorites.find(fav => fav.id === experience?.id && fav.type === "experience");
        setIsFavorite(!!found);
      }
    };
    
    const handleFavoritesChanged = (e) => {
      if (e.detail.userId === user?.uid) {
        const found = e.detail.favorites.find(fav => fav.id === experience?.id && fav.type === "experience");
        setIsFavorite(!!found);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [user, experience?.id]);

  const handleFavorite = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const key = `favorites_${user.uid}`;
    let storedFavorites = JSON.parse(localStorage.getItem(key)) || [];

    if (isFavorite) {
      storedFavorites = storedFavorites.filter(fav => !(fav.id === experience.id && fav.type === "experience"));
      setIsFavorite(false);
    } else {
      storedFavorites.push({
        ...experience,
        type: "experience",
        image: experience.image || experience.images[0], // Use main card image
        savedDate: new Date().toLocaleDateString(),
      });
      setIsFavorite(true);
    }
    
    localStorage.setItem(key, JSON.stringify(storedFavorites));
    
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('favoritesChanged', {
        detail: { favorites: storedFavorites, userId: user.uid }
    }));
  };

  // If experience not found
  if (!experience) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Navigation />
        <div className="text-center mt-20">
          <h1 className="text-3xl font-heading font-bold mb-4">Experience Not Found</h1>
          <p className="text-muted-foreground mb-6">The experience you’re looking for doesn’t exist or has been removed.</p>
          <Link
            to="/experiences"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Experiences
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const reviews = experience.reviewsList || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/experiences" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to experiences
          </Link>
        </div>

        {/* Title & Actions */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">{experience.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{experience.rating}</span>
                  <span>({experience.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{experience.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFavorite}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                {isFavorite ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => setActiveShare(id)} // ← Add this
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
          <div className="grid grid-cols-3 gap-2 h-80 rounded-2xl overflow-hidden">
            <img src={experience.image} alt={experience.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            {experience.images.slice(1).map((img, i) => (
              <img key={i+1} src={img} alt={experience.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold text-foreground">About this experience</h2>
              <p className="text-muted-foreground leading-relaxed">{experience.description}</p>
            </div>

            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{experience.duration}</div>
              <div className="flex items-center gap-1"><Users className="w-4 h-4" />{experience.groupSize}</div>
            </div>
            
            {/* Amenities */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-2xl font-bold text-foreground">What's included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(experience.amenities || [
                  { name: "Equipment", icon: Users, available: true },
                  { name: "Refreshments", icon: Users, available: true },
                  { name: "Transportation", icon: Users, available: experience.id % 2 === 0 },
                  { name: "Photos", icon: Users, available: true },
                  { name: "Souvenirs", icon: Users, available: experience.id % 3 === 0 }
                ]).map((amenity, index) => (
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
            <div className="space-y-4 pt-6 border-t border-border">
              <h2 className="font-heading text-2xl font-bold text-foreground">Reviews</h2>
              {reviews.length > 0 ? (
                reviews.map(r => (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img src={r.avatar} alt={r.author} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-foreground">{r.author}</p>
                        <p className="text-sm text-muted-foreground">{r.date}</p>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        {[...Array(r.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{r.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No reviews yet.</p>
              )}
            </div>

            {/* Wishlist Section */}
            <WishlistSection
              listingId={experience.id}
              listingTitle={experience.title}
              listingType="experience"
              hostName={experience.host}
            />
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="card-listing p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-heading text-3xl font-bold text-foreground">${experience.price}</span>
                  <span className="text-muted-foreground">/ person</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{experience.rating} ({experience.reviews} reviews)</span>
                </div>
              </div>
              
              {/* Calendar Availability */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 border border-border rounded-xl">
                    <label className="block text-xs font-medium text-foreground mb-1">Date</label>
                    <input type="date" className="w-full bg-transparent text-sm text-muted-foreground" />
                  </div>
                  <div className="p-3 border border-border rounded-xl">
                    <label className="block text-xs font-medium text-foreground mb-1">Time</label>
                    <select className="w-full bg-transparent text-sm text-muted-foreground">
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>
                  </div>
                </div>
                <div className="p-3 border border-border rounded-xl">
                  <label className="block text-xs font-medium text-foreground mb-1">Guests</label>
                  <select className="w-full bg-transparent text-sm text-muted-foreground">
                    {[...Array(10)].map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1} guest{i > 0 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button className="btn-primary w-full">Book Experience</button>
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
            {/* ❌ Close Button */}
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
                        title: "Check out this accommodation on Getaways!",
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

      <Footer />
      {showLoginModal && <LogIn isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default ExperiencesDetails;
