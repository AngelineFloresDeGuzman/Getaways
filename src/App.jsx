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
import BookingDetail from "./pages/Guest/BookingDetail";
import BookingRequest from "./pages/Guest/BookingRequest";
import Experiences from "./pages/Guest/Experiences";
import ExperiencesDetails from "./pages/Guest/ExperiencesDetails";
import Login from "./pages/Auth/LogIn";
import SignUp from "./pages/Auth/SignUp";
import GuestIndex from "./pages/Guest/Index";
import HostDashboard from "@/pages/Host/HostDashboard";
import CalendarPage from "@/pages/Host/Calendar";
import HostListings from "@/pages/Host/Listings";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AccountSettings from "@/pages/Common/AccountSettings";
import EWallet from "@/pages/Common/EWallet";
import Favorites from "@/pages/Guest/Favorites";
import HostingSteps from './pages/Host/onboarding/HostingSteps.jsx';
import ExperienceCategorySelection from "./pages/Host/onboarding/ExperienceCategorySelection";
import ExperienceSubcategorySelection from "./pages/Host/onboarding/ExperienceSubcategorySelection";
import ExperienceLocation from "./pages/Host/onboarding/ExperienceLocation";
import ExperienceListingSummary from "./pages/Host/onboarding/ExperienceListingSummary";
import ExperienceDetails from "./pages/Host/onboarding/ExperienceDetails";
import ServiceCategorySelection from "./pages/Host/onboarding/ServiceCategorySelection";
import ServiceLocation from "./pages/Host/onboarding/ServiceLocation";
import ServiceYearsOfExperience from "./pages/Host/onboarding/ServiceYearsOfExperience";
import ServiceQualifications from "./pages/Host/onboarding/ServiceQualifications";
import ServiceOnlineProfiles from "./pages/Host/onboarding/ServiceOnlineProfiles";
import ServiceWhereProvide from "./pages/Host/onboarding/ServiceWhereProvide";
import ServiceAddress from "./pages/Host/onboarding/ServiceAddress";
import ServicePhotos from "./pages/Host/onboarding/ServicePhotos";
import ServiceTitle from "./pages/Host/onboarding/ServiceTitle";
import ServiceOfferings from "./pages/Host/onboarding/ServiceOfferings";
import CreateYourOfferings from "./pages/Host/onboarding/CreateYourOfferings";
import ServiceDescription from "./pages/Host/onboarding/ServiceDescription";
import ServiceWhatProvide from "./pages/Host/onboarding/ServiceWhatProvide";
import OfferingTitle from "./pages/Host/onboarding/OfferingTitle";
import OfferingPhoto from "./pages/Host/onboarding/OfferingPhoto";
import OfferingGuests from "./pages/Host/onboarding/OfferingGuests";
import OfferingPrice from "./pages/Host/onboarding/OfferingPrice";
import OfferingPricePerGuest from "./pages/Host/onboarding/OfferingPricePerGuest";
import OfferingPriceFixed from "./pages/Host/onboarding/OfferingPriceFixed";
import OfferingMinimumPrice from "./pages/Host/onboarding/OfferingMinimumPrice";
import OfferingReviewPricing from "./pages/Host/onboarding/OfferingReviewPricing";
import OfferingDiscounts from "./pages/Host/onboarding/OfferingDiscounts";
import OfferingAvailability from "./pages/Host/onboarding/OfferingAvailability";
import PropertyDetails from "./pages/Host/onboarding/PropertyDetails";
import PropertyStructure from "./pages/Host/onboarding/PropertyStructure";
import PrivacyType from "./pages/Host/onboarding/PrivacyType";
import Location from "./pages/Host/onboarding/Location";
import LocationConfirmation from "./pages/Host/onboarding/LocationConfirmation";
import PropertyBasics from "./pages/Host/onboarding/PropertyBasics";
import BathroomTypes from "./pages/Host/onboarding/BathroomTypes";
import Occupancy from "./pages/Host/onboarding/Occupancy";
import MakeItStandOut from "./pages/Host/onboarding/MakeItStandOut";
import Amenities from "./pages/Host/onboarding/Amenities";
import Photos from "./pages/Host/onboarding/Photos";
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
import Payment from "./pages/Host/onboarding/Payment";
import ResetPassword from "./pages/Auth/ResetPassword.jsx";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import GuestMessages from "./pages/Guest/Messages";
import HostMessages from "./pages/Host/Messages";
import Resources from "./pages/Host/Resources";
import FindCohost from "./pages/Host/FindCohost";
import Refer from "./pages/Common/Refer";
import Languages from "./pages/Common/Languages";
import Help from "./pages/Common/Help";
import Notifications from "./pages/Guest/Notifications";

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
  <Sonner richColors position="top-right" />

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accommodations" element={<Accommodations darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accommodations/:id" element={<AccommodationDetail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/booking-request" element={<BookingRequest />} />
            <Route path="/services" element={<Services darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/services/:id" element={<ServicesDetail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/experiences" element={<Experiences darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/experiences/:id" element={<ExperiencesDetails darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/login" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/resetpassword" element={<ResetPassword darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/signup" element={<SignUp darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/verifyemail" element={<VerifyEmail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/verify-email" element={<VerifyEmail darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/guest/index" element={<GuestIndex darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/bookings" element={<Bookings darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/bookings/:id" element={<BookingDetail />} />
            <Route path="/favorites" element={<Favorites darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/messages" element={<GuestMessages />} />
            <Route path="/host/hostdashboard" element={<HostDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/host/calendar" element={<CalendarPage />} />
            <Route path="/host/listings" element={<HostListings />} />
            <Route path="/host/messages" element={<HostMessages />} />
            <Route path="/host/resources" element={<Resources />} />
            <Route path="/find-cohost" element={<FindCohost />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/languages" element={<Languages />} />
            <Route path="/help" element={<Help />} />
            <Route path="/notifications" element={<Notifications darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/admin/admindashboard" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accountsettings" element={<AccountSettings darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/ewallet" element={<EWallet />} />
            
            {/* Onboarding Routes with Context */}
            <Route path="/pages/*" element={
              <OnboardingProvider>
                <Routes>
                  <Route path="hostingsteps" element={<HostingSteps />} />
                  <Route path="experience-category-selection" element={<ExperienceCategorySelection />} />
                  <Route path="experience-subcategory-selection" element={<ExperienceSubcategorySelection />} />
                  <Route path="experience-location" element={<ExperienceLocation />} />
                  <Route path="experience-listing-summary" element={<ExperienceListingSummary />} />
                  <Route path="experience-details" element={<ExperienceDetails />} />
                  <Route path="service-category-selection" element={<ServiceCategorySelection />} />
                  <Route path="service-location" element={<ServiceLocation />} />
                  <Route path="service-years-of-experience" element={<ServiceYearsOfExperience />} />
                  <Route path="service-qualifications" element={<ServiceQualifications />} />
                  <Route path="service-online-profiles" element={<ServiceOnlineProfiles />} />
                  <Route path="service-where-provide" element={<ServiceWhereProvide />} />
                  <Route path="service-photos" element={<ServicePhotos />} />
                  <Route path="service-title" element={<ServiceTitle />} />
                  <Route path="create-your-offerings" element={<CreateYourOfferings />} />
                  <Route path="your-offerings" element={<ServiceOfferings />} />
                  <Route path="service-offerings" element={<ServiceOfferings />} />
                  <Route path="offering-title" element={<OfferingTitle />} />
                  <Route path="offering-photo" element={<OfferingPhoto />} />
                  <Route path="offering-guests" element={<OfferingGuests />} />
                  <Route path="offering-price" element={<OfferingPrice />} />
                  <Route path="offering-price-per-guest" element={<OfferingPricePerGuest />} />
                  <Route path="offering-price-fixed" element={<OfferingPriceFixed />} />
                  <Route path="offering-minimum-price" element={<OfferingMinimumPrice />} />
                  <Route path="offering-review-pricing" element={<OfferingReviewPricing />} />
                  <Route path="offering-discounts" element={<OfferingDiscounts />} />
                  <Route path="offering-availability" element={<OfferingAvailability />} />
                  <Route path="service-address" element={<ServiceAddress />} />
                  <Route path="service-what-provide" element={<ServiceWhatProvide />} />
                  <Route path="service-description" element={<ServiceDescription />} />
                  <Route path="propertydetails" element={<PropertyDetails />} />
                  <Route path="propertystructure" element={<PropertyStructure />} />
                  <Route path="privacytype" element={<PrivacyType />} />
                  <Route path="location" element={<Location />} />
                  <Route path="locationconfirmation" element={<LocationConfirmation />} />
                  <Route path="propertybasics" element={<PropertyBasics />} />
                  <Route path="bathroomtypes" element={<BathroomTypes />} />
                  <Route path="occupancy" element={<Occupancy />} />
                  <Route path="makeitstandout" element={<MakeItStandOut />} />
                  <Route path="amenities" element={<Amenities />} />
                  <Route path="photos" element={<Photos />} />
                  <Route path="titledescription" element={<TitleDescription />} />
                  <Route path="description" element={<Description />} />
                  <Route path="descriptiondetails" element={<DescriptionDetails />} />
                  <Route path="finishsetup" element={<FinishSetup />} />
                  <Route path="bookingsettings" element={<BookingSettings />} />
                  <Route path="guestselection" element={<GuestSelection />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="weekendpricing" element={<WeekendPricing />} />
                  <Route path="discounts" element={<Discounts />} />
                  <Route path="safetydetails" element={<SafetyDetails />} />
                  <Route path="finaldetails" element={<FinalDetails />} />
                  <Route path="payment" element={<Payment />} />
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
