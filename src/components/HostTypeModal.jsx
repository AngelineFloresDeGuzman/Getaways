import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Home, Mountain, BellRing } from 'lucide-react';

const HostTypeModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/25 flex items-center justify-center z-50"
      onClick={handleOutsideClick}
    >
      <div className="bg-white rounded-xl w-[720px] relative"> {/* Increased width */}
        <button 
          onClick={onClose}
          className="absolute left-6 top-6" // Adjusted position
        >
          <X className="w-6 h-6" /> {/* Increased icon size */}
        </button>

        <div className="pt-16 pb-12 px-16"> {/* Increased padding */}
          <h2 className="text-[28px] text-center mb-14 font-medium"> {/* Increased text and margin */}
            What would you like to host?
          </h2>

          <div className="grid grid-cols-3 gap-8"> {/* Increased gap */}
            <button
              onClick={() => {
                navigate('/become-host/steps', { 
                  state: { 
                    hostType: 'accommodation',
                    steps: [
                      {
                        title: "Tell us about your place",
                        description: "Share some basic info, like where it is and how many guests can stay."
                      },
                      {
                        title: "Make it stand out",
                        description: "Add 5 or more photos plus a title and description—we'll help you out."
                      },
                      {
                        title: "Finish up and publish",
                        description: "Choose a starting price, verify a few details, then publish your listing."
                      }
                    ]
                  }
                });
                onClose();
              }}
              className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
            >
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <Home className="w-20 h-20 text-primary-600" /> {/* Increased icon size */}
              </div>
              <span className="text-lg font-medium">Accommodations</span> {/* Increased text size */}
            </button>

            <button
              onClick={() => {
                navigate('/hostonboarding?type=experience');
                onClose();
              }}
              className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
            >
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <Mountain className="w-20 h-20 text-primary-600" />
              </div>
              <span className="text-lg font-medium">Experiences</span>
            </button>

            <button
              onClick={() => {
                navigate('/hostonboarding?type=service');
                onClose();
              }}
              className="flex flex-col items-center p-8 border border-gray-200 rounded-2xl hover:border-gray-400 transition-all hover:shadow-sm"
            >
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <BellRing className="w-20 h-20 text-primary-600" />
              </div>
              <span className="text-lg font-medium">Services</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostTypeModal;