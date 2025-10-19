import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

const PhotosPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get photos from navigation state or use default empty array
  const [photos] = useState(location.state?.photos || []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Debug: Log the location state
  console.log('PhotosPreview - location.state:', location.state);

  if (photos.length === 0) {
    // If no photos, redirect back to photos upload
    navigate('/pages/photos');
    return null;
  }

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
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium text-gray-900 mb-2">
              Ta-da! How does this look?
            </h1>
            <p className="text-gray-600">
              Preview how your photos will appear to guests
            </p>
          </div>

          {/* Photo Grid Layout */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Main Large Photo */}
            <div className="relative">
              <img
                src={photos[selectedPhotoIndex]?.url}
                alt="Main preview"
                className="w-full h-[400px] object-cover"
              />
              {photos.length > 1 && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium">
                  {selectedPhotoIndex + 1} / {photos.length}
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            {photos.length > 1 && (
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotoIndex === index
                          ? 'border-[#FF385C] shadow-lg scale-105'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedPhotoIndex === index && (
                        <div className="absolute inset-0 bg-[#FF385C]/10 flex items-center justify-center">
                          <div className="w-4 h-4 bg-[#FF385C] rounded-full border-2 border-white"></div>
                        </div>
                      )}
                    </button>
                  ))}
                  
                  {/* Add More Photos Button */}
                  <button
                    onClick={() => navigate('/pages/photos')}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors group"
                  >
                    <div className="text-center">
                      <Plus className="w-6 h-6 mx-auto text-gray-400 group-hover:text-gray-600 mb-1" />
                      <span className="text-xs text-gray-500 group-hover:text-gray-700">Add more</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Photo Info */}
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
                  </h3>
                  <p className="text-sm text-gray-600">
                    {photos.length >= 5 
                      ? 'Great! You have enough photos to list your property.' 
                      : `You need ${5 - photos.length} more photo${5 - photos.length !== 1 ? 's' : ''} to continue.`
                    }
                  </p>
                </div>
                <button
                  onClick={() => navigate('/pages/photos')}
                  className="text-[#FF385C] hover:text-[#E31C5F] font-medium"
                >
                  Edit photos
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Dots for Mobile */}
          {photos.length > 1 && (
            <div className="flex justify-center mt-6 gap-2 sm:hidden">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    selectedPhotoIndex === index ? 'bg-[#FF385C]' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/photos')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  photos.length >= 5
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (photos.length >= 5) {
                    // Continue to next step with photos
                    navigate('/pages/title-description', { 
                      state: { 
                        ...location.state,
                        photos: photos
                      } 
                    });
                  }
                }}
                disabled={photos.length < 5}
              >
                {photos.length >= 5 ? 'Continue' : `Add ${5 - photos.length} more photo${5 - photos.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PhotosPreview;
