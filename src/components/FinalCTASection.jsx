import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-[#8B6F47] via-[#A67C52] to-[#6B8FA3] text-white relative overflow-hidden">
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6 text-white drop-shadow-lg">
          Ready to Start Your Perfect Getaway?
        </h2>
        <p className="text-lg md:text-xl mb-8 text-white drop-shadow-md max-w-2xl mx-auto">
          Discover amazing accommodations, unique experiences, and exceptional services. 
          Join thousands of travelers who trust Getaways for their perfect vacation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/accommodations')}
            className="bg-white text-[#8B6F47] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-300 flex items-center justify-center gap-2 shadow-xl"
          >
            Explore Listings
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/pages/hostingsteps')}
            className="bg-white/20 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/30 transition-colors duration-300 shadow-xl"
          >
            Become a Host
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;

