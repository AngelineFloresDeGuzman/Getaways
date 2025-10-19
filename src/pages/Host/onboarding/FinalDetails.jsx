import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const FinalDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [address, setAddress] = useState({
    country: 'Philippines',
    unit: '',
    building: '',
    street: '',
    barangay: '',
    city: '',
    zipCode: '',
    province: ''
  });
  
  const [isBusinessHost, setIsBusinessHost] = useState(null);

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const canProceed = address.street && address.city && address.province && isBusinessHost !== null;

  // Debug: Log the location state
  console.log('FinalDetails - location.state:', location.state);

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
          <div className="mb-12">
            <h1 className="text-3xl font-medium text-gray-900 mb-8">
              Provide a few final details
            </h1>
            
            {/* Address Section */}
            <div className="mb-12">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                What's your residential address?
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Guests won't see this information.
              </p>

              <div className="space-y-4">
                {/* Country Dropdown */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Country / region</label>
                  <select
                    value={address.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="Philippines">Philippines</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>

                {/* Unit */}
                <input
                  type="text"
                  placeholder="Unit, level, etc. (if applicable)"
                  value={address.unit}
                  onChange={(e) => handleAddressChange('unit', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* Building Name */}
                <input
                  type="text"
                  placeholder="Building name (if applicable)"
                  value={address.building}
                  onChange={(e) => handleAddressChange('building', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* Street Address */}
                <input
                  type="text"
                  placeholder="Street address"
                  value={address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* Barangay */}
                <input
                  type="text"
                  placeholder="Barangay / district (if applicable)"
                  value={address.barangay}
                  onChange={(e) => handleAddressChange('barangay', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* City */}
                <input
                  type="text"
                  placeholder="City / municipality"
                  value={address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* ZIP Code */}
                <input
                  type="text"
                  placeholder="ZIP code"
                  value={address.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* Province */}
                <input
                  type="text"
                  placeholder="Province"
                  value={address.province}
                  onChange={(e) => handleAddressChange('province', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            {/* Business Hosting Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Are you hosting as a business?
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                This means your business is most likely registered with your state or government.{' '}
                <button className="text-black underline hover:no-underline">
                  Get details
                </button>
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsBusinessHost(true)}
                  className={`flex-1 py-3 px-6 rounded-lg border text-center transition-colors ${
                    isBusinessHost === true
                      ? 'border-black bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setIsBusinessHost(false)}
                  className={`flex-1 py-3 px-6 rounded-lg border text-center transition-colors ${
                    isBusinessHost === false
                      ? 'border-black bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-none">
          <div className="px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/pages/safety-details')}
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
                    // Create listing - final step
                    navigate('/host/HostDashboard', { 
                      state: { 
                        ...location.state,
                        residentialAddress: address,
                        isBusinessHost: isBusinessHost
                      } 
                    });
                  }
                }}
                disabled={!canProceed}
              >
                Create listing
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FinalDetails;