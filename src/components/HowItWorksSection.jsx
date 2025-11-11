import React from 'react';
import { Search, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HowItWorksSection = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      icon: Search,
      title: 'Search & Explore',
      description: 'Browse through thousands of accommodations, experiences, and services. Use filters to find exactly what you\'re looking for.'
    },
    {
      number: 2,
      icon: Calendar,
      title: 'Book Your Stay',
      description: 'Select your dates, check availability, and send a booking request. Hosts typically respond within 24 hours.'
    },
    {
      number: 3,
      icon: CreditCard,
      title: 'Secure Payment',
      description: 'Pay securely through our platform. Your payment is protected and only released to the host after your stay.'
    },
    {
      number: 4,
      icon: CheckCircle,
      title: 'Enjoy Your Getaway',
      description: 'Experience your perfect getaway and create unforgettable memories. Leave a review to help other travelers.'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl font-bold text-foreground mb-4">
            How it works?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explain how to get started with the product in simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-lg">
                    <Icon className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center border-2 border-background">
                    <span className="text-sm font-bold text-foreground">{step.number}</span>
                  </div>
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="font-body text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/accommodations')}
            className="btn-primary px-8 py-3 text-lg"
          >
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

