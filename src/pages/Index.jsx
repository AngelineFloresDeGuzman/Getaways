import React from "react";
import Navigation from "../components/Navigation";
import Hero from "../components/Hero";
import Categories from "../components/Categories";
import FeaturedListings from "../components/FeaturedListings";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Categories />
      <FeaturedListings />
      <Footer />
    </div>
  );
};

export default Index;
