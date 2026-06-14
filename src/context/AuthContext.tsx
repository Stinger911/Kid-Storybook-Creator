import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { processPages, isDataUrl } from '../utils/bookStorage';
import { KidBook, BookPage } from '../types';

// Extend profile configuration
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  subscriptionStatus: 'free' | 'premium';
  subscriptionExpiresAt: string | null;
  role: 'user' | 'admin';
  manuallyUpgraded?: boolean;
  stripeSubscriptionId?: string | null;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  libraryMode: 'local' | 'cloud';
  showPremiumModal: boolean;
  setShowPremiumModal: (show: boolean) => void;
  showLab18Modal: boolean;
  setShowLab18Modal: (show: boolean) => void;
  loginWithGoogle: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  simulateUpgrade: () => Promise<void>;
  updateUserRole: (userId: string, targetRole: 'user' | 'admin') => Promise<void>;
  updateUserSubscription: (userId: string, status: 'free' | 'premium') => Promise<void>;
  
  // Book cloud operations
  cloudBooks: KidBook[];
  publicBooks: KidBook[];
  saveBookToStore: (book: KidBook) => Promise<KidBook>;
  deleteBookFromStore: (bookId: string) => Promise<void>;
  toggleBookPublicity: (bookId: string, isPublic: boolean) => Promise<void>;
  
  // Admin dashboard metrics & operations
  adminUsers: UserProfile[];
  adminBooks: KidBook[];
  loadingAdminData: boolean;
  fetchAdminData: () => Promise<void>;
  moderateBookStatus: (bookId: string, status: 'pending' | 'approved' | 'rejected') => Promise<void>;
  deleteUserByAdmin: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [libraryMode, setLibraryMode] = useState<'local' | 'cloud'>('local');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLab18Modal, setShowLab18Modal] = useState(false);
  const [cloudBooks, setCloudBooks] = useState<KidBook[]>([]);
  const [publicBooks, setPublicBooks] = useState<KidBook[]>([]);
  
  // Admin state
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminBooks, setAdminBooks] = useState<KidBook[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  // Track book IDs already in Firestore to avoid a getDoc round-trip on every save.
  const knownBookIds = useRef<Set<string>>(new Set());

  // Monitor auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        setLibraryMode('cloud');
        // Fetch or create Firestore profile
        await syncUserWithFirestore(fUser);
      } else {
        setLibraryMode('local');
        setUserProfile(null);
        setCloudBooks([]);
        knownBookIds.current.clear();
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Monitor cloud books for logged-in user
  useEffect(() => {
    if (!firebaseUser) return;
    
    const q = query(
      collection(db, 'books'), 
      where('userId', '==', firebaseUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const books: KidBook[] = [];
      snapshot.forEach((docSnap) => {
        knownBookIds.current.add(docSnap.id);
        const data = docSnap.data();
        books.push({
          id: docSnap.id,
          title: data.title || '',
          author: data.author || '',
          createdAt: (data.createdAt && typeof data.createdAt.seconds === 'number') ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
          themeColor: data.themeColor || 'from-sky-100 to-indigo-100',
          pages: data.pages || []
        });
      });
      // Sort books by title/created
      setCloudBooks(books);
    }, (error) => {
      console.warn('[Firebase AuthContext] Cloud books permissions rejected or offline. Gracefully falling back to local mode.', error);
      setLibraryMode('local');
      setCloudBooks([]);
    });

    return unsubscribe;
  }, [firebaseUser]);

  // Monitor public books (Community library)
  useEffect(() => {
    if (!firebaseUser) {
      setPublicBooks([]);
      return;
    }

    const q = query(
      collection(db, 'books'),
      where('isPublic', '==', true),
      where('moderationStatus', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const books: KidBook[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        books.push({
          id: docSnap.id,
          title: data.title || '',
          author: data.author || '',
          createdAt: (data.createdAt && typeof data.createdAt.seconds === 'number') ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Library book',
          themeColor: data.themeColor || 'from-sky-100 to-indigo-100',
          pages: data.pages || []
        });
      });
      setPublicBooks(books);
    }, (error) => {
      console.warn('[Firebase AuthContext] Public library books permissions rejected or offline. Hiding public community books.', error);
      setPublicBooks([]);
    });

    return unsubscribe;
  }, [firebaseUser]);

  // Synchronize Auth user context with active Cloud Firestore profile document
  const syncUserWithFirestore = async (fUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', fUser.uid);
      const userSnap = await getDoc(userRef);
      
      let profile: UserProfile;
      const isBootstrappedAdmin = fUser.email === 'stinger911@gmail.com';

      if (userSnap.exists()) {
        const data = userSnap.data();
        profile = {
          uid: fUser.uid,
          email: fUser.email || '',
          displayName: fUser.displayName || 'Parent/Writer',
          subscriptionStatus: data.subscriptionStatus || 'free',
          subscriptionExpiresAt: data.subscriptionExpiresAt || null,
          role: isBootstrappedAdmin ? 'admin' : (data.role || 'user'),
          manuallyUpgraded: data.manuallyUpgraded || false,
          stripeSubscriptionId: data.stripeSubscriptionId || null,
          photoURL: fUser.photoURL || data.photoURL || undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };

        // If email matches bootstrapper admin but profile was previously 'user', auto update
        if (isBootstrappedAdmin && data.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin' });
          profile.role = 'admin';
        }

        // Keep photoURL synced in database if it exists on auth but is not in firestore yet
        if (fUser.photoURL && !data.photoURL) {
          await updateDoc(userRef, { photoURL: fUser.photoURL });
        }
      } else {
        // Create initial guest blueprint
        profile = {
          uid: fUser.uid,
          email: fUser.email || '',
          displayName: fUser.displayName || 'Parent/Writer',
          subscriptionStatus: 'free',
          subscriptionExpiresAt: null,
          role: isBootstrappedAdmin ? 'admin' : 'user',
          photoURL: fUser.photoURL || undefined,
        };

        await setDoc(userRef, {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          subscriptionStatus: profile.subscriptionStatus,
          subscriptionExpiresAt: profile.subscriptionExpiresAt,
          role: profile.role,
          photoURL: profile.photoURL || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to resolve custom cloud profile:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `users/${fUser.uid}`);
      } catch (logErr) {
        // Log has been stringified and printed to console. Proceed with fallback state setup.
      }
      // Fallback state
      setUserProfile({
        uid: fUser.uid,
        email: fUser.email || '',
        displayName: fUser.displayName || 'Parent/Writer',
        subscriptionStatus: 'free',
        subscriptionExpiresAt: null,
        role: fUser.email === 'stinger911@gmail.com' ? 'admin' : 'user',
        photoURL: fUser.photoURL || undefined
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign in using Google Auth popup
  const loginWithGoogle = async (): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserWithFirestore(result.user);
      return userProfile;
    } catch (error) {
      console.error('Sign-in failed:', error);
      setLoading(false);
      return null;
    }
  };

  // Sign out user
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUserProfile(null);
      setFirebaseUser(null);
      setCloudBooks([]);
      setLibraryMode('local');
    } catch (error) {
      console.error('Sign-out failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Premium Checkout upgraded via clean dialog validation
  const simulateUpgrade = async () => {
    if (!firebaseUser) {
      // Prompt logon first
      await loginWithGoogle();
    }
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      await updateDoc(userRef, {
        subscriptionStatus: 'premium',
        subscriptionExpiresAt: thirtyDaysFromNow.toISOString(),
        updatedAt: serverTimestamp()
      });

      setUserProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          subscriptionStatus: 'premium',
          subscriptionExpiresAt: thirtyDaysFromNow.toISOString()
        };
      });
      setShowPremiumModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
  };

  // Cloud Firestore Book management operations
  const saveBookToStore = async (book: KidBook): Promise<KidBook> => {
    if (!firebaseUser) return book;

    // Only run Storage upload pass when at least one page actually has a data
    // URL — avoids the async hop entirely for text-only saves.
    const needsUpload = book.pages.some(
      p => isDataUrl(p.originalImage) || isDataUrl(p.coloringImage)
    );
    const pages = needsUpload ? await processPages(book.pages, book.id) : book.pages;

    const bookRef = doc(db, 'books', book.id);
    try {
      if (knownBookIds.current.has(book.id)) {
        // Already exists in Firestore — skip getDoc, update directly.
        await updateDoc(bookRef, {
          title: book.title,
          author: book.author,
          themeColor: book.themeColor,
          pages,
          userEmail: firebaseUser.email || '',
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(bookRef, {
          id: book.id,
          userId: firebaseUser.uid,
          title: book.title,
          author: book.author,
          themeColor: book.themeColor,
          pages,
          userEmail: firebaseUser.email || '',
          isPublic: false,
          moderationStatus: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        knownBookIds.current.add(book.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `books/${book.id}`);
    }
    // Return the book with storage URLs so the caller can update its local state,
    // preventing data-URL re-uploads on subsequent saves.
    return { ...book, pages };
  };

  const deleteBookFromStore = async (bookId: string) => {
    if (!firebaseUser) return;
    const bookRef = doc(db, 'books', bookId);
    try {
      await deleteDoc(bookRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `books/${bookId}`);
    }
  };

  const toggleBookPublicity = async (bookId: string, isPublic: boolean) => {
    if (!firebaseUser) return;
    const bookRef = doc(db, 'books', bookId);
    try {
      await updateDoc(bookRef, {
        isPublic,
        moderationStatus: isPublic ? 'pending' : 'pending',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `books/${bookId}`);
    }
  };

  // ADMIN OPERATIONS
  const fetchAdminData = async () => {
    if (!userProfile || userProfile.role !== 'admin') return;
    setLoadingAdminData(true);
    try {
      // Load all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: UserProfile[] = [];
      const userEmailsMap: Record<string, string> = {};
      usersSnap.forEach(docSnap => {
        const d = docSnap.data();
        const email = d.email || '';
        userEmailsMap[d.uid] = email;
        usersList.push({
          uid: d.uid,
          email,
          displayName: d.displayName || 'Parent',
          subscriptionStatus: d.subscriptionStatus || 'free',
          subscriptionExpiresAt: d.subscriptionExpiresAt || null,
          role: d.role || 'user',
          photoURL: d.photoURL || undefined
        });
      });
      setAdminUsers(usersList);

      // Load all books for review
      const booksSnap = await getDocs(collection(db, 'books'));
      const booksList: KidBook[] = [];
      booksSnap.forEach(docSnap => {
        const d = docSnap.data();
        const bk: any = {
          id: docSnap.id,
          userId: d.userId,
          title: d.title || '',
          author: d.author || '',
          userEmail: userEmailsMap[d.userId] || d.userEmail || '',
          createdAt: (d.createdAt && typeof d.createdAt.seconds === 'number') ? new Date(d.createdAt.seconds * 1000).toLocaleDateString() : 'Just now',
          themeColor: d.themeColor || 'from-sky-100 to-indigo-100',
          pages: d.pages || [],
          isPublic: d.isPublic || false,
          moderationStatus: d.moderationStatus || 'pending'
        };
        booksList.push(bk);
      });
      setAdminBooks(booksList);
    } catch (error) {
      console.error('Failed to pull admin records:', error);
    } finally {
      setLoadingAdminData(false);
    }
  };

  const moderateBookStatus = async (bookId: string, status: 'pending' | 'approved' | 'rejected') => {
    if (!userProfile || userProfile.role !== 'admin') return;
    try {
      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, {
        moderationStatus: status,
        updatedAt: serverTimestamp()
      });
      // Update local admin book list directly to reflect instantaneous status
      setAdminBooks(prev => prev.map(bk => bk.id === bookId ? { ...bk, moderationStatus: status } as any : bk));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `books/${bookId}`);
    }
  };

  const deleteUserByAdmin = async (userId: string) => {
    if (!userProfile || userProfile.role !== 'admin') return;
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      setAdminUsers(prev => prev.filter(u => u.uid !== userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const updateUserRole = async (userId: string, targetRole: 'user' | 'admin') => {
    if (!userProfile || userProfile.role !== 'admin') return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: targetRole,
        updatedAt: serverTimestamp()
      });
      setAdminUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: targetRole } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const updateUserSubscription = async (userId: string, status: 'free' | 'premium') => {
    if (!userProfile || userProfile.role !== 'admin') return;
    try {
      const userRef = doc(db, 'users', userId);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      
      await updateDoc(userRef, {
        subscriptionStatus: status,
        subscriptionExpiresAt: status === 'premium' ? thirtyDays.toISOString() : null,
        manuallyUpgraded: status === 'premium',
        updatedAt: serverTimestamp()
      });

      setAdminUsers(prev => prev.map(u => u.uid === userId ? { 
        ...u, 
        subscriptionStatus: status,
        subscriptionExpiresAt: status === 'premium' ? thirtyDays.toISOString() : null,
        manuallyUpgraded: status === 'premium'
      } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user: userProfile,
      loading,
      libraryMode,
      showPremiumModal,
      setShowPremiumModal,
      showLab18Modal,
      setShowLab18Modal,
      loginWithGoogle,
      logout,
      simulateUpgrade,
      updateUserRole,
      updateUserSubscription,
      
      cloudBooks,
      publicBooks,
      saveBookToStore,
      deleteBookFromStore,
      toggleBookPublicity,
      
      adminUsers,
      adminBooks,
      loadingAdminData,
      fetchAdminData,
      moderateBookStatus,
      deleteUserByAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be called inside an AuthProvider wrapper');
  }
  return context;
}
