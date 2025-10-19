import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HostLoginModal = ({ isOpen, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp) {
      // Sign up validation
      if (!name || !email || !password || !confirmPassword) {
        setError('All fields are required');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      // Simulate email verification
      setIsVerifying(true);
    } else {
      // Login validation
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
      
      // Simulate successful login
      // In a real app, you would verify credentials with your backend
      navigateToHostDashboard();
    }
  };
  
  const handleVerifyCode = () => {
    // Simulate verification code check
    if (verificationCode === '123456') {
      navigateToHostDashboard();
    } else {
      setError('Invalid verification code');
    }
  };
  
  const navigateToHostDashboard = () => {
    // Close modal and navigate to host dashboard
    onClose();
    navigate('/host/dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isVerifying ? 'Verify Your Email' : (isSignUp ? 'Create a Host Account' : 'Sign In to Your Host Account')}
          </h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {isVerifying ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">
                We've sent a verification code to your email. Please enter it below to verify your account.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter 6-digit code"
                />
              </div>
              <button
                onClick={handleVerifyCode}
                className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Verify & Continue
              </button>
              <p className="text-sm text-center text-gray-500">
                Didn't receive a code? <button className="text-primary hover:underline">Resend</button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
              
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>
          )}
          
          {!isVerifying && (
            <div className="mt-4 text-center text-sm">
              {isSignUp ? (
                <p>
                  Already have an account?{' '}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="text-primary hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostLoginModal;