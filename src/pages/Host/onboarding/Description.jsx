import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Description = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get property type from navigation state, default to 'house'
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'house';
  
  const [selectedHighlights, setSelectedHighlights] = useState([]);

  const highlights = [
    { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
    { id: 'unique', label: 'Unique', icon: '✨' },
    { id: 'family-friendly', label: 'Family-friendly', icon: '👨‍👩‍👧‍👦' },
    { id: 'stylish', label: 'Stylish', icon: '🎨' },
    { id: 'central', label: 'Central', icon: '📍' },
    { id: 'spacious', label: 'Spacious', icon: '📐' }
  ];

  const toggleHighlight = (highlightId) => {
    setSelectedHighlights(prev => {
      if (prev.includes(highlightId)) {
        return prev.filter(id => id !== highlightId);
      } else if (prev.length < 2) {
        return [...prev, highlightId];
      }
      return prev;
    });
  };

  const canProceed = selectedHighlights.length >= 1;

  // Debug: Log the location state
  console.log('Description - location.state:', location.state);
  console.log('Description - propertyType:', propertyType);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b">
        <div className="py-4 px-8 flex justify-between items-center">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <path d="m16 1c2.008 0 3.978.378 5.813 1.114 1.837.736 3.525 1.798 4.958 3.138 1.433 1.34 2.56 2.92 3.355 4.628.795 1.709 1.2 3.535 1.2 5.394 0 1.859-.405 3.685-1.2 5.394-.795 1.708-1.922 3.288-3.355 4.628-1.433 1.34-3.121 2.402-4.958 3.138-1.835.736-3.805 1.114-5.813 1.114s-3.978-.378-5.813-1.114c-1.837-.736-3.525-1.798-4.958-3.138-1.433-1.34-2.56-2.92-3.355-4.628-.795-1.709-1.2-3.535-1.2-5.394 0-1.859.405-3.685 1.2-5.394.795-1.708 1.922-3.288 3.355-4.628 1.433-1.34 3.121-2.402 4.958-3.138 1.835-.736 3.805-1.114 5.813-1.114z" fill="rgb(255, 56, 92)"/>
          </svg>
          <div className="flex items-center gap-6">
            <button className="font-medium text-sm hover:underline">Questions?</button>
            <button className="font-medium text-sm hover:underline">Save & exit</button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-4">
              Next, let's describe your {propertyType}
            </h1>
            <p className="text-lg text-gray-600">
              Choose up to 2 highlights. We'll use these to get your description started.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {highlights.map((highlight) => (
                <button
                  key={highlight.id}
                  onClick={() => toggleHighlight(highlight.id)}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    selectedHighlights.includes(highlight.id)
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    !selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  disabled={!selectedHighlights.includes(highlight.id) && selectedHighlights.length >= 2}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{highlight.icon}</span>
                    <span className="text-lg font-medium">{highlight.label}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedHighlights.length > 0 && (
              <div className="text-center text-sm text-gray-500 mt-4">
                {selectedHighlights.length} of 2 highlights selected
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/title-description')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  canProceed
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (canProceed) {
                    // Continue to next step with description highlights
                    navigate('/pages/description-details', { 
                      state: { 
                        ...location.state,
                        highlights: selectedHighlights
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
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

export default Description;