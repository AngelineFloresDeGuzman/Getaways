import React, { useState } from 'react';
import { testFirestoreConnection, testFirestoreRead } from '@/lib/testFirestore';

const FirestoreTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setTestResult(null);
    
    console.log('🚀 Starting Firestore test...');
    
    // Test write
    const writeResult = await testFirestoreConnection();
    console.log('📝 Write test result:', writeResult);
    
    // Test read
    const readResult = await testFirestoreRead();
    console.log('📖 Read test result:', readResult);
    
    setTestResult({
      write: writeResult,
      read: readResult
    });
    
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Firestore Connection Test</h3>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test Firestore Connection'}
      </button>
      
      {testResult && (
        <div className="mt-4 space-y-3">
          <div className={`p-3 rounded ${testResult.write.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <strong>Write Test:</strong>
            <p>{testResult.write.success ? '✅ Success' : '❌ Failed'}</p>
            <p className="text-sm">{testResult.write.message || testResult.write.error}</p>
            {testResult.write.errorCode && (
              <p className="text-xs">Error Code: {testResult.write.errorCode}</p>
            )}
          </div>
          
          <div className={`p-3 rounded ${testResult.read.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <strong>Read Test:</strong>
            <p>{testResult.read.success ? '✅ Success' : '❌ Failed'}</p>
            <p className="text-sm">
              {testResult.read.success 
                ? `Found ${testResult.read.documentCount} documents`
                : testResult.read.error
              }
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded text-sm">
        <strong>Note:</strong> Check the browser console for detailed logs.
        <br />
        Make sure you're logged in before testing.
      </div>
    </div>
  );
};

export default FirestoreTest;