import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import OnboardingHeader from "@/pages/Host/onboarding/components/OnboardingHeader.jsx";


// Hosting steps data with Lordicon animation URLs
const steps = [
  {
    title: "Tell us about your place",
    description: "Share some basic info, like where it is and how many guests can stay.",
    animationUrl: "https://cdn.lordicon.com/dznelzdk.json" // House icon animation
  },
  {
    title: "Make it stand out",
    description: "Add 5 or more photos plus a title and description—we'll help you out.",
    animationUrl: "https://cdn.lordicon.com/rhrmfnhf.json" // Camera/photos animation
  },
  {
    title: "Finish up and publish",
    description: "Choose a starting price, verify a few details, then publish your listing.",
    animationUrl: "https://cdn.lordicon.com/hrtsficn.json" // Checkmark/publish animation
  }
];

const HostingSteps = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OnboardingHeader showProgress currentStep={1} totalSteps={3} />

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center py-24 px-6 md:px-12 gap-12">

        {/* Left Column: Steps */}
        <div className="flex-1 flex flex-col justify-center space-y-12">
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight">
            It's easy to get started on Getaways
          </h1>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-6 md:gap-8">
                <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary font-semibold text-primary flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-semibold">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                  <lord-icon
                    src={step.animationUrl}
                    trigger="loop"
                    colors="primary:#121331,secondary:#08a88a"
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Hero Image */}
        <div className="flex-1 hidden md:flex items-center justify-center">
          <img
            src="/assets/onboarding-hero.png"
            alt="Onboarding illustration"
            className="max-w-full rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center">
          <div className="flex-1 h-2 bg-gray-200 rounded-full mr-6">
            <div className="h-full bg-primary-600 w-[33%] transition-all duration-500 rounded-full" />
          </div>
          <button
            onClick={() => navigate("/pages/propertydetails")}
            className="bg-primary text-white rounded-lg px-8 py-3 font-medium hover:bg-primary-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </footer>
    </div>
  );
};

export default HostingSteps;
