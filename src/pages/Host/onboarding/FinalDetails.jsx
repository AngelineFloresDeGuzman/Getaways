import React, { useState } from 'react';
import OnboardingHeader from './components/OnboardingHeader';
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
      <OnboardingHeader />
      <main>
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