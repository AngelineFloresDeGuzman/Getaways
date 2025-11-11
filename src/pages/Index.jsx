import React, { useState } from "react";
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import FeaturedListings from "../components/FeaturedListings";
import Recommendations from "../components/Recommendations";
import BenefitsSection from "../components/BenefitsSection";
import HowItWorksSection from "../components/HowItWorksSection";
import FAQSection from "../components/FAQSection";
import FinalCTASection from "../components/FinalCTASection";
import Footer from "../components/Footer";

const Index = () => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <Hero darkMode={darkMode} />
      <Categories />
      <BenefitsSection />
      <FeaturedListings />
      <HowItWorksSection />
      <Recommendations title="Recommended for You" showTitle={true} limit={12} />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Index;
