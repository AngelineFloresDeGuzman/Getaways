import React, { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OnboardingProvider } from "./pages/Host/contexts/OnboardingContext";
import Index from "./pages/Index.jsx";
import NotFound from "@/pages/Common/NotFound.jsx";
import Accommodations from "./pages/Guest/Accommodations";
import AccommodationDetail from "./pages/Guest/AccommodationDetail";
import Services from "./pages/Guest/Services";
import ServicesDetail from "./pages/Guest/ServicesDetail";
import Bookings from "./pages/Guest/Bookings";
import Experiences from "./pages/Guest/Experiences";
import ExperiencesDetails from "./pages/Guest/ExperiencesDetails";
import Login from "./pages/Auth/LogIn";
import SignUp from "./pages/Auth/SignUp";
import GuestIndex from "./pages/Guest/Index";
import Favorites from "@/pages/Guest/Favorites";
import HostDashboard from "@/pages/Host/HostDashboard";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import Profile from "@/pages/Common/Profile";
import AccountSettings from "@/pages/Common/AccountSettings";
import HostingSteps from './components/HostingSteps';
import PropertyDetails from "./pages/Host/onboarding/PropertyDetails";
import PropertyStructure from "./pages/Host/onboarding/PropertyStructure";
import PrivacyType from "./pages/Host/onboarding/PrivacyType";
import Location from "./pages/Host/onboarding/Location";
import LocationConfirmation from "./pages/Host/onboarding/LocationConfirmation";
import PropertyBasics from "./pages/Host/onboarding/PropertyBasics";
import MakeItStandOut from "./pages/Host/onboarding/MakeItStandOut";
import Amenities from "./pages/Host/onboarding/Amenities";
import Photos from "./pages/Host/onboarding/Photos";
import PhotosPreview from "./pages/Host/onboarding/PhotosPreview";
import TitleDescription from "./pages/Host/onboarding/TitleDescription";
import Description from "./pages/Host/onboarding/Description";
import DescriptionDetails from "./pages/Host/onboarding/DescriptionDetails";
import FinishSetup from "./pages/Host/onboarding/FinishSetup";
import BookingSettings from "./pages/Host/onboarding/BookingSettings";
import GuestSelection from "./pages/Host/onboarding/GuestSelection";
import Pricing from "./pages/Host/onboarding/Pricing";
import WeekendPricing from "./pages/Host/onboarding/WeekendPricing";
import Discounts from "./pages/Host/onboarding/Discounts";
import SafetyDetails from "./pages/Host/onboarding/SafetyDetails";
import FinalDetails from "./pages/Host/onboarding/FinalDetails";

const queryClient = new QueryClient();

const App = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    setDarkMode(savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  useEffect(() => {
    const newTheme = darkMode ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* ✅ Only Sonner toaster here */}
        <Sonner richColors position="top-center" />

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accommodations" element={<Accommodations darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accommodations/:id" element={<AccommodationDetail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/services" element={<Services darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/services/:id" element={<ServicesDetail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/experiences" element={<Experiences darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/experiences/:id" element={<ExperiencesDetails darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/login" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/signup" element={<SignUp darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/guest/index" element={<GuestIndex darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/bookings" element={<Bookings darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/favorites" element={<Favorites darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/host/hostdashboard" element={<HostDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/admin/admindashboard" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/profile" element={<Profile darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accountsettings" element={<AccountSettings darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/become-host/steps" element={<HostingSteps />} />
            
            {/* Onboarding Routes with Context */}
            <Route path="/pages/*" element={
              <OnboardingProvider>
                <Routes>
                  <Route path="propertydetails" element={<PropertyDetails />} />
                  <Route path="propertystructure" element={<PropertyStructure />} />
                  <Route path="privacy-type" element={<PrivacyType />} />
                  <Route path="location" element={<Location />} />
                  <Route path="location-confirmation" element={<LocationConfirmation />} />
                  <Route path="property-basics" element={<PropertyBasics />} />
                  <Route path="make-it-stand-out" element={<MakeItStandOut />} />
                  <Route path="amenities" element={<Amenities />} />
                  <Route path="photos" element={<Photos />} />
                  <Route path="photos-preview" element={<PhotosPreview />} />
                  <Route path="title-description" element={<TitleDescription />} />
                  <Route path="description" element={<Description />} />
                  <Route path="description-details" element={<DescriptionDetails />} />
                  <Route path="finish-setup" element={<FinishSetup />} />
                  <Route path="booking-settings" element={<BookingSettings />} />
                  <Route path="guest-selection" element={<GuestSelection />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="weekend-pricing" element={<WeekendPricing />} />
                  <Route path="discounts" element={<Discounts />} />
                  <Route path="safety-details" element={<SafetyDetails />} />
                  <Route path="final-details" element={<FinalDetails />} />
                </Routes>
              </OnboardingProvider>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
