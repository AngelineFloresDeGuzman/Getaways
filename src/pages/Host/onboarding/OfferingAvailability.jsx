import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import OnboardingHeader from './components/OnboardingHeader';
import OnboardingFooter from './components/OnboardingFooter';
import { useOnboarding } from '@/pages/Host/contexts/OnboardingContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const OfferingAvailability = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useOnboarding();

  const [availableHours, setAvailableHours] = useState([
    {
      id: 'default',
      days: 'Monday - Friday',
      time: '9:00 AM - 5:00 PM',
      selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      fromTime: '9:00 AM',
      toTime: '5:00 PM',
    },
  ]);

  const [duration, setDuration] = useState('30');
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [editingHour, setEditingHour] = useState(null);
  const [offeringTitle, setOfferingTitle] = useState('');
  const [offeringImage, setOfferingImage] = useState('');
  
  // Modal state
  const [selectedDays, setSelectedDays] = useState([]);
  const [fromTime, setFromTime] = useState('9:00 AM');
  const [toTime, setToTime] = useState('5:00 PM');
  const [showFromTimeDropdown, setShowFromTimeDropdown] = useState(false);
  const [showToTimeDropdown, setShowToTimeDropdown] = useState(false);
  const [showDaysCollapsed, setShowDaysCollapsed] = useState(false); // false = expanded by default

  const durationOptions = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '150', label: '2.5 hours' },
    { value: '180', label: '3 hours' },
    { value: '210', label: '3.5 hours' },
    { value: '240', label: '4 hours' },
    { value: '270', label: '4.5 hours' },
    { value: '300', label: '5 hours' },
    { value: '330', label: '5.5 hours' },
    { value: '360', label: '6 hours' },
    { value: '390', label: '6.5 hours' },
    { value: '420', label: '7 hours' },
    { value: '450', label: '7.5 hours' },
    { value: '480', label: '8 hours' },
  ];

  // Ensure progress bar shows correct step
  useEffect(() => {
    if (actions?.setCurrentStep) {
      actions.setCurrentStep("offering-availability");
    }
  }, [actions]);

  // Load saved data from Firebase or location state
  useEffect(() => {
    const loadData = async () => {
      const draftId = state.draftId || location.state?.draftId;
      if (draftId) {
        try {
          const draftRef = doc(db, "onboardingDrafts", draftId);
          const draftSnap = await getDoc(draftRef);
          
          if (draftSnap.exists()) {
            const data = draftSnap.data().data || {};
            const offerings = data.serviceOfferings || [];
            
            // Find the current offering being edited
            const editingOfferingId = location.state?.editingOfferingId;
            if (editingOfferingId) {
              const offering = offerings.find(o => o.id === editingOfferingId);
              if (offering) {
                if (offering.availableHours) {
                  setAvailableHours(offering.availableHours);
                }
                if (offering.duration) {
                  setDuration(offering.duration);
                }
                if (offering.title) {
                  setOfferingTitle(offering.title);
                }
                if (offering.image) {
                  setOfferingImage(offering.image);
                }
              }
            } else {
              // Load from location state if creating new offering
              if (location.state?.tempOfferingTitle) {
                setOfferingTitle(location.state.tempOfferingTitle);
              }
              if (location.state?.tempOfferingPhoto) {
                setOfferingImage(location.state.tempOfferingPhoto);
              }
            }
          }
        } catch (error) {
          console.error("Error loading availability data:", error);
        }
      } else {
        // Load from location state if no draftId yet
        if (location.state?.tempOfferingTitle) {
          setOfferingTitle(location.state.tempOfferingTitle);
        }
        if (location.state?.tempOfferingPhoto) {
          setOfferingImage(location.state.tempOfferingPhoto);
        }
      }
    };

    loadData();
  }, [
    state.draftId || null, 
    location.state?.draftId || null, 
    location.state?.editingOfferingId || null
  ]);

  const handleDurationChange = (value) => {
    setDuration(value);
    setShowDurationDropdown(false);
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const timeOptions = [
    '12:00 AM', '12:15 AM', '12:30 AM', '12:45 AM',
    '1:00 AM', '1:15 AM', '1:30 AM', '1:45 AM',
    '2:00 AM', '2:15 AM', '2:30 AM', '2:45 AM',
    '3:00 AM', '3:15 AM', '3:30 AM', '3:45 AM',
    '4:00 AM', '4:15 AM', '4:30 AM', '4:45 AM',
    '5:00 AM', '5:15 AM', '5:30 AM', '5:45 AM',
    '6:00 AM', '6:15 AM', '6:30 AM', '6:45 AM',
    '7:00 AM', '7:15 AM', '7:30 AM', '7:45 AM',
    '8:00 AM', '8:15 AM', '8:30 AM', '8:45 AM',
    '9:00 AM', '9:15 AM', '9:30 AM', '9:45 AM',
    '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
    '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
    '1:00 PM', '1:15 PM', '1:30 PM', '1:45 PM',
    '2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM',
    '3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM',
    '4:00 PM', '4:15 PM', '4:30 PM', '4:45 PM',
    '5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM',
    '6:00 PM', '6:15 PM', '6:30 PM', '6:45 PM',
    '7:00 PM', '7:15 PM', '7:30 PM', '7:45 PM',
    '8:00 PM', '8:15 PM', '8:30 PM', '8:45 PM',
    '9:00 PM', '9:15 PM', '9:30 PM', '9:45 PM',
    '10:00 PM', '10:15 PM', '10:30 PM', '10:45 PM',
    '11:00 PM', '11:15 PM', '11:30 PM', '11:45 PM',
  ];

  const handleOpenHoursModal = (hour) => {
    if (hour) {
      // Editing existing hour
      setEditingHour(hour);
      setSelectedDays(hour.selectedDays || []);
      setFromTime(hour.fromTime || '9:00 AM');
      setToTime(hour.toTime || '5:00 PM');
    } else {
      // Creating new hour
      setEditingHour(null);
      setSelectedDays([]);
      setFromTime('9:00 AM');
      setToTime('5:00 PM');
    }
    setShowHoursModal(true);
  };

  const handleCloseHoursModal = () => {
    setShowHoursModal(false);
    setEditingHour(null);
    setShowFromTimeDropdown(false);
    setShowToTimeDropdown(false);
    setShowDaysCollapsed(false);
  };

  const handleDayToggle = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const formatDaysDisplay = (days) => {
    if (days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) {
      return 'Monday - Friday';
    }
    if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
      return 'Weekends';
    }
    // Sort days in order (create a copy to avoid mutating)
    const sortedDays = [...days].sort((a, b) => {
      return daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b);
    });
    return sortedDays.join(', ');
  };

  const handleSaveHours = () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    const daysDisplay = formatDaysDisplay(selectedDays);
    const timeDisplay = `${fromTime} - ${toTime}`;

    if (editingHour) {
      // Update existing hour
      setAvailableHours(prev => prev.map(hour =>
        hour.id === editingHour.id
          ? {
              ...hour,
              days: daysDisplay,
              time: timeDisplay,
              selectedDays: selectedDays,
              fromTime: fromTime,
              toTime: toTime,
            }
          : hour
      ));
    } else {
      // Add new hour
      const newHour = {
        id: Date.now().toString(),
        days: daysDisplay,
        time: timeDisplay,
        selectedDays: selectedDays,
        fromTime: fromTime,
        toTime: toTime,
      };
      setAvailableHours(prev => [...prev, newHour]);
    }

    handleCloseHoursModal();
  };

  const handleRemoveHours = () => {
    if (editingHour) {
      // Remove existing hour
      setAvailableHours(prev => prev.filter(hour => hour.id !== editingHour.id));
    }
    // If creating new hour, just close the modal (nothing to remove yet)
    handleCloseHoursModal();
  };

  const handleNext = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Update the offering in Firebase with availability data
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          let offerings = data.serviceOfferings || [];
          
          // Get offering ID from location state (passed from discounts page)
          let editingOfferingId = location.state?.editingOfferingId;
          
          // Fallback: If ID is not in location state, try to find it by matching title
          if (!editingOfferingId) {
            console.log("⚠️ No offering ID in location state, searching by title...");
            const currentOfferingTitle = offeringTitle || location.state?.tempOfferingTitle;
            if (currentOfferingTitle && offerings.length > 0) {
              const matchingOffering = offerings.find(o => o.title === currentOfferingTitle);
              if (matchingOffering) {
                editingOfferingId = matchingOffering.id;
                console.log("✅ Found offering by title:", editingOfferingId);
              } else {
                // If no match, use the most recent offering (last in array)
                editingOfferingId = offerings[offerings.length - 1]?.id;
                console.log("⚠️ Using most recent offering:", editingOfferingId);
              }
            } else if (offerings.length > 0) {
              // Last resort: use the most recent offering
              editingOfferingId = offerings[offerings.length - 1]?.id;
              console.log("⚠️ Using most recent offering as fallback:", editingOfferingId);
            }
          }
          
          if (!editingOfferingId) {
            console.error("❌ No offering ID found in location state or Firebase");
            console.log("Location state:", location.state);
            console.log("Offerings in Firebase:", offerings.map(o => ({ id: o.id, title: o.title })));
            // Still navigate even if we can't save
            navigate("/pages/your-offerings", {
              state: {
                draftId,
                category: "service",
                ...location.state,
              },
            });
            return;
          }

          // Find and update the offering
          const offeringIndex = offerings.findIndex(offering => offering.id === editingOfferingId);
          
          if (offeringIndex !== -1) {
            // Update existing offering with availability data
            const updatedOffering = {
              ...offerings[offeringIndex],
              availableHours: availableHours,
              duration: duration,
            };
            
            // Replace the offering in the array
            offerings[offeringIndex] = updatedOffering;
            
            await updateDoc(draftRef, {
              "data.serviceOfferings": offerings,
              lastModified: new Date(),
            });
            console.log("✅ Saved availability data to Firebase for offering:", editingOfferingId);
          } else {
            console.error("❌ Offering not found in Firebase with ID:", editingOfferingId);
            console.log("Available offerings:", offerings.map(o => ({ id: o.id, title: o.title })));
            
            // Try to create a new offering if it doesn't exist (fallback)
            console.log("⚠️ Creating new offering as fallback");
            const newOffering = {
              id: editingOfferingId,
              title: offeringTitle || location.state?.tempOfferingTitle || 'Untitled Offering',
              availableHours: availableHours,
              duration: duration,
            };
            offerings.push(newOffering);
            
            await updateDoc(draftRef, {
              "data.serviceOfferings": offerings,
              lastModified: new Date(),
            });
            console.log("✅ Created new offering with availability data");
          }
        }
      } catch (error) {
        console.error("Error saving availability data:", error);
      }
    }

    // Navigate back to Your offerings page
    navigate("/pages/your-offerings", {
      state: {
        draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const handleBack = () => {
    navigate("/pages/offering-discounts", {
      state: {
        draftId: state.draftId || location.state?.draftId,
        category: "service",
        ...location.state,
      },
    });
  };

  const canProceed = availableHours.length > 0 && duration;

  // Handle Save & Exit
  const handleSaveAndExit = async () => {
    const draftId = state.draftId || location.state?.draftId;

    // Save availability data before exiting
    if (draftId) {
      try {
        const draftRef = doc(db, "onboardingDrafts", draftId);
        const draftSnap = await getDoc(draftRef);
        
        if (draftSnap.exists()) {
          const data = draftSnap.data().data || {};
          let offerings = data.serviceOfferings || [];
          
          const editingOfferingId = location.state?.editingOfferingId;
          if (editingOfferingId) {
            offerings = offerings.map(offering =>
              offering.id === editingOfferingId
                ? {
                    ...offering,
                    availableHours: availableHours,
                    duration: duration,
                  }
                : offering
            );
            
            await updateDoc(draftRef, {
              "data.serviceOfferings": offerings,
              lastModified: new Date(),
            });
          }
        }
      } catch (error) {
        console.error("Error saving availability data:", error);
      }
    }

      navigate("/host/listings");
  };

  const selectedDurationLabel = durationOptions.find(opt => opt.value === duration)?.label || '30 minutes';

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <OnboardingHeader 
        showProgress={true} 
        currentStepNameOverride="offering-availability" 
        customSaveAndExit={handleSaveAndExit}
      />

      <main className="flex-1 flex items-start justify-center overflow-y-auto pt-32 pb-24 px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">
            When can guests book your offering?
          </h1>

          <div className="space-y-8">
            {/* Available Hours Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Available hours
              </h2>
              
              <div className="space-y-3">
                {availableHours.map((hour) => (
                  <div
                    key={hour.id}
                    onClick={() => handleOpenHoursModal(hour)}
                    className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{hour.days}</p>
                        <p className="text-sm text-gray-600 mt-1">{hour.time}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => handleOpenHoursModal(null)}
                  className="w-full bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="font-bold text-gray-900">Add time</span>
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Duration Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Duration
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Let guests know how long your service will last.
              </p>

              <div className="relative">
                <button
                  onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                  className="w-full bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <span className="font-bold text-gray-900">{selectedDurationLabel}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDurationDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDurationDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDurationDropdown(false)}
                    />
                    <div className="absolute z-20 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
                      {durationOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleDurationChange(option.value)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            duration === option.value ? 'bg-gray-50 font-bold' : ''
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Available Hours Modal */}
      {showHoursModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={handleCloseHoursModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <button
                onClick={handleCloseHoursModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Available hours</h2>
              <div className="w-5 h-5" /> {/* Spacer for centering */}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Offering Image and Title */}
              {offeringImage && (
                <div className="mb-4 flex flex-col items-center">
                  <img 
                    src={offeringImage} 
                    alt={offeringTitle || 'Offering'} 
                    className="w-16 h-16 rounded-lg object-cover mb-2"
                  />
                  {offeringTitle && (
                    <p className="font-bold text-gray-900 text-lg">{offeringTitle}</p>
                  )}
                </div>
              )}
              {!offeringImage && offeringTitle && (
                <div className="mb-4 text-center">
                  <p className="font-bold text-gray-900 text-lg">{offeringTitle}</p>
                </div>
              )}

              {/* Days Selection */}
              <div className="mb-6">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-3"
                  onClick={() => setShowDaysCollapsed(!showDaysCollapsed)}
                >
                  <label className="text-sm font-medium text-gray-700">Days</label>
                  {showDaysCollapsed ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {!showDaysCollapsed && (
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        onClick={() => handleDayToggle(day)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedDays.includes(day)
                            ? 'bg-white border-2 border-gray-900 text-gray-900'
                            : 'bg-gray-100 border-2 border-transparent text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                {/* From Time */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <button
                    onClick={() => {
                      setShowFromTimeDropdown(!showFromTimeDropdown);
                      setShowToTimeDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-lg font-medium text-gray-900">{fromTime}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showFromTimeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showFromTimeDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowFromTimeDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
                        {timeOptions.map((time) => (
                          <button
                            key={`from-${time}`}
                            onClick={() => {
                              setFromTime(time);
                              setShowFromTimeDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                              fromTime === time ? 'bg-gray-50 font-bold' : ''
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* To Time */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <button
                    onClick={() => {
                      setShowToTimeDropdown(!showToTimeDropdown);
                      setShowFromTimeDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-lg font-medium text-gray-900">{toTime}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showToTimeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showToTimeDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowToTimeDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
                        {timeOptions.map((time) => (
                          <button
                            key={`to-${time}`}
                            onClick={() => {
                              setToTime(time);
                              setShowToTimeDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                              toTime === time ? 'bg-gray-50 font-bold' : ''
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t sticky bottom-0 bg-white">
              <button
                onClick={handleRemoveHours}
                className="text-gray-900 hover:text-gray-700 transition-colors font-medium"
              >
                Remove
              </button>
              <button
                onClick={handleSaveHours}
                disabled={selectedDays.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ml-auto ${
                  selectedDays.length > 0
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardingFooter
        onBack={handleBack}
        onNext={handleNext}
        backText="Back"
        nextText="Next"
        canProceed={canProceed}
      />
    </div>
  );
};

export default OfferingAvailability;
