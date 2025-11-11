import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Loading from '@/components/Loading';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
// File upload functionality removed - Storage not used
import { MessageSquare, Send, Search, User, Calendar, Home as HomeIcon, Image as ImageIcon, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Messages = () => {
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

  useEffect(() => {
    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current();
      }
    };
  }, []);

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

                return {
                  id: docSnap.id,
                  ...data,
                  otherParticipant,
                  listing,
                  lastMessageAt: data.lastMessageAt?.toDate?.() || new Date(0),
                  unreadCount: data.unreadCounts?.[auth.currentUser.uid] || 0
                };
              })
            );

            // Sort manually if orderBy failed
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

      conversationsUnsubscribeRef.current = unsubscribe;
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

  const loadMessages = (conversationId) => {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const senderId = data.senderId ? String(data.senderId) : '';
          
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
        
        setMessages(msgs);
        
        // Only scroll to bottom if this is not the initial load
        // Initial load happens when first selecting a conversation
        if (!isInitialLoadRef.current) {
          // New message received - scroll to see it
          shouldScrollRef.current = true;
        } else {
          // Mark initial load as complete
          isInitialLoadRef.current = false;
        }
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
    // File uploads disabled - Storage not used
    throw new Error('File uploads are not available. Storage is not enabled in this project.');
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

    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // File uploads disabled - Storage not used
    if (selectedFile) {
      toast.error('File uploads are not available. Please send text messages only.');
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    try {
      const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
      const messageData = {
        senderId: String(auth.currentUser.uid),
        text: String(newMessage.trim()),
        createdAt: serverTimestamp(),
        read: false
      };
      
      await addDoc(messagesRef, messageData);
      
      // Enable scrolling when user sends a message
      shouldScrollRef.current = true;

      // Update conversation last message
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      const otherParticipantId = selectedConversation.participants.find(id => id !== auth.currentUser.uid);
      
      await updateDoc(conversationRef, {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        [`unreadCounts.${otherParticipantId}`]: (selectedConversation.unreadCounts?.[otherParticipantId] || 0) + 1
      });

      setNewMessage('');
      removeSelectedFile();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
      setUploadingFile(false);
    } finally {
      // Always reset uploading state
      setUploadingFile(false);
    }
  };

  const startConversation = async (hostId, listingId = null) => {
    try {
      if (!auth.currentUser) return;

      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', auth.currentUser.uid)
      );

      const existingConvs = await getDocs(q);
      const existingConv = existingConvs.docs.find(
        docSnap => {
          const data = docSnap.data();
          return data.participants.includes(hostId) && 
                 data.participants.includes(auth.currentUser.uid) &&
                 (!listingId || data.listingId === listingId);
        }
      );

      if (existingConv) {
        setSelectedConversation({
          id: existingConv.id,
          ...existingConv.data(),
          participants: existingConv.data().participants
        });
        return;
      }

      // Create new conversation
      const newConversation = {
        participants: [auth.currentUser.uid, hostId],
        listingId: listingId || null,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        unreadCounts: {
          [auth.currentUser.uid]: 0,
          [hostId]: 0
        }
      };

      const docRef = await addDoc(conversationsRef, newConversation);
      const hostData = await getUserData(hostId);
      const listing = listingId ? await getListingData(listingId) : null;

      setSelectedConversation({
        id: docRef.id,
        ...newConversation,
        otherParticipant: hostData,
        listing
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
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
                      <p className="text-sm mt-2">Start a conversation from a listing page</p>
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
                        </div>
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
                                      {selectedConversation.otherParticipant?.firstName || 'Other User'}
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
                                      (currentUserProfile?.profileImage || currentUserProfile?.photoURL) ? (
                                        <>
                                          <img
                                            src={currentUserProfile.profileImage || currentUserProfile.photoURL}
                                            alt="You"
                                            className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                              if (e.target.nextSibling) {
                                                e.target.nextSibling.style.display = 'flex';
                                              }
                                            }}
                                          />
                                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center" style={{ display: 'none' }}>
                                            <User className="w-5 h-5 text-white" />
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                          <User className="w-5 h-5 text-white" />
                                        </div>
                                      )
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
                      {/* File upload disabled - Storage not used */}
                      <div className="flex gap-2">
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

export default Messages;

