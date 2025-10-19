import React from 'react';
import { useNavigate } from 'react-router-dom';

const PropertyDetails = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <img src="/logo.jpg" alt="Havenly" className="h-8" />
          <div className="flex items-center gap-6">
            <button className="hover:underline">Questions?</button>
            <button className="hover:underline">Save & exit</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-136px)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-[640px] px-20">
            <div className="mb-16">
              <span className="text-gray-600">Step 1</span>
              <h1 className="text-[32px] font-medium mb-4">Tell us about your place</h1>
              <p className="text-gray-600 text-lg">
                In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay.
              </p>
            </div>

            {/* Add your property form here */}
          </div>
        </div>

        {/* Right Side Illustration */}
        <div className="w-[50%] bg-gray-50 flex items-center justify-center">
          <img 
            src="/images/property-layout.png" 
            alt=""
            className="w-[85%] h-auto object-contain"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white">
        <div className="max-w-none">
          {/* Progress Bar */}
          <div className="h-1 w-full flex space-x-2">
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
          </div>
          
          <div className="px-8 py-6 border-t">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/become-host/steps')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className="bg-black text-white rounded-lg px-8 py-3.5 text-base font-medium"
                onClick={() => navigate('/pages/propertystructure')}
                // Remove the disabled attribute to make the button clickable
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PropertyDetails;