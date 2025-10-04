import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import FeaturedListings from '@/components/FeaturedListings';
import Footer from '@/components/Footer';

const GuestIndex = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
  };

  return (
    <div className="min-h-screen">
      <Navigation role="guest" isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      <Hero />
      <Categories />
      <FeaturedListings />
      <Footer />
    </div>
  );
};

export default GuestIndex;
