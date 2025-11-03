import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MessageSquare, Send, Search, User, Home as HomeIcon, Calendar, Paperclip, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const HostMessages = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationsUnsubscribeRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load current user's profile for avatar
        const profileData = await getUserData(currentUser.uid);
        setCurrentUserProfile(profileData);
        loadConversations();
      } else {
        navigate('/login');
        setCurrentUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Check if there's a conversation ID in URL params to auto-select, or select most recent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation');
    
    if (conversations.length > 0 && !selectedConversation) {
      if (conversationId) {
        // If URL has conversation param, select that one
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
          return;
        }
      }
      
      // If no conversation selected and conversations are loaded, select the most recent one
      // Conversations are already sorted by lastMessageAt descending
      setSelectedConversation(conversations[0]);
    }
  }, [conversations]);

  // Cleanup conversations listener on unmount
  useEffect(() => {
    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      // Don't scroll on initial conversation selection
      shouldScrollRef.current = false;
      isInitialLoadRef.current = true;
      loadMessages(selectedConversation.id);
      markConversationAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    // Only scroll to bottom if user manually sent a message or explicitly wants to see latest
    // Don't auto-scroll on initial load or conversation switch
    if (shouldScrollRef.current) {
      scrollToBottom();
      shouldScrollRef.current = false; // Reset after scrolling
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const conversationsRef = collection(db, 'conversations');
      
      // Start with simple query (no orderBy) to avoid index requirement
      // We'll sort manually after fetching
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        q, 
        async (snapshot) => {
          try {
            const convos = await Promise.all(
              snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const otherParticipantId = data.participants?.find(id => id !== auth.currentUser.uid);
                const otherParticipant = otherParticipantId ? await getUserData(otherParticipantId) : { id: 'unknown', firstName: 'Unknown', lastName: 'User' };
                const listing = data.listingId ? await getListingData(data.listingId) : null;
                const booking = data.bookingId ? await getBookingData(data.bookingId) : null;

                return {
                  id: docSnap.id,
                  ...data,
                  otherParticipant,
                  listing,
                  booking,
                  lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(0),
                  unreadCount: data.unreadCounts?.[auth.currentUser.uid] || 0
                };
              })
            );

            // Sort manually by lastMessageAt descending
            convos.sort((a, b) => {
              const aDate = a.lastMessageAt || new Date(0);
              const bDate = b.lastMessageAt || new Date(0);
              return bDate - aDate;
            });

            setConversations(convos);
            setLoading(false);
          } catch (error) {
            console.error('Error processing conversations:', error);
            setConversations([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error in conversations snapshot:', error);
          
          // Check if it's a permission error
          if (error.code === 'permission-denied') {
            console.error('Permission denied: Please check Firestore rules allow reading conversations');
            toast.error('Permission denied: Cannot load conversations. Please check Firebase rules.');
          } else if (error.code === 'failed-precondition' && error.message?.includes('index')) {
            // This shouldn't happen now since we're not using orderBy, but just in case
            console.warn('⚠️ Index error (unexpected since we removed orderBy)');
          }
          
          setConversations([]);
          setLoading(false);
        }
      );

      // Store unsubscribe function for cleanup
      conversationsUnsubscribeRef.current = unsubscribe;
      
      // Also return it for immediate cleanup if needed
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      setLoading(false);
    }
  };

  const getUserData = async (userId) => {
    if (!userId) {
      return { id: 'unknown', firstName: 'Unknown', lastName: 'User', email: 'unknown@example.com' };
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { id: userId, ...userDoc.data() };
      }
      return { id: userId, firstName: 'Unknown', lastName: 'User', email: 'unknown@example.com' };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { id: userId, firstName: 'Unknown', lastName: 'User', email: 'unknown@example.com' };
    }
  };

  const getListingData = async (listingId) => {
    try {
      const listingDoc = await getDoc(doc(db, 'listings', listingId));
      if (listingDoc.exists()) {
        const data = listingDoc.data();
        const photos = data.photos || [];
        return {
          id: listingId,
          title: data.title || 'Untitled Listing',
          mainImage: photos[0]?.base64 || photos[0]?.url || null,
          location: data.location || data.locationDisplay || 'Unknown location'
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching listing data:', error);
      return null;
    }
  };

  const getBookingData = async (bookingId) => {
    try {
      const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
      if (bookingDoc.exists()) {
        const data = bookingDoc.data();
        return {
          id: bookingId,
          checkInDate: data.checkInDate?.toDate ? data.checkInDate.toDate() : null,
          checkOutDate: data.checkOutDate?.toDate ? data.checkOutDate.toDate() : null,
          status: data.status || 'pending',
          guests: data.guests || 1
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching booking data:', error);
      return null;
    }
  };

  const loadMessages = (conversationId) => {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const senderId = data.senderId ? String(data.senderId) : '';
          
          // Debug: Log raw data for first message
          if (snapshot.docs.indexOf(docSnap) === 0) {
            console.log('📨 First message raw data:', {
              docId: docSnap.id,
              rawSenderId: data.senderId,
              stringSenderId: senderId,
              rawData: data
            });
          }
          
          return {
            id: docSnap.id,
            senderId: senderId, // Ensure it's always a string
            text: String(data.text || ''),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            read: data.read || false,
            imageUrl: data.imageUrl || null,
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || null
          };
        });
        
        // Debug: Log message senderIds summary (first 3 only)
        if (msgs.length > 0) {
          const uniqueSenderIds = [...new Set(msgs.map(m => m.senderId))];
          console.log('📬 Message summary:', {
            totalMessages: msgs.length,
            uniqueSenders: uniqueSenderIds.length,
            currentUserId: auth.currentUser?.uid?.substring(0, 8) + '...',
            allFromSameUser: uniqueSenderIds.length === 1 && uniqueSenderIds[0] === auth.currentUser?.uid
          });
        }
        
        setMessages(msgs);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCounts.${auth.currentUser.uid}`]: 0
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate conversation is selected
    if (!selectedConversation || !selectedConversation.id) {
      toast.error('Please select a conversation first');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type) {
      toast.error('Invalid file type');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    console.log('📎 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      conversationId: selectedConversation.id
    });

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.onerror = () => {
        console.error('Error reading file for preview');
        toast.error('Failed to preview image');
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file) => {
    // Validate that we have a selected conversation
    if (!selectedConversation || !selectedConversation.id) {
      throw new Error('No conversation selected. Please select a conversation first.');
    }

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `messages/${selectedConversation.id}/${fileName}`;
      const fileRef = ref(storage, filePath);
      
      console.log('📤 Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        conversationId: selectedConversation.id,
        filePath: filePath
      });

      const metadata = {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      };
      
      // Add timeout to prevent hanging
      const uploadPromise = uploadBytes(fileRef, file, metadata);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - please check Firebase Storage rules')), 30000)
      );
      
      await Promise.race([uploadPromise, timeoutPromise]);
      console.log('✅ File uploaded successfully, getting download URL...');
      const downloadURL = await getDownloadURL(fileRef);
      console.log('✅ Download URL obtained:', downloadURL.substring(0, 50) + '...');
      return { url: downloadURL, fileName: file.name, fileType: file.type };
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Check for CORS/network errors
      const errorMessage = error.message || '';
      const errorCode = error.code || '';
      const errorString = JSON.stringify(error);
      
      // CORS errors typically show up as network failures or contain CORS in message
      if (errorMessage.includes('CORS') || 
          errorMessage.includes('ERR_FAILED') ||
          errorMessage.includes('blocked') ||
          errorCode === 'storage/unauthorized' || 
          errorCode === 'storage/unknown' ||
          errorCode === 'storage/quota-exceeded' ||
          errorString.includes('CORS')) {
        const corsError = new Error('Firebase Storage Rules Error: Please configure Firebase Storage rules in Firebase Console to allow authenticated uploads. Go to Storage → Rules and add: allow read, write: if request.auth != null;');
        corsError.code = error.code || 'storage/cors-error';
        corsError.originalError = error;
        throw corsError;
      }
      
      // Network errors
      if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        const networkError = new Error('Network error: Please check your internet connection and try again.');
        networkError.code = 'network-error';
        throw networkError;
      }
      
      throw error;
    }
  };

  const sendMessage = async () => {
    // Validate prerequisites
    if (!auth.currentUser) {
      toast.error('You must be logged in to send messages');
      return;
    }

    if (!selectedConversation || !selectedConversation.id) {
      toast.error('Please select a conversation first');
      return;
    }

    if (!newMessage.trim() && !selectedFile) {
      toast.error('Please enter a message or select a file');
      return;
    }

    // Validate file before proceeding
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!selectedFile.type) {
        toast.error('Invalid file type');
        return;
      }
    }

    try {
      setUploadingFile(true);
      let fileData = null;

      // Upload file if one is selected
      if (selectedFile) {
        try {
          console.log('📤 Attempting to upload file:', selectedFile.name, 'Type:', selectedFile.type, 'Size:', selectedFile.size);
          fileData = await uploadFile(selectedFile);
          console.log('✅ File upload successful:', fileData);
        } catch (error) {
          console.error('❌ File upload error:', error);
          console.error('❌ Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          
          // Check if it's a CORS/permission error
          const errorMessage = error.message || '';
          if (error.code === 'storage/unauthorized' || 
              error.code === 'storage/cors-error' ||
              error.code === 'storage/unknown' ||
              errorMessage.includes('CORS') || 
              errorMessage.includes('Storage Rules') ||
              errorMessage.includes('blocked') ||
              errorMessage.includes('permission') ||
              errorMessage.includes('ERR_FAILED')) {
            toast.error('File upload failed: Please check Firebase Storage rules. Go to Firebase Console → Storage → Rules and ensure authenticated users can write to the messages folder.');
          } else if (errorMessage.includes('timeout')) {
            toast.error('Upload timeout: The file may be too large or there\'s a network issue. Please try again.');
          } else if (errorMessage.includes('No conversation selected')) {
            toast.error('Please select a conversation first');
          } else {
            toast.error('Failed to upload file: ' + (errorMessage || 'Unknown error. Please check console for details.'));
          }
          setUploadingFile(false);
          return;
        }
      }

      const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
      const messageData = {
        senderId: String(auth.currentUser.uid),
        text: String(newMessage.trim()),
        createdAt: serverTimestamp(),
        read: false,
        ...(fileData && fileData.fileType.startsWith('image/') && {
          imageUrl: fileData.url
        }),
        ...(fileData && !fileData.fileType.startsWith('image/') && {
          fileUrl: fileData.url,
          fileName: fileData.fileName,
          fileType: fileData.fileType
        })
      };
      
      await addDoc(messagesRef, messageData);

      // Update conversation last message
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      const otherParticipantId = selectedConversation.participants.find(id => id !== auth.currentUser.uid);
      
      let lastMessageText = newMessage.trim();
      if (!lastMessageText && fileData) {
        lastMessageText = fileData.fileType.startsWith('image/') ? '📷 Image' : `📎 ${fileData.fileName}`;
      }
      
      await updateDoc(conversationRef, {
        lastMessage: lastMessageText,
        lastMessageAt: serverTimestamp(),
        [`unreadCounts.${otherParticipantId}`]: (selectedConversation.unreadCounts?.[otherParticipantId] || 0) + 1
      });

      setNewMessage('');
      removeSelectedFile();
      setUploadingFile(false);
      shouldScrollRef.current = true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
      setUploadingFile(false);
    } finally {
      // Always reset uploading state
      setUploadingFile(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now - msgDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return msgDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatBookingDates = (booking) => {
    if (!booking || !booking.checkInDate || !booking.checkOutDate) return null;
    const checkIn = booking.checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const checkOut = booking.checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${checkIn} - ${checkOut}`;
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.otherParticipant?.firstName?.toLowerCase().includes(searchLower) ||
      conv.otherParticipant?.lastName?.toLowerCase().includes(searchLower) ||
      conv.otherParticipant?.email?.toLowerCase().includes(searchLower) ||
      conv.listing?.title?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen pt-36">
          <p className="text-foreground">Loading messages...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-36 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex h-full">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-foreground">Messages</h1>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No conversations yet</p>
                      <p className="text-sm mt-2">Guests will start conversations when they have questions</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConversation?.id === conversation.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                            {(conversation.otherParticipant?.profileImage || conversation.otherParticipant?.photoURL) ? (
                              <img
                                src={conversation.otherParticipant.profileImage || conversation.otherParticipant.photoURL}
                                alt={`${conversation.otherParticipant?.firstName || ''} ${conversation.otherParticipant?.lastName || ''}`}
                                className="w-full h-full object-cover absolute inset-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const icon = e.target.parentElement?.querySelector('.user-icon');
                                  if (icon) icon.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <User className={`w-6 h-6 text-primary user-icon ${(conversation.otherParticipant?.profileImage || conversation.otherParticipant?.photoURL) ? 'hidden' : ''}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-foreground truncate">
                                {conversation.otherParticipant?.firstName} {conversation.otherParticipant?.lastName}
                              </h3>
                              {conversation.unreadCount > 0 && (
                                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            {conversation.listing && (
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <HomeIcon className="w-3 h-3" />
                                {conversation.listing.title}
                              </p>
                            )}
                            {conversation.booking && (
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatBookingDates(conversation.booking)}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage || 'No messages yet'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(conversation.lastMessageAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
                            {(selectedConversation.otherParticipant?.profileImage || selectedConversation.otherParticipant?.photoURL) ? (
                              <img
                                src={selectedConversation.otherParticipant.profileImage || selectedConversation.otherParticipant.photoURL}
                                alt={`${selectedConversation.otherParticipant?.firstName || ''} ${selectedConversation.otherParticipant?.lastName || ''}`}
                                className="w-full h-full object-cover absolute inset-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const icon = e.target.parentElement?.querySelector('.user-icon');
                                  if (icon) icon.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <User className={`w-5 h-5 text-primary user-icon ${(selectedConversation.otherParticipant?.profileImage || selectedConversation.otherParticipant?.photoURL) ? 'hidden' : ''}`} />
                          </div>
                          <div>
                            <h2 className="font-semibold text-foreground">
                              {selectedConversation.otherParticipant?.firstName} {selectedConversation.otherParticipant?.lastName}
                            </h2>
                            {selectedConversation.listing && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <HomeIcon className="w-3 h-3" />
                                {selectedConversation.listing.title}
                              </p>
                            )}
                            {selectedConversation.booking && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatBookingDates(selectedConversation.booking)}</span>
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                                  {selectedConversation.booking.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {selectedConversation.listing && (
                          <button
                            onClick={() => navigate(`/accommodations/${selectedConversation.listing.id}`)}
                            className="btn-outline px-4 py-2 text-sm"
                          >
                            View Listing
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col"
                    >
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((message, index) => {
                          // Get current user ID - prefer auth.currentUser as it's most reliable
                          const currentUserId = auth.currentUser?.uid || user?.uid;
                          
                          // Ensure both are strings for comparison
                          const messageSenderId = String(message.senderId || '').trim();
                          const currentUser = String(currentUserId || '').trim();
                          
                          // Compare senderId with current user ID
                          const isOwn = messageSenderId === currentUser && messageSenderId !== '' && currentUser !== '';
                          
                          // Debug: Log first message only for verification
                          if (index === 0 && selectedConversation) {
                            console.log('💬 First message alignment check:', {
                              senderId: messageSenderId.substring(0, 8) + '...',
                              currentUserId: currentUser.substring(0, 8) + '...',
                              isOwn,
                              participants: selectedConversation.participants?.map(p => p.substring(0, 8) + '...')
                            });
                          }
                          
                          const prevMessage = index > 0 ? messages[index - 1] : null;
                          const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;
                          
                          return (
                            <div
                              key={message.id}
                              className={`w-full flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'} ${isOwn ? 'pl-[15%]' : 'pr-[15%]'}`}
                              style={{
                                justifyContent: isOwn ? 'flex-end' : 'flex-start'
                              }}
                            >
                              <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`} style={{ maxWidth: '85%' }}>
                                {/* Avatar - left side for other person */}
                                {!isOwn && (
                                  <div className="flex-shrink-0">
                                    {showAvatar ? (
                                      (selectedConversation.otherParticipant?.profileImage || selectedConversation.otherParticipant?.photoURL) ? (
                                        <img
                                          src={selectedConversation.otherParticipant.profileImage || selectedConversation.otherParticipant.photoURL}
                                          alt={`${selectedConversation.otherParticipant?.firstName || 'User'}`}
                                          className="w-8 h-8 rounded-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            if (e.target.nextSibling) {
                                              e.target.nextSibling.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <User className="w-5 h-5 text-primary" />
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-8 h-8" />
                                    )}
                                  </div>
                                )}
                                
                                {/* Message bubble */}
                                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                  {showAvatar && !isOwn && (
                                    <span className="text-xs text-muted-foreground mb-1 px-1">
                                      {selectedConversation.otherParticipant?.firstName || 'Guest'}
                                    </span>
                                  )}
                                  {showAvatar && isOwn && (
                                    <span className="text-xs text-muted-foreground mb-1 px-1">
                                      You
                                    </span>
                                  )}
                                  <div
                                    className={`px-4 py-2 rounded-2xl ${
                                      isOwn
                                        ? 'bg-primary text-white rounded-br-sm'
                                        : 'bg-white text-foreground border border-gray-200 rounded-bl-sm shadow-sm'
                                    }`}
                                  >
                                    {/* Display image if present */}
                                    {message.imageUrl && (
                                      <div className="mb-2">
                                        <img
                                          src={message.imageUrl}
                                          alt="Shared image"
                                          className="max-w-xs rounded-lg cursor-pointer"
                                          onClick={() => window.open(message.imageUrl, '_blank')}
                                        />
                                      </div>
                                    )}
                                    {/* Display file if present */}
                                    {message.fileUrl && !message.imageUrl && (
                                      <div className="mb-2">
                                        <a
                                          href={message.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                                            isOwn
                                              ? 'bg-white/10 hover:bg-white/20'
                                              : 'bg-gray-100 hover:bg-gray-200'
                                          }`}
                                        >
                                          <Paperclip className="w-4 h-4" />
                                          <span className="text-sm truncate max-w-xs">{message.fileName || 'Download file'}</span>
                                        </a>
                                      </div>
                                    )}
                                    {message.text && (
                                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                    )}
                                    <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-muted-foreground'}`}>
                                      {formatTime(message.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Avatar - right side for own messages */}
                                {isOwn && (
                                  <div className="flex-shrink-0">
                                    {showAvatar ? (
                                      <>
                                        {currentUserProfile?.profileImage || currentUserProfile?.photoURL ? (
                                          <img
                                            src={currentUserProfile.profileImage || currentUserProfile.photoURL}
                                            alt="You"
                                            className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'flex';
                                            }}
                                          />
                                        ) : null}
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center" style={{ display: currentUserProfile?.profileImage || currentUserProfile?.photoURL ? 'none' : 'flex' }}>
                                          <User className="w-5 h-5 text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-8 h-8" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                      {/* File Preview */}
                      {filePreview && (
                        <div className="mb-2 relative inline-block">
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="max-w-xs max-h-32 rounded-lg"
                          />
                          <button
                            onClick={removeSelectedFile}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {selectedFile && !filePreview && (
                        <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                          <Paperclip className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700 flex-1 truncate">{selectedFile.name}</span>
                          <button
                            onClick={removeSelectedFile}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          className="hidden"
                        />
                        <button
                          onClick={() => {
                            if (!selectedConversation) {
                              toast.error('Please select a conversation first');
                              return;
                            }
                            fileInputRef.current?.click();
                          }}
                          disabled={!selectedConversation || uploadingFile}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!selectedConversation ? "Select a conversation first" : "Attach file"}
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !uploadingFile) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={uploadingFile}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={(!newMessage.trim() && !selectedFile) || uploadingFile}
                          className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingFile ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg">Select a conversation to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HostMessages;

