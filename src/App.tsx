import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Library from './components/Library';
import BookStudio from './components/BookStudio';
import { Tooltip } from './components/Tooltip';
import { KidBook } from './types';
import { 
  Smile, Sparkles, BookOpen, LogIn, LogOut, ShieldCheck, 
  CreditCard, Lock, Globe, Database, HelpCircle, Flame, Users, 
  BookMarked, Star, CheckCircle, ArrowRight, ShieldAlert, Check,
  Activity, Award, Search, Trash2, CheckCircle2, XCircle, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function WorkshopApp() {
  const { 
    user, 
    loading, 
    libraryMode, 
    showPremiumModal, 
    setShowPremiumModal, 
    showLab18Modal,
    setShowLab18Modal,
    loginWithGoogle, 
    logout, 
    simulateUpgrade,
    cloudBooks,
    saveBookToStore,
    deleteBookFromStore,
    adminUsers,
    adminBooks,
    loadingAdminData,
    fetchAdminData,
    moderateBookStatus,
    deleteUserByAdmin,
    updateUserRole,
    updateUserSubscription
  } = useAuth();

  const [selectedBook, setSelectedBook] = useState<KidBook | null>(null);
  const [activeView, setActiveView] = useState<'shelf' | 'admin'>('shelf');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Checkout Simulator Keystroke States for CRO High Conversion Mockup
  const [ccNumber, setCcNumber] = useState('');
  const [ccHolder, setCcHolder] = useState(user?.displayName || '');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Sync holder name with user upon auth change
  useEffect(() => {
    if (user) {
      setCcHolder(user.displayName);
    }
  }, [user]);

  // Handle book selection
  const handleSelectBook = (book: KidBook) => {
    setSelectedBook(book);
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
  };

  // Syncing book saves to active Local OR cloud db
  const handleSaveBook = async (updatedBook: KidBook) => {
    if (libraryMode === 'cloud') {
      await saveBookToStore(updatedBook);
    } else {
      // Save local anonymous guest mode
      const saved = localStorage.getItem('kid-book-factory-saved-books');
      if (saved) {
        try {
          const books: KidBook[] = JSON.parse(saved);
          const idx = books.findIndex(b => b.id === updatedBook.id);
          if (idx !== -1) {
            books[idx] = updatedBook;
          } else {
            books.unshift(updatedBook);
          }
          localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(books));
        } catch (e) {
          console.error("Local storage sync error:", e);
        }
      }
    }
  };

  // Admin section filter states
  const [adminSearch, setAdminSearch] = useState('');
  const [adminTab, setAdminTab] = useState<'users' | 'books'>('users');

  // Load admin panels data on active display
  useEffect(() => {
    if (activeView === 'admin' && user?.role === 'admin') {
      fetchAdminData();
    }
  }, [activeView, user]);

  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-800 font-sans flex flex-col justify-between" id="app-root">
      
      {/* Dynamic playrooms header */}
      <header className="print:hidden sticky top-0 z-30 w-full transition-all duration-300 bg-transparent px-3 py-2 sm:px-0 sm:py-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between bg-white/90 sm:bg-white/60 backdrop-blur-md rounded-2xl sm:rounded-none border border-stone-200/85 sm:border-t-0 sm:border-x-0 sm:border-b shadow-lg sm:shadow-xs">
          {/* Studio Brand Identity */}
          <Tooltip 
            title="StoryCraft Studio 🎨" 
            content="Create beautiful, personalized storybooks with custom tracing worksheets, coloring activities, and offline/cloud auto-saves."
            position="bottom-left"
          >
            <div 
              className="flex items-center gap-2.5 cursor-pointer select-none" 
              onClick={() => {
                setActiveView('shelf');
                handleBackToLibrary();
              }}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white shadow shadow-amber-200 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="font-sans font-black tracking-tight text-sm sm:text-lg flex items-center gap-1.5 text-stone-900 leading-tight">
                  <span className="truncate">StoryCraft Cloud</span>
                  {user?.subscriptionStatus === 'premium' ? (
                    <span className="bg-amber-100 text-amber-700 text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Premium
                    </span>
                  ) : (
                    <span className="text-[11px] font-serif italic text-amber-600 font-bold hidden sm:inline">active workspace</span>
                  )}
                </h1>
                <p className="text-[9px] sm:text-[10px] text-stone-400 font-mono font-bold tracking-wide text-left uppercase truncate">Multi-Device Family Co-authoring</p>
              </div>
            </div>
          </Tooltip>

          {/* Desktop Navigation Items */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-4">
            
            {/* Database mode ribbon */}
            <Tooltip
              title="Database Mode ⚙️"
              content={libraryMode === 'cloud' 
                ? "Cloud Connected: Workbooks are saved securely in Google Firestore and synced in real-time across your iPad, phone, or tablet." 
                : "Local Only Mode: Submissions and canvas progress are stored safely inside your immediate browser sandbox."}
              position="bottom"
              className="hidden md:inline-block"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-stone-200/80 bg-white shadow-xs">
                {libraryMode === 'cloud' ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
                    <span className="text-blue-800">Cloud Connected</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-500">Local Only</span>
                  </>
                )}
              </div>
            </Tooltip>

            {/* Admin toggle visibility button */}
            {user?.role === 'admin' && (
              <Tooltip
                title="Admin Control 🛡️"
                content="Manage system-wide user credentials, upgrade subscriptions manually, moderate coloring prompts, and view server health dashboards."
                position="bottom"
              >
                <button
                  onClick={() => {
                    setActiveView(activeView === 'shelf' ? 'admin' : 'shelf');
                    setSelectedBook(null); // Return to library space
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border ${
                    activeView === 'admin' 
                      ? 'bg-purple-100 border-purple-200 text-purple-900 shadow-sm' 
                      : 'bg-white hover:bg-stone-50 border-stone-200 text-purple-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              </Tooltip>
            )}

            {/* Back to library navigation button */}
            {selectedBook && (
              <Tooltip
                title="Go to Bookshelf 📚"
                content="Save your active draft and go back to your main bookshelf to view your entire collection or make a new workbook."
                position="bottom"
              >
                <button
                  onClick={handleBackToLibrary}
                  className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                  <span>My Bookshelf</span>
                </button>
              </Tooltip>
            )}

            {/* Authenticated user pill / profile info */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse border border-stone-200" />
            ) : user ? (
              <Tooltip
                title="Your Workspace 👤"
                content={`Successfully linked to ${user.email}. Click 'Sign Out' to switch users, or lock your workbook access.`}
                position="bottom-right"
              >
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200/80 p-1 pr-3 rounded-full shadow-xs">
                  <div className="w-7 h-7 bg-amber-400 text-stone-800 rounded-full flex items-center justify-center font-black text-xs uppercase overflow-hidden ring-2 ring-white select-none shrink-0">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt={user.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      user.displayName.charAt(0)
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-stone-800 truncate max-w-[80px] leading-tight select-none">
                      {user.displayName.split(' ')[0]}
                    </span>
                    <button 
                      onClick={logout}
                      className="text-[9px] hover:text-rose-600 font-mono tracking-wide text-stone-400 font-bold text-left transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </Tooltip>
            ) : (
              <Tooltip
                title="Log In ☁️"
                content="Log in securely with Google to enable real-time cloud auto-saves, download templates anywhere, and sync files with your family."
                position="bottom-right"
              >
                <button
                  onClick={loginWithGoogle}
                  className="px-4 py-1.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Log In</span>
                </button>
              </Tooltip>
            )}

            {/* Conversion premium button */}
            {user?.subscriptionStatus !== 'premium' && (
              <Tooltip
                title="Upgrade to VIP 👑"
                content="Unlock direct vector outline conversions, create unlimited workbooks, and print high-definition coloring activity pages."
                position="bottom-right"
              >
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-rose-400 hover:from-amber-600 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-xs transition transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
                  <span>Go VIP</span>
                </button>
              </Tooltip>
            )}
          </div>

          {/* Mobile menu and Quick Auth toggles */}
          <div className="flex sm:hidden items-center gap-2">
            {!loading && (
              user ? (
                /* Icon-only mobile avatar profile button */
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-8 h-8 rounded-full bg-amber-400 text-stone-800 flex items-center justify-center font-black text-xs uppercase overflow-hidden ring-2 ring-amber-100 shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                  aria-label="User profile details"
                  title="User profile details"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user.displayName.charAt(0)
                  )}
                </button>
              ) : (
                /* Icon-only Log In button */
                <button
                  onClick={loginWithGoogle}
                  className="p-2 text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-stone-800"
                  aria-label="Log In"
                  title="Log In"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                </button>
              )
            )}

            {/* Menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 hover:text-stone-900 rounded-xl bg-stone-100/80 hover:bg-stone-200/50 border border-stone-200/65 transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu content using motion */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="sm:hidden mt-2 mx-3 overflow-hidden bg-white/95 backdrop-blur-md border border-stone-200/85 rounded-2xl shadow-xl flex flex-col p-4 gap-3 text-left absolute left-0 right-0 z-40"
            >
              {/* Database Status inside Mobile Menu */}
              <div className="flex items-center justify-between p-2.5 px-3 bg-stone-50 border border-stone-200/50 rounded-xl text-xs">
                <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px]">Database Mode</span>
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  {libraryMode === 'cloud' ? (
                    <>
                      <Database className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
                      <span className="text-blue-800">Cloud Connected</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-500">Local Only</span>
                    </>
                  )}
                </div>
              </div>

              {/* Admin Panel Toggle link on mobile */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setActiveView(activeView === 'shelf' ? 'admin' : 'shelf');
                    setSelectedBook(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer border ${
                    activeView === 'admin' 
                      ? 'bg-purple-100 border-purple-200 text-purple-900' 
                      : 'bg-white hover:bg-stone-50 border-stone-200 text-purple-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* Back to library navigation button */}
              {selectedBook && (
                <button
                  onClick={() => {
                    handleBackToLibrary();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-stone-500" />
                  <span>My Bookshelf</span>
                </button>
              )}

              {/* Conversion premium button */}
              {user?.subscriptionStatus !== 'premium' && (
                <button
                  onClick={() => {
                    setShowPremiumModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-rose-400 hover:from-amber-600 hover:to-rose-500 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
                  <span>Go VIP</span>
                </button>
              )}

              {/* Authed Profile section or Login */}
              {loading ? (
                <div className="w-full h-11 rounded-xl bg-stone-100 animate-pulse border border-stone-205" />
              ) : user ? (
                <div className="flex items-center justify-between bg-stone-50 border border-stone-200/50 p-2 px-3 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-amber-400 text-stone-800 rounded-full flex items-center justify-center font-black text-xs uppercase overflow-hidden ring-2 ring-white select-none shrink-0">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        user.displayName.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-xs font-black text-stone-800 truncate">
                        {user.displayName}
                      </span>
                      <span className="text-[10px] text-stone-400 truncate max-w-[150px] font-mono leading-none mt-0.5">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:text-white hover:bg-rose-500 font-bold border border-rose-100/80 hover:border-transparent rounded-xl transition shrink-0 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    loginWithGoogle();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Log In</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Core View Area wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-grow w-full relative">
        
        {activeView === 'admin' ? (
          /* ---------------- CLIENT MODERATION & ADMIN AREA ---------------- */
          <div className="bg-white border border-stone-250 rounded-3xl p-6 shadow-sm border-b-4 text-left animate-fadeIn">
            {/* Admin Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-purple-600" />
                  <h2 className="font-sans font-black text-xl text-stone-900 uppercase">StoryCraft Workspace Administrator</h2>
                </div>
                <p className="text-xs text-stone-400 mt-0.5 font-mono">System bootstrapped for: stinger911@gmail.com</p>
              </div>

              {/* Stat Cards summary */}
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAdminData}
                  disabled={loadingAdminData}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-750 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
                >
                  {loadingAdminData ? "Refreshing system stats..." : "Refresh Records"}
                </button>
              </div>
            </div>

            {/* Live Analytics Dashboard Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center gap-3.5">
                <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-stone-400 uppercase">Registered Writers</div>
                  <div className="text-2xl font-black text-purple-900">{adminUsers.length} Users</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-100 flex items-center gap-3.5">
                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-stone-400 uppercase">Authored Works</div>
                  <div className="text-2xl font-black text-amber-900">{adminBooks.length} Books</div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-stone-400 uppercase">Subscribed Conversion</div>
                  <div className="text-2xl font-black text-emerald-950">
                    {adminUsers.filter(u => u.subscriptionStatus === 'premium').length} Pro ({Math.round((adminUsers.filter(u => u.subscriptionStatus === 'premium').length / (adminUsers.length || 1)) * 100)}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for managing books or users */}
            <div className="flex items-center gap-4 border-b border-stone-200 mb-5">
              <button
                onClick={() => setAdminTab('users')}
                className={`pb-2.5 font-bold text-xs uppercase tracking-wider transition ${
                  adminTab === 'users' ? 'text-purple-700 border-b-2 border-purple-600' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Registered Users ({adminUsers.length})
              </button>
              <button
                onClick={() => setAdminTab('books')}
                className={`pb-2.5 font-bold text-xs uppercase tracking-wider transition ${
                  adminTab === 'books' ? 'text-purple-700 border-b-2 border-purple-600' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Community Library Submissions ({adminBooks.filter(b => b.isPublic).length} / {adminBooks.length})
              </button>
            </div>

            {/* Search filter input */}
            <div className="mb-4 relative">
              <span className="absolute left-3.5 top-2.5 text-stone-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Filter by name, email, title or author..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 pl-10 pr-4 py-2 text-stone-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-100 focus:bg-white"
              />
            </div>

            {loadingAdminData ? (
              <div className="py-12 text-center flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                <span className="text-xs font-mono font-bold text-stone-500 tracking-wide uppercase">Reading credentials database...</span>
              </div>
            ) : adminTab === 'users' ? (
              /* Users Admin List Table */
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 font-mono text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                      <th className="p-3.5">User Identity</th>
                      <th className="p-3.5">Auth Email</th>
                      <th className="p-3.5">Subscription Tier</th>
                      <th className="p-3.5">System Perms</th>
                      <th className="p-3.5 text-right">Moderations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                    {adminUsers
                      .filter(u => u.displayName.toLowerCase().includes(adminSearch.toLowerCase()) || u.email.toLowerCase().includes(adminSearch.toLowerCase()))
                      .map(u => (
                        <tr key={u.uid} className="hover:bg-purple-50/20 transition">
                          <td className="p-3 aign-middle">
                            <div className="flex items-center gap-2">
                              <div className="w-6.5 h-6.5 bg-gradient-to-tr from-purple-500 to-indigo-400 rounded-full flex items-center justify-center font-black text-[10px] text-white overflow-hidden shrink-0">
                                {u.photoURL ? (
                                  <img 
                                    src={u.photoURL} 
                                    alt={u.displayName} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  u.displayName.charAt(0)
                                )}
                              </div>
                              <span className="font-extrabold text-stone-800">{u.displayName}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono">{u.email}</td>
                          <td className="p-3 align-middle">
                            {u.subscriptionStatus === 'premium' ? (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border border-green-200 flex items-center gap-0.5 w-max">
                                <Star className="w-2.5 h-2.5 fill-green-500 text-green-500" /> Premium VIP
                              </span>
                            ) : (
                              <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full uppercase text-[9px]">Free Account</span>
                            )}
                          </td>
                          <td className="p-3 align-middle">
                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-stone-50 text-stone-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {/* Sub toggle */}
                              <button
                                onClick={async () => {
                                  const targetState = u.subscriptionStatus === 'premium' ? 'free' : 'premium';
                                  await updateUserSubscription(u.uid, targetState);
                                }}
                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg hover:text-stone-800 font-bold text-[10px]"
                                title="Toggle premium plan"
                              >
                                {u.subscriptionStatus === 'premium' ? "Downgrade plan" : "Grant Pro Pass"}
                              </button>

                              {/* Role toggle */}
                              {u.email !== 'stinger911@gmail.com' && (
                                <button
                                  onClick={async () => {
                                    const targetRole = u.role === 'admin' ? 'user' : 'admin';
                                    await updateUserRole(u.uid, targetRole);
                                  }}
                                  className="px-2 py-1 bg-stone-100 hover:bg-purple-100 text-[10px] text-purple-700 hover:text-purple-900 rounded-lg font-bold"
                                >
                                  Make {u.role === 'admin' ? "User" : "Admin"}
                                </button>
                              )}

                              {u.email !== 'stinger911@gmail.com' && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete user ${u.displayName}?`)) {
                                      await deleteUserByAdmin(u.uid);
                                    }
                                  }}
                                  className="p-1 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Books Admin List Table with moderation statuses */
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 font-mono text-[10px] uppercase font-bold text-stone-400 border-b border-stone-200">
                      <th className="p-3.5">Co-Authored Title</th>
                      <th className="p-3.5">Author (Parent & Child)</th>
                      <th className="p-3.5">Sheets Size</th>
                      <th className="p-3.5">Cloud Storage ID</th>
                      <th className="p-3.5">Library Status</th>
                      <th className="p-3.5 text-right">Approve / Content Lock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                    {adminBooks
                      .filter(b => 
                        b.title.toLowerCase().includes(adminSearch.toLowerCase()) || 
                        b.author.toLowerCase().includes(adminSearch.toLowerCase()) ||
                        (b.userEmail && b.userEmail.toLowerCase().includes(adminSearch.toLowerCase()))
                      )
                      .map(b => (
                        <tr key={b.id} className="hover:bg-purple-50/20 transition">
                          <td className="p-3 align-middle font-extrabold text-stone-800">
                            {b.title}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-stone-600">{b.author}</span>
                              {b.userEmail && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {b.userEmail}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono">{b.pages.length} Pages</td>
                          <td className="p-3 font-mono text-stone-400 text-[10px]" title={b.id}>
                            {b.id.substring(0, 8)}...
                          </td>
                          <td className="p-3 align-middle">
                            {b.isPublic ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase w-max border ${
                                  b.moderationStatus === 'approved' 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-250' 
                                    : b.moderationStatus === 'rejected'
                                      ? 'bg-rose-100 text-rose-850 border-rose-200'
                                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                }`}>
                                  {b.moderationStatus || 'pending'}
                                </span>
                                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wide">Publicly Listed</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full font-bold uppercase w-max">Private Work</span>
                                <span className="text-[9px] text-stone-400 font-bold uppercase">Personal Shelf</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {b.isPublic ? (
                              <div className="flex items-center justify-end gap-1 font-sans">
                                {b.moderationStatus !== 'approved' && (
                                  <button
                                    onClick={() => moderateBookStatus(b.id, 'approved')}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg hover:text-emerald-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approve
                                  </button>
                                )}

                                {b.moderationStatus !== 'rejected' && (
                                  <button
                                    onClick={() => moderateBookStatus(b.id, 'rejected')}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5"
                                  >
                                    <XCircle className="w-3 h-3 text-rose-600" /> Reject
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-300 italic text-[10px]">No action required</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* -------------- STANDARD LIBRARY VIEW AND WORKSPACE -------------- */
          <div>
            {!selectedBook ? (
              <Library onSelectBook={handleSelectBook} />
            ) : (
              <BookStudio
                book={selectedBook}
                onBack={handleBackToLibrary}
                onSave={handleSaveBook}
              />
            )}
          </div>
        )}
      </main>

      {/* ----------------- INTERACTIVE PREMIUM UPGRADE MODAL (CRO SPECIFIED) ----------------- */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn select-none font-sans">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-stone-250 flex flex-col md:flex-row relative">
            
            {/* Left bento: comparison bullet points */}
            <div className="p-6 md:p-10 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white flex-1 flex flex-col justify-between gap-6 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />
              
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-1 bg-amber-500/20 text-yellow-300 font-black text-[10px] uppercase px-3 py-1 rounded-full border border-amber-500/20 self-start">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> VIP Subscription Plan
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Unlock StoryCraft Pro Unlimited Pack
                </h3>
                
                <p className="text-xs sm:text-sm text-stone-300">
                  Enable parent-child workspace synchronization across devices and unleash complete creative bounds with zero limits.
                </p>

                {/* Bullets feature list */}
                <ul className="flex flex-col gap-3 mt-4 text-xs font-semibold text-stone-250">
                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-400" />
                    </div>
                    <span><strong>Durable Multi-Device Sync:</strong> Access worksheets on mobile, iPads, or desktops synced on Cloud Firestore.</span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-400" />
                    </div>
                    <span><strong>AI Story Generator:</strong> Unlock advanced narrative generator engines to build complete customized booklets.</span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-400" />
                    </div>
                    <span><strong>Unlimited Shelf Storage:</strong> Free accounts are restricted to 2 active book slots on sync. Premium has zero limits.</span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-amber-400" />
                    </div>
                    <span><strong>High Fidelity Vectors:</strong> Enjoy clean outlines, higher printable resolution, and community posting options.</span>
                  </li>
                </ul>
              </div>

              {/* Secure payment notes */}
              <div className="border-t border-stone-800 pt-5 mt-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">
                  🛡️
                </div>
                <div className="text-[10px] text-stone-400 text-left font-mono">
                  <p className="font-bold">BANK-GRADE SECURE CHECKOUT</p>
                  <p>Encrypted via 256-bit SSL transaction simulator</p>
                </div>
              </div>
            </div>

            {/* Right bento: interactive payment simulator and credit card graphic */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between gap-6 bg-stone-50/50">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute right-5 top-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center font-bold text-xs select-none cursor-pointer text-stone-700 z-10"
              >
                ✕
              </button>

              {/* CARD PREVIEW GRAPHIC (UPDATES LIVE) */}
              <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-400 to-rose-400 p-5 text-white flex flex-col justify-between relative shadow-lg overflow-hidden transform hover:-rotate-1 hover:scale-102 transition mt-2">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-full filter blur-xl" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-white text-yellow-300" />
                    <span className="font-mono text-xs tracking-widest font-black italic uppercase">StoryCraft VIP</span>
                  </div>
                  <div className="w-8 h-6 bg-white/20 rounded-md flex items-center justify-center text-[10px] font-bold">
                    Lab18
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-left mt-2">
                  <div className="font-mono tracking-widest text-sm xs:text-base font-bold">
                    {ccNumber ? ccNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="text-left">
                    <div className="text-[8px] uppercase tracking-wider opacity-60 font-mono">Card Holder</div>
                    <div className="font-bold text-xs font-mono uppercase truncate max-w-[160px]">
                      {ccHolder || 'Your Name'}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="text-left">
                      <div className="text-[8px] uppercase tracking-wider opacity-60 font-mono">Expires</div>
                      <div className="font-bold text-xs font-mono">{ccExpiry || 'MM/YY'}</div>
                    </div>
                    <div className="text-left">
                      <div className="text-[8px] uppercase tracking-wider opacity-60 font-mono">CVV</div>
                      <div className="font-bold text-xs font-mono">{ccCvv || '•••'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment inputs Form */}
              <div className="flex flex-col gap-3 text-left">
                {!user ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-805 p-4 rounded-2xl flex flex-col gap-3 text-center items-center">
                    <Lock className="w-8 h-8 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-sm">Sign in is required first</h4>
                      <p className="text-xs mt-0.5 text-amber-700">Please connect your Google Account before upgrading to premium cloud backup.</p>
                    </div>
                    <button
                      onClick={loginWithGoogle}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-850 font-black text-xs text-white rounded-xl flex items-center gap-2 transform active:scale-95 cursor-pointer shadow"
                    >
                      <LogIn className="w-4 h-4 text-amber-400" />
                      <span>Connect with Google Auth</span>
                    </button>
                  </div>
                ) : paySuccess ? (
                  <div className="bg-emerald-50 text-emerald-950 px-4 py-8 rounded-2xl border border-emerald-200 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow shadow-emerald-200">
                      <Check className="w-6 h-6 stroke-[3px]" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase">Upgrade Activated successfully!</h4>
                      <p className="text-xs text-emerald-800 mt-1">Welcome to Pro. Storage size and pages are now infinitely freed.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {/* Expiry and CVV Row */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Card Number</label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="4532 7182 9912 3424"
                        value={ccNumber}
                        onChange={e => setCcNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border border-stone-250 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={ccHolder}
                        onChange={e => setCcHolder(e.target.value)}
                        className="w-full bg-white border border-stone-250 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={ccExpiry}
                          onChange={e => setCcExpiry(e.target.value)}
                          className="w-full bg-white border border-stone-250 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">CVV Code</label>
                        <input
                          type="text"
                          placeholder="321"
                          maxLength={3}
                          value={ccCvv}
                          onChange={e => setCcCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-white border border-stone-250 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-amber-200 focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Submit Pay simulated button */}
                    <button
                      onClick={async () => {
                        if (!ccNumber.trim() || !ccHolder.trim() || !ccExpiry.trim() || !ccCvv.trim()) {
                          alert("Please fill in simulated credit card inputs to proceed!");
                          return;
                        }
                        setIsPaying(true);
                        // Simulate network handshakes
                        setTimeout(async () => {
                          await simulateUpgrade();
                          setIsPaying(false);
                          setCcNumber('');
                          setCcExpiry('');
                          setCcCvv('');
                        }, 2200);
                      }}
                      disabled={isPaying}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl transition mt-1 cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 shadow-md shadow-stone-800/10 disabled:opacity-50"
                    >
                      {isPaying ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span>Simulating Visa authorization...</span>
                        </>
                      ) : (
                        <span>Simulate Secure Purchase ($8.99/mo)</span>
                      )}
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-center text-stone-400 font-medium">
                  Active Playroom billing is completely simulated. Direct upgrades update Firestore profiles in real-time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- LAB18 COMPANY INFO POP-UP MODAL ----------------- */}
      {showLab18Modal && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn select-none font-sans">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-stone-200/50 flex flex-col relative animate-scaleUp">
            
            {/* Top custom banner */}
            <div className="bg-gradient-to-r from-amber-200 via-rose-100 to-sky-100 p-6 md:p-8 relative text-left select-none border-b border-stone-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowLab18Modal(false)}
                className="absolute right-5 top-5 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-stone-700 shadow-sm border border-stone-200/50 flex items-center justify-center font-bold text-xs cursor-pointer z-10 hover:scale-105 transition"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-amber-500/20 mb-3 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Premium AI & Automation Studio
              </div>

              <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-stone-800 leading-tight">
                About Lab18 Studio
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-1 uppercase tracking-wider font-mono">
                Pioneering Autonomous Cognitive Frameworks
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[50vh] text-left flex flex-col gap-5 leading-relaxed text-stone-600">
              <p className="text-sm">
                <a 
                  href="https://lab18.net" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-stone-950 hover:text-amber-700 font-black underline decoration-amber-400 decoration-2 transition cursor-pointer"
                >
                  Lab18
                </a> is an elite, high-touch AI integration and deep-tech automation studio. We bridge the gap between creative cognitive concepts and unbreakable, production-grade cloud execution. 
              </p>

              <p className="text-sm">
                By fusing state-of-the-art Large Language Models (LLMs) with robust enterprise pipelines like Google Cloud, Firebase, and real-time database syndication, <a href="https://lab18.net" target="_blank" rel="noopener noreferrer" className="hover:text-amber-700 underline transition cursor-pointer font-bold">Lab18.net</a> designs software that acts as an autonomous extension of human talent.
              </p>

              {/* Bento Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-left">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> Core AI Architecture
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Multi-modal processing, vector generation, and autonomous cartoon-illustration pipelines.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-150 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-sky-700 font-bold text-xs uppercase tracking-wider font-mono">
                    <Globe className="w-3.5 h-3.5" /> High-Scale Ecosystems
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Microsecond auto-scaling, modern TypeScript fullstack servers, and secure local caches.
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-500 italic mt-1">
                Ready to take your operations, user applications, and custom creative models to the next paradigm? Connect with the core architecture office at <a href="https://lab18.net" target="_blank" rel="noopener noreferrer" className="text-amber-700 font-bold hover:underline">lab18.net</a>.
              </p>
            </div>

            {/* Footer with Links */}
            <div className="p-6 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
              <a 
                href="https://lab18.net" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-stone-500 hover:text-amber-700 flex items-center gap-1.5 font-bold transition underline"
              >
                <Globe className="w-3.5 h-3.5" /> Official Website: lab18.net
              </a>

              <a
                href="https://lab18.net"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-850 hover:bg-stone-900 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <span>Visit Lab18 Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* Footer footer */}
      <footer className="print:hidden w-full border-t border-stone-200/50 bg-white/20 py-4 text-center mt-6">
        <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
          <button 
            type="button" 
            onClick={() => setShowLab18Modal(true)} 
            className="hover:underline hover:text-stone-700 transition font-black font-sans cursor-pointer tracking-normal mr-1"
          >
            Lab18
          </button>
          Storybook Co-author Factory © 2026. Made with Google Cloud Run & Enterprise Firestore.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkshopApp />
    </AuthProvider>
  );
}
