import React from 'react';
import { Shield, Heart, Star, MapPin, Clock, Users } from 'lucide-react';

const BenefitsSection = () => {
  const benefits = [
    {
      icon: Shield,
      title: 'Secure & Safe',
      description: 'Your safety is our priority. All hosts and listings are verified for your peace of mind.'
    },
    {
      icon: Heart,
      title: 'Trusted Community',
      description: 'Join thousands of travelers who trust Getaways for their perfect vacation experiences.'
    },
    {
      icon: Star,
      title: 'Quality Guaranteed',
      description: 'Every listing is carefully reviewed to ensure high standards and exceptional experiences.'
    },
    {
      icon: MapPin,
      title: 'Amazing Locations',
      description: 'Discover unique accommodations, experiences, and services in the most beautiful destinations.'
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Our support team is always ready to help you with any questions or concerns.'
    },
    {
      icon: Users,
      title: 'Local Hosts',
      description: 'Connect with local hosts who know the best spots and can make your stay unforgettable.'
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
            Benefits
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Focus on how it helps you instead of what features it has
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="card-listing p-8 hover-lift group animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

