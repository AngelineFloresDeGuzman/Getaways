import React from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { BookOpen, Lightbulb, TrendingUp, Shield, DollarSign, Users, Home, FileText, Video, ExternalLink } from 'lucide-react';

const Resources = () => {
  const resources = [
    {
      category: 'Getting Started',
      icon: <Home className="w-6 h-6" />,
      items: [
        {
          title: 'Hosting Basics',
          description: 'Learn the fundamentals of hosting on Getaways',
          link: '#',
          external: false
        },
        {
          title: 'Creating Your First Listing',
          description: 'Step-by-step guide to listing your space',
          link: '#',
          external: false
        },
        {
          title: 'Hosting Checklist',
          description: 'Everything you need to start hosting successfully',
          link: '#',
          external: false
        }
      ]
    },
    {
      category: 'Pricing & Payments',
      icon: <DollarSign className="w-6 h-6" />,
      items: [
        {
          title: 'Setting Your Prices',
          description: 'Tips for pricing your listing competitively',
          link: '#',
          external: false
        },
        {
          title: 'Payment Processing',
          description: 'How payments work and when you get paid',
          link: '#',
          external: false
        },
        {
          title: 'Tax Information',
          description: 'Understanding tax obligations for hosts',
          link: '#',
          external: false
        }
      ]
    },
    {
      category: 'Guest Management',
      icon: <Users className="w-6 h-6" />,
      items: [
        {
          title: 'Communicating with Guests',
          description: 'Best practices for guest communication',
          link: '#',
          external: false
        },
        {
          title: 'Managing Bookings',
          description: 'How to handle reservations and cancellations',
          link: '#',
          external: false
        },
        {
          title: 'Guest Reviews',
          description: 'Encouraging and responding to reviews',
          link: '#',
          external: false
        }
      ]
    },
    {
      category: 'Safety & Security',
      icon: <Shield className="w-6 h-6" />,
      items: [
        {
          title: 'Safety Guidelines',
          description: 'Important safety measures for hosts',
          link: '#',
          external: false
        },
        {
          title: 'Property Insurance',
          description: 'Protecting your property and guests',
          link: '#',
          external: false
        },
        {
          title: 'Emergency Procedures',
          description: 'What to do in case of emergencies',
          link: '#',
          external: false
        }
      ]
    },
    {
      category: 'Marketing & Optimization',
      icon: <TrendingUp className="w-6 h-6" />,
      items: [
        {
          title: 'Improving Your Listing Visibility',
          description: 'Tips to get more bookings',
          link: '#',
          external: false
        },
        {
          title: 'Photography Tips',
          description: 'How to take great photos of your space',
          link: '#',
          external: false
        },
        {
          title: 'Writing Great Descriptions',
          description: 'Crafting descriptions that attract guests',
          link: '#',
          external: false
        }
      ]
    },
    {
      category: 'Learning Resources',
      icon: <Video className="w-6 h-6" />,
      items: [
        {
          title: 'Video Tutorials',
          description: 'Watch step-by-step hosting tutorials',
          link: '#',
          external: false
        },
        {
          title: 'Host Community Forum',
          description: 'Connect with other hosts and share experiences',
          link: '#',
          external: false
        },
        {
          title: 'Case Studies',
          description: 'Learn from successful host stories',
          link: '#',
          external: false
        }
      ]
    }
  ];

  const quickLinks = [
    {
      title: 'Host Dashboard',
      description: 'Manage your listings and bookings',
      link: '/host/hostdashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      title: 'Create New Listing',
      description: 'Add a new property to your portfolio',
      link: '/pages/hostingsteps',
      icon: <FileText className="w-5 h-5" />
    },
    {
      title: 'Calendar',
      description: 'View and manage your availability',
      link: '/host/calendar',
      icon: <FileText className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Hosting Resources</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to become a successful host on Getaways
            </p>
          </div>

          {/* Quick Links */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickLinks.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.link}
                  className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      {link.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{link.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Resource Categories */}
          <div className="space-y-8">
            {resources.map((category, categoryIdx) => (
              <div key={categoryIdx} className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">{category.category}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {category.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="border border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-md transition-all group"
                    >
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                      <Link
                        to={item.link}
                        className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:gap-3 transition-all"
                      >
                        Learn more
                        {item.external ? (
                          <ExternalLink className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Pro Tips</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Be Responsive</h3>
                <p className="text-sm text-muted-foreground">
                  Quick responses to guest inquiries can significantly increase your booking rate.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Price Competitively</h3>
                <p className="text-sm text-muted-foreground">
                  Research similar listings in your area to set competitive prices.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Update Regularly</h3>
                <p className="text-sm text-muted-foreground">
                  Keep your calendar updated and refresh your listing photos seasonally.
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Go the Extra Mile</h3>
                <p className="text-sm text-muted-foreground">
                  Small touches like welcome notes and local recommendations create memorable stays.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Resources;

