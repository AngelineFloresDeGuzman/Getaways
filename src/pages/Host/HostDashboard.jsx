import React from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { 
  Home, Calendar, MessageSquare, DollarSign, Plus,
  TrendingUp, Eye, Star, Users, Clock, Settings, MapPin, Camera,
  Bed, Bath, Edit, Check
} from 'lucide-react';

const HostDashboard = () => {
  const location = useLocation();
  
  // Get listing data from navigation state or use defaults for newly created listing
  const listingData = location.state || {};
  
  // Extract key information from the onboarding flow
  const propertyType = listingData.propertyType || 'House';
  const title = listingData.title || 'Beautiful Property';
  const description = listingData.description || 'A wonderful place to stay.';
  const locationData = listingData.locationData || { city: 'Your City', province: 'Your Province' };
  const weekdayPrice = listingData.weekdayPrice || 1511;
  const weekendPrice = listingData.weekendPrice || 1587;
  const photos = listingData.photos || [];
  const amenities = listingData.selectedAmenities || [];
  const highlights = listingData.highlights || [];
  const guestCapacity = listingData.guestCapacity || 1;
  const bedrooms = listingData.bedrooms || 1;
  const bathrooms = listingData.bathrooms || 1;

  // Stats for a new host
  const stats = [
    { icon: Home, label: "Active Listings", value: "1", change: "Just created!" },
    { icon: Calendar, label: "Bookings", value: "0", change: "Ready for guests" },
    { icon: DollarSign, label: "Potential Earnings", value: `₱${weekdayPrice.toLocaleString()}`, change: "Per weekday night" },
    { icon: Star, label: "Rating", value: "New", change: "Start hosting today" }
  ];

  // Empty bookings for new host
  const recentBookings = [];

  // The newly created listing
  const listings = [
    {
      id: 1,
      title: title,
      propertyType: propertyType,
      location: `${locationData.city}, ${locationData.province}`,
      weekdayPrice: weekdayPrice,
      weekendPrice: weekendPrice,
      rating: null, // New listing
      reviews: 0,
      bookings: 0,
      image: photos.length > 0 ? photos[0].url : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=300&q=80",
      status: "draft",
      description: description,
      amenities: amenities,
      highlights: highlights,
      photos: photos
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
                  Congratulations! Your listing is ready!
                </h1>
                <p className="font-body text-xl text-muted-foreground">
                  You've successfully created your {propertyType.toLowerCase()} listing. Review and publish when ready.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button className="btn-outline flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button className="btn-primary flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview Listing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="card-listing p-6 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </h3>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Recent Bookings */}
          <div className="lg:col-span-2 card-listing p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Recent Bookings</h2>
              <button className="btn-outline text-sm">View All</button>
            </div>

            {recentBookings.length > 0 ? (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                    <img 
                      src={booking.image} 
                      alt={booking.listing}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">{booking.guest}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{booking.listing}</p>
                      <p className="text-xs text-muted-foreground">{booking.dates}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-lg font-bold text-foreground">₱{booking.amount.toLocaleString()}</p>
                      <button className="text-xs text-primary hover:underline">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Once you publish your listing, guests will be able to book your {propertyType.toLowerCase()}.
                </p>
                <button className="btn-primary">Publish Your Listing</button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            {/* Messages */}
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">Messages</h3>
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-foreground mb-1">0</p>
                <p className="text-sm text-muted-foreground">New messages</p>
                <p className="text-xs text-muted-foreground mt-2">Start receiving guest inquiries once published</p>
              </div>
            </div>

            {/* Listing Summary */}
            <div className="card-listing p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">Listing Details</h3>
                <Home className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{locationData.city}, {locationData.province}</p>
                    <p className="text-xs text-muted-foreground">{propertyType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">₱{weekdayPrice.toLocaleString()} - ₱{weekendPrice.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Weekday - Weekend pricing</p>
                  </div>
                </div>
                {photos.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{photos.length} photos uploaded</p>
                      <p className="text-xs text-muted-foreground">Ready to showcase your space</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* My Listings */}
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-heading text-2xl font-bold text-foreground">Your Listing</h2>
            <div className="flex gap-2">
              <button className="btn-outline">Edit Listing</button>
              <button className="btn-primary">Publish</button>
            </div>
          </div>

          {/* Created Listing */}
          <div className="card-listing p-6 hover-lift">
            <div className="flex gap-6">
              {/* Listing Image */}
              <div className="w-48 h-36 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {photos.length > 0 && photos[0].url ? (
                  <img 
                    src={photos[0].url} 
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Listing Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                    {title || 'Your New Listing'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {propertyType} in {locationData.city}, {locationData.province}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{guestCapacity || 1} guests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    <span>{bedrooms || 1} bedroom{(bedrooms || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    <span>{bathrooms || 1} bathroom{(bathrooms || 1) > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-semibold text-lg text-foreground">
                        ₱{weekdayPrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground"> / night</span>
                    </div>
                    {weekendPrice !== weekdayPrice && (
                      <div className="text-sm text-muted-foreground">
                        Weekend: ₱{weekendPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listing Actions */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <button className="btn-outline flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button className="btn-outline flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button className="btn-outline flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <div className="ml-auto">
                <button className="btn-primary">
                  Publish Listing
                </button>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="card-listing p-6 mt-6">
            <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Complete Your Listing</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-muted-foreground">Property details added</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${photos.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {photos.length > 0 ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className="text-xs text-gray-500">2</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">Photos uploaded ({photos.length}/5 recommended)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-muted-foreground">Pricing set</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-500">4</span>
                </div>
                <span className="text-sm text-muted-foreground">Add calendar availability</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-500">5</span>
                </div>
                <span className="text-sm text-muted-foreground">Review and publish</span>
              </div>
            </div>
            <button className="btn-primary w-full mt-4">
              Continue Setup
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HostDashboard;