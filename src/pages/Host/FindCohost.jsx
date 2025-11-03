import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { UserPlus, Search, Star, MapPin, Calendar, CheckCircle } from 'lucide-react';

const FindCohost = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [services, setServices] = useState([]);

  const serviceOptions = [
    'Property Management',
    'Guest Communication',
    'Cleaning Services',
    'Maintenance',
    'Marketing',
    'Photography',
    'Legal & Compliance'
  ];

  // Mock co-host profiles (in a real app, this would come from database)
  const cohosts = [
    {
      id: 1,
      name: 'Sarah Johnson',
      location: 'Los Angeles, CA',
      rating: 4.9,
      reviews: 127,
      services: ['Property Management', 'Guest Communication', 'Cleaning Services'],
      experience: '5 years',
      listings: 12,
      bio: 'Experienced co-host specializing in luxury properties and excellent guest experiences.',
      verified: true
    },
    {
      id: 2,
      name: 'Michael Chen',
      location: 'New York, NY',
      rating: 4.8,
      reviews: 89,
      services: ['Marketing', 'Photography', 'Guest Communication'],
      experience: '3 years',
      listings: 8,
      bio: 'Marketing expert helping hosts maximize their booking rates through strategic promotion.',
      verified: true
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      location: 'Miami, FL',
      rating: 5.0,
      reviews: 203,
      services: ['Cleaning Services', 'Maintenance', 'Property Management'],
      experience: '7 years',
      listings: 25,
      bio: 'Full-service co-host with a team ready to handle all aspects of property management.',
      verified: true
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <UserPlus className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Find a Co-host</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with experienced co-hosts who can help you manage your properties and grow your hosting business
            </p>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button className="btn-primary w-full">Search Co-hosts</button>
            </div>

            {/* Service Filters */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Services Needed:</p>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map((service) => (
                  <button
                    key={service}
                    onClick={() => {
                      setServices(prev =>
                        prev.includes(service)
                          ? prev.filter(s => s !== service)
                          : [...prev, service]
                      );
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      services.includes(service)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-foreground hover:bg-gray-200'
                    }`}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Co-host Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {cohosts.map((cohost) => (
              <div key={cohost.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground">{cohost.name}</h3>
                          {cohost.verified && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">{cohost.rating}</span>
                          <span>({cohost.reviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      {cohost.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      {cohost.experience} experience • {cohost.listings} listings
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{cohost.bio}</p>

                  <div className="mb-4">
                    <p className="text-xs font-medium text-foreground mb-2">Services Offered:</p>
                    <div className="flex flex-wrap gap-2">
                      {cohost.services.map((service) => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="btn-primary w-full">Contact Co-host</button>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Why Work with a Co-host?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Expertise & Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Co-hosts bring years of experience and proven strategies to help your listings succeed.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Save Time</h3>
                <p className="text-sm text-muted-foreground">
                  Focus on what matters while co-hosts handle guest communication, maintenance, and operations.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Increase Bookings</h3>
                <p className="text-sm text-muted-foreground">
                  Professional photography, marketing, and optimization can significantly boost your booking rate.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Better Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  Excellent guest experiences managed by co-hosts lead to better reviews and higher ratings.
                </p>
              </div>
            </div>
          </div>

          {/* Become a Co-host CTA */}
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Are you a Co-host?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join our network of verified co-hosts and connect with property owners looking for your expertise.
            </p>
            <button className="btn-primary px-8 py-3">Apply to Become a Co-host</button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FindCohost;

