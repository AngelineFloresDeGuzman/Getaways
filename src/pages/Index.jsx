import React, { useState } from "react";
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import FeaturedListings from "../components/FeaturedListings";
import Footer from "../components/Footer";

const Index = () => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <Hero darkMode={darkMode} />
      <Categories />
      <FeaturedListings />
      <Footer />
    </div>
  );
};

export default Index;
