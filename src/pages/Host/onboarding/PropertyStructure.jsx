import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Building2 as Building,
  Warehouse,
  Hotel,
  Castle,
  Tent,
  CaravanIcon,
  House as Villa,
  Mountain,
  HomeIcon,
  LandmarkIcon
} from 'lucide-react';

const propertyTypes = [
  { icon: Home, label: 'House' },
  { icon: Building, label: 'Apartment' },
  { icon: Warehouse, label: 'Barn' },
  { icon: Hotel, label: 'Bed & breakfast' },
  { icon: Tent, label: 'Boat' },
  { icon: HomeIcon, label: 'Cabin' },
  { icon: CaravanIcon, label: 'Camper/RV' },
  { icon: Villa, label: 'Casa particular' },
  { icon: Castle, label: 'Castle' },
  { icon: Mountain, label: 'Cave' },
  { icon: Building, label: 'Container' },
  { icon: LandmarkIcon, label: 'Cycladic home' },
  { icon: Building, label: 'Dammuso' },  // Add this line
  { icon: Building, label: 'Dome' },
  { icon: HomeIcon, label: 'Earth home' },
  { icon: Warehouse, label: 'Farm' },
  { icon: Building, label: 'Guesthouse' },
  { icon: Building, label: 'Hotel' },
  { icon: HomeIcon, label: 'Houseboat' },
  { icon: HomeIcon, label: 'Kezhan' },
  { icon: Building, label: 'Minsu' },
  { icon: Building, label: 'Riad' },
  { icon: HomeIcon, label: 'Ryokan' },
  { icon: HomeIcon, label: "Shepherd's hut" },
  { icon: Tent, label: 'Tent' },
  { icon: HomeIcon, label: 'Tiny home' },
  { icon: Castle, label: 'Tower' },
  { icon: HomeIcon, label: 'Treehouse' },
  { icon: HomeIcon, label: 'Trullo' },
  { icon: Warehouse, label: 'Windmill' },
  { icon: Tent, label: 'Yurt' }
];

const PropertyStructure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedType, setSelectedType] = useState('');

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

      {/* Progress Bar at the top */}
      <div className="w-full">
        <div className="h-1 w-full flex space-x-2">
          <div className="h-full bg-gray-200 flex-1 relative">
            <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-[33.33%]"></div>
          </div>
          <div className="h-full bg-gray-200 flex-1"></div>
          <div className="h-full bg-gray-200 flex-1"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 px-8 pb-32">
        <div className="max-w-[1024px] mx-auto">
          <h1 className="text-[32px] font-medium text-gray-900 mb-12  text-center">
            Which of these best describes your place?
          </h1>

          <div className="grid grid-cols-3 gap-4">
            {propertyTypes.map((type) => (
              <button
                key={type.label}
                onClick={() => setSelectedType(type.label)}
                className={`flex flex-col items-center justify-center p-6 rounded-xl border hover:border-black transition-colors ${
                  selectedType === type.label
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <type.icon className="w-8 h-8 mb-2" />
                <span className="text-sm">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer with Progress Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="h-1 w-full flex space-x-2">
            <div className="h-full bg-gray-200 flex-1 relative">
              <div className="absolute left-0 top-0 h-full bg-[#FF385C] w-[33.33%]"></div>
            </div>
            <div className="h-full bg-gray-200 flex-1"></div>
            <div className="h-full bg-gray-200 flex-1"></div>
          </div>
          
          <div className="px-8 py-6 border-t">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/propertydetails')}
                className="hover:underline"
              >
                Back
              </button>
              <button 
                className={`rounded-lg px-8 py-3.5 text-base font-medium ${
                  selectedType
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => navigate('/pages/privacy-type', {
                  state: {
                    ...location.state,
                    propertyType: selectedType
                  }
                })}
                disabled={!selectedType}
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

export default PropertyStructure;