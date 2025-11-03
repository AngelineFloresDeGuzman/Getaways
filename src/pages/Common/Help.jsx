import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { HelpCircle, Search, ChevronRight, MessageSquare, Mail, Phone, FileText, BookOpen, Shield, DollarSign, Users, Home } from 'lucide-react';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: <FileText className="w-5 h-5" /> },
    { id: 'account', name: 'Account & Profile', icon: <Users className="w-5 h-5" /> },
    { id: 'bookings', name: 'Bookings', icon: <Home className="w-5 h-5" /> },
    { id: 'payments', name: 'Payments & Refunds', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'hosting', name: 'Hosting', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'safety', name: 'Safety & Security', icon: <Shield className="w-5 h-5" /> },
  ];

  const articles = [
    {
      id: 1,
      category: 'account',
      title: 'How to create an account',
      description: 'Step-by-step guide to signing up for Getaways',
      content: 'Creating an account is easy. Click on "Sign Up" in the navigation bar...'
    },
    {
      id: 2,
      category: 'account',
      title: 'How to update your profile',
      description: 'Learn how to edit your profile information',
      content: 'Go to your Profile page and click "Edit Profile"...'
    },
    {
      id: 3,
      category: 'bookings',
      title: 'How to make a booking',
      description: 'Complete guide to booking accommodations',
      content: 'Browse listings, select dates, and proceed to checkout...'
    },
    {
      id: 4,
      category: 'bookings',
      title: 'How to cancel a booking',
      description: 'Cancellation policies and procedures',
      content: 'Go to your Bookings page and select the booking you want to cancel...'
    },
    {
      id: 5,
      category: 'payments',
      title: 'Payment methods accepted',
      description: 'Supported payment options on Getaways',
      content: 'We accept credit cards, debit cards, and PayPal...'
    },
    {
      id: 6,
      category: 'payments',
      title: 'Refund policy',
      description: 'How refunds work for cancellations',
      content: 'Refunds are processed according to the cancellation policy...'
    },
    {
      id: 7,
      category: 'hosting',
      title: 'How to become a host',
      description: 'Getting started as a Getaways host',
      content: 'Click "Become a Host" and follow the onboarding process...'
    },
    {
      id: 8,
      category: 'hosting',
      title: 'Managing your listings',
      description: 'Tips for optimizing your listings',
      content: 'Keep your calendar updated, add quality photos, and respond quickly...'
    },
    {
      id: 9,
      category: 'safety',
      title: 'Safety guidelines for guests',
      description: 'Important safety tips for travelers',
      content: 'Always verify host identity, read reviews, and keep emergency contacts...'
    },
    {
      id: 10,
      category: 'safety',
      title: 'Safety guidelines for hosts',
      description: 'Protecting your property and guests',
      content: 'Install smoke detectors, provide emergency contacts, and screen guests...'
    },
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Help Center</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions and learn how to get the most out of Getaways
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-lg"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-white text-foreground hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category.icon}
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {article.description}
                  </p>
                  <button className="text-primary text-sm font-medium hover:underline">
                    Read more
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Contact Support */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
              Still need help?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-lg inline-block mb-4">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Live Chat</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Chat with our support team in real-time
                </p>
                <button className="btn-primary w-full">Start Chat</button>
              </div>
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-lg inline-block mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Email Support</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send us an email and we'll respond within 24 hours
                </p>
                <a href="mailto:support@getaways.com" className="btn-outline w-full block text-center">
                  Send Email
                </a>
              </div>
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-lg inline-block mb-4">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Phone Support</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Call us Monday-Friday, 9 AM - 6 PM
                </p>
                <a href="tel:+1234567890" className="btn-outline w-full block text-center">
                  Call Us
                </a>
              </div>
            </div>
          </div>

          {/* Popular Topics */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Popular Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/help" className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Account Security</h3>
                  <p className="text-sm text-muted-foreground">Tips to keep your account secure</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link to="/help" className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Booking Troubleshooting</h3>
                  <p className="text-sm text-muted-foreground">Common booking issues and solutions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link to="/help" className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Host Verification</h3>
                  <p className="text-sm text-muted-foreground">How to verify your host account</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link to="/help" className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Payment Processing</h3>
                  <p className="text-sm text-muted-foreground">Understanding payment methods</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Help;

