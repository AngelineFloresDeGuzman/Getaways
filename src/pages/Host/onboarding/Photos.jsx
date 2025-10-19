import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, X, Camera } from 'lucide-react';

const Photos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  // Get property type from navigation state, default to 'house'
  const propertyType = location.state?.propertyType?.toLowerCase() || 
                      location.state?.selectedType?.toLowerCase() ||
                      'house'; // Better default than 'place'
  
  // Debug: Log the location state and property type
  console.log('Photos - location.state:', location.state);
  console.log('Photos - propertyType:', propertyType);
  
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection
  const handleFileSelect = (files) => {
    const newPhotos = Array.from(files).map((file) => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle file input change
  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  // Remove photo
  const removePhoto = (photoId) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const canProceed = uploadedPhotos.length >= 5;

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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-[32px] font-medium text-gray-900 mb-4">
              Add some photos of your {propertyType}
            </h1>
            <p className="text-gray-600 text-lg">
              You'll need 5 photos to get started. You can add more or make changes later.
            </p>
          </div>

          {/* Photo Upload Area */}
          {uploadedPhotos.length === 0 ? (
            // Empty state with camera illustration
            <div className="max-w-2xl mx-auto">
              <div
                className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${
                  isDragging
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {/* Camera Illustration */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    {/* Camera body */}
                    <div className="w-24 h-16 bg-gray-400 rounded-lg relative">
                      {/* Lens */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gray-600 rounded-full">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gray-800 rounded-full">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full"></div>
                        </div>
                      </div>
                      {/* Flash */}
                      <div className="absolute top-2 right-3 w-2 h-2 bg-gray-600 rounded-sm"></div>
                      {/* Viewfinder */}
                      <div className="absolute -top-2 left-4 w-4 h-3 bg-gray-500 rounded-t"></div>
                    </div>
                    {/* Camera strap */}
                    <div className="absolute -top-1 left-2 right-2 h-1 bg-amber-700 rounded-full"></div>
                    <div className="absolute -top-2 left-6 right-6 h-0.5 bg-amber-800 rounded-full"></div>
                  </div>
                </div>

                <button
                  onClick={openFilePicker}
                  className="bg-white border border-black text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Add photos
                </button>
                
                <p className="text-gray-500 text-sm mt-4">
                  Choose at least 5 photos
                </p>
              </div>
            </div>
          ) : (
            // Photo grid when photos are uploaded
            <div className="space-y-6">
              {/* Upload progress */}
              <div className="text-center">
                <p className="text-gray-600">
                  {uploadedPhotos.length} of 5 photos uploaded
                </p>
                {!canProceed && (
                  <p className="text-sm text-gray-500 mt-1">
                    Add {5 - uploadedPhotos.length} more photos to continue
                  </p>
                )}
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {uploadedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add more photos button */}
                <button
                  onClick={openFilePicker}
                  className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Add more</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/amenities')}
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
                    // Navigate to photos preview
                    navigate('/pages/photos-preview', { 
                      state: { 
                        ...location.state,
                        photos: uploadedPhotos
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
              >
                {uploadedPhotos.length >= 5 ? 'Preview photos' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Photos;