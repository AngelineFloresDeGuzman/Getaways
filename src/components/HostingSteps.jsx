import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const HostingSteps = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <img src="/logo.jpg" alt="Getaways" className="h-8" />
          <button 
            onClick={() => navigate('/')}
            className="text-black hover:bg-gray-100 rounded-lg px-4 py-2"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-136px)]">
        <div className="max-w-7xl mx-auto px-24">
          <div className="grid grid-cols-2 items-center gap-24 w-full">
            <h1 className="text-[48px] leading-[1.1] font-medium">
              It's easy to get started on Getaways
            </h1>

            <div className="space-y-20">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className="mt-0 mr-6">
                    <div className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 mr-6">
                    <h3 className="text-[22px] font-semibold mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-lg">{step.description}</p>
                  </div>
                  <div className="w-24 h-24 flex-shrink-0">
                    <img src={step.image} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 w-full">
            <div className="h-full bg-primary-600 w-0 transition-all duration-300"></div>
          </div>
          
          <div className="px-8 py-6">
            <div className="flex justify-end">
              <button 
                onClick={() => navigate('/pages/propertydetails')}
                className="bg-primary text-white rounded-lg px-8 py-3.5 text-base font-medium transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Add steps data
const steps = [
  {
    title: "Tell us about your place",
    description: "Share some basic info, like where it is and how many guests can stay.",
    image: "/images/step1.png"
  },
  {
    title: "Make it stand out",
    description: "Add 5 or more photos plus a title and description—we'll help you out.",
    image: "/images/step2.png"
  },
  {
    title: "Finish up and publish",
    description: "Choose a starting price, verify a few details, then publish your listing.",
    image: "/images/step3.png"
  }
];

export default HostingSteps;