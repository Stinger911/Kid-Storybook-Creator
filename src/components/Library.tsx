import React, { useState, useEffect } from 'react';
import { KidBook, BookPage } from '../types';
import { STARTER_TEMPLATES, generateId } from '../utils/generators';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, Plus, Trash2, Calendar, Users, Sparkles, Smile, 
  ArrowRight, Heart, Lock, Globe, Cloud, Database, ShieldAlert,
  Sparkle, CheckCircle, RefreshCcw, Check
} from 'lucide-react';

interface LibraryProps {
  onSelectBook: (book: KidBook) => void;
}

export default function Library({ onSelectBook }: LibraryProps) {
  const { 
    user, 
    libraryMode, 
    cloudBooks, 
    publicBooks, 
    saveBookToStore, 
    deleteBookFromStore, 
    toggleBookPublicity,
    setShowPremiumModal,
    setShowLab18Modal
  } = useAuth();

  const [localBooks, setLocalBooks] = useState<KidBook[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'shelf' | 'community'>('shelf');
  
  // Create blank book inputs
  const [newTitle, setNewTitle] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newKidName, setNewKidName] = useState('');
  const [newTheme, setNewTheme] = useState('from-sky-100 to-indigo-100');
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);

  // Load and seed saved books from localStorage for guest mode
  useEffect(() => {
    const saved = localStorage.getItem('kid-book-factory-saved-books');
    if (saved) {
      try {
        setLocalBooks(JSON.parse(saved));
      } catch (e) {
        setLocalBooks(STARTER_TEMPLATES);
        localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(STARTER_TEMPLATES));
      }
    } else {
      setLocalBooks(STARTER_TEMPLATES);
      localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(STARTER_TEMPLATES));
    }
  }, []);

  // Determine active displayed shelf based on auth/libraryMode
  const activeBooks = libraryMode === 'cloud' ? cloudBooks : localBooks;
  const customLocalBooks = localBooks.filter(b => b.id !== 'space-adv' && b.id !== 'sea-expl');

  // Import local guest books up to cloud
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImportLocalToCloud = async () => {
    if (!user) return;
    setIsImporting(true);
    setImportStatus("Uploading sheets...");
    try {
      const saved = localStorage.getItem('kid-book-factory-saved-books');
      if (saved) {
        const parsed: KidBook[] = JSON.parse(saved);
        for (const bk of parsed) {
          // Prevent uploading template starter books
          if (bk.id === 'space-adv' || bk.id === 'sea-expl') continue;
          // Sync book securely to Cloud Firestore linked to active profile
          await saveBookToStore(bk);
        }
      }
      setImportStatus("Import successful!");
      // Reset localStorage back to default templates after import to prevent conflicts
      localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(STARTER_TEMPLATES));
      setLocalBooks(STARTER_TEMPLATES);
      setTimeout(() => setImportStatus(null), 3500);
    } catch (e) {
      console.error(e);
      setImportStatus("Failed to sync some files.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Premium Subscription Limits: Check if user has exceeded 2 books on free tier
    if (libraryMode === 'cloud' && activeBooks.length >= 2 && user?.subscriptionStatus !== 'premium') {
      setShowCreateModal(false);
      setShowPremiumModal(true);
      return;
    }

    const newBook: KidBook = {
      id: generateId(),
      title: newTitle,
      author: `${newKidName || 'Me'} & ${newParentName || 'Parents'}`,
      createdAt: new Date().toLocaleDateString(),
      themeColor: newTheme,
      pages: [
        {
          id: generateId(),
          title: "Our Story Begins",
          type: "mixed",
          layout: "coloring-top-writing-bottom",
          storyText: "Once upon a time in a beautiful dream...",
          tracingText: "DREAM",
          pageNumber: 1,
          coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
        }
      ]
    };

    if (libraryMode === 'cloud') {
      await saveBookToStore(newBook);
    } else {
      const nextBooks = [newBook, ...localBooks];
      setLocalBooks(nextBooks);
      localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(nextBooks));
    }
    
    // Reset forms
    setNewTitle('');
    setNewKidName('');
    setNewParentName('');
    setShowCreateModal(false);

    // Go straight to editing workspace
    onSelectBook(newBook);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookToDelete(id);
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    if (libraryMode === 'cloud') {
      await deleteBookFromStore(bookToDelete);
    } else {
      const nextBooks = localBooks.filter(b => b.id !== bookToDelete);
      setLocalBooks(nextBooks);
      localStorage.setItem('kid-book-factory-saved-books', JSON.stringify(nextBooks));
    }
    setBookToDelete(null);
  };

  return (
    <div className="w-full flex flex-col gap-8 pb-12 animate-fadeIn" id="library">
      
      {/* Immersive Welcome Hero Banner: Lab18 Pastel Theme */}
      <div className="bg-gradient-to-r from-amber-200 via-rose-100 to-sky-100 rounded-3xl p-6 md:p-10 text-stone-800 text-left relative overflow-hidden shadow-sm border border-orange-100">
        
        {/* Playful circle vectors in the backdrop */}
        <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-white/20 filter blur-xl transform translate-x-10 -translate-y-10 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-40 h-20 rounded-full bg-sky-200/40 filter blur-2xl transform translate-y-10 pointer-events-none" />

        <div className="relative z-10 max-w-3xl flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/60 backdrop-blur-md rounded-full text-xs font-bold text-amber-800 uppercase tracking-widest self-start shadow-sm border border-white/50 font-mono">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-600" />
            <span>
              <button 
                type="button" 
                onClick={() => setShowLab18Modal(true)} 
                className="hover:text-amber-600 hover:underline transition font-extrabold cursor-pointer"
              >
                Lab18
              </button> Cognitive Story Synthesis (2026 Pro-Grade)
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-sans font-black tracking-tight text-stone-800 leading-tight animate-fade-in">
            Co-author Premium Books with{' '}
            <button 
              type="button" 
              onClick={() => setShowLab18Modal(true)} 
              className="hover:underline transition cursor-pointer text-left decoration-amber-400 decoration-wavy underline-offset-4"
              title="Learn about Lab18"
            >
              Lab18 AI Story Engine
            </button>
          </h1>
          
          <p className="text-sm md:text-base text-stone-600 leading-relaxed max-w-2xl">
            Empower your child's cognitive development. Transform real drawings or verbal concepts instantly into <b>HD coloring templates</b> with state-of-the-art vector outlining, custom handwriting customizers, and secure multi-device replication.
          </p>

          {/* CRO Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-3 text-left border-y border-orange-200/40 py-4.5 font-sans">
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-amber-100/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-amber-700" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-stone-800">Instant Vectorizer</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Turn raw sketches into clean outlines</p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-amber-100/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-amber-700" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-stone-800">Handwriting Trace</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Bespoke trace letters & lettering</p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="w-5 h-5 rounded-full bg-amber-100/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-amber-700" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-stone-800">Zero-Trust Cloud Sync</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Auto-saves synced to Firestore</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  // Check if user has exceeded books count on free tier
                  if (libraryMode === 'cloud' && activeBooks.length >= 2 && user?.subscriptionStatus !== 'premium') {
                    setShowPremiumModal(true);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-850 text-white font-black text-sm md:text-base rounded-2xl shadow-lg shadow-stone-900/10 hover:-translate-y-0.5 transition flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[3px] text-amber-400" />
                <span>Start Blank Story</span>
              </button>

              <a
                href="#shelf"
                onClick={() => setActiveTab('shelf')}
                className="px-5 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4.5 h-4.5 text-stone-500" />
                <span>Browse bookshelf</span>
              </a>
            </div>

            {/* Trust Badging for CRO Conversions */}
            <div className="text-left flex items-center gap-2 text-[11px] text-stone-500 font-mono">
              <span className="text-amber-600">★★★★★</span>
              <span>14,000+ happy co-authors in 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Local-to-Cloud Sync Migration CTA (Only if Guest has Local books and then logged In) */}
      {user && customLocalBooks.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row justify-between items-center gap-4 text-left shadow-lg border border-blue-400 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Cloud className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base">Move guest books to your cloud profile?</h4>
              <p className="text-xs text-blue-100">You have {customLocalBooks.length} local books. Sync them now to access on other devices!</p>
            </div>
          </div>
          <button
            onClick={handleImportLocalToCloud}
            disabled={isImporting}
            className="px-5 py-2.5 bg-white font-black text-xs text-indigo-700 hover:bg-stone-100 rounded-xl transition flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isImporting ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
            <span>{importStatus || "Sync Offline Sheets"}</span>
          </button>
        </div>
      )}

      {/* Main Shelves Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-stone-200" id="shelf-tabs">
        <button
          onClick={() => setActiveTab('shelf')}
          className={`pb-3 font-sans font-black text-sm uppercase tracking-wider relative transition-colors ${
            activeTab === 'shelf' ? 'text-stone-900 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            My Books {libraryMode === 'cloud' && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono lowercase">cloud sync</span>}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`pb-3 font-sans font-black text-sm uppercase tracking-wider relative transition-colors ${
            activeTab === 'community' ? 'text-stone-900 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-500 animate-spin-slow" />
            Community Library
          </span>
        </button>
      </div>

      {activeTab === 'shelf' ? (
        /* Main Bookshelf Area */
        <div id="shelf" className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <h2 className="font-sans font-extrabold text-stone-800 text-lg md:text-xl">Your Bookshelf</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {libraryMode === 'cloud' && user?.subscriptionStatus !== 'premium' && (
                <div className="bg-amber-50 border border-amber-100 text-[10px] text-amber-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>Free limit: {activeBooks.length}/2 Books created</span>
                </div>
              )}
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
                {activeBooks.length} Total saved
              </span>
            </div>
          </div>

          {/* Bookshelf grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeBooks.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBook(b)}
                className="bg-white border border-stone-200 hover:border-amber-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col group transform hover:-translate-y-1"
              >
                {/* Playful Cover Backdrop Frame */}
                <div className={`h-28 bg-gradient-to-tr ${b.themeColor} flex items-end justify-between p-4 border-b border-stone-100 relative`}>
                  
                  {/* Book design badges */}
                  <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-white z-10">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                      {b.pages.length} Pages
                    </span>
                  </div>

                  {b.isPublic && (
                    <div className="bg-green-100 text-green-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full z-10 border border-green-200">
                      Public
                    </div>
                  )}

                  <Heart className="w-5 h-5 text-rose-400/80 absolute right-3 top-3 filter drop-shadow-sm group-hover:scale-110 transition" />

                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 opacity-60 pointer-events-none" />
                </div>

                {/* Book metadata content */}
                <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5 text-left">
                    <h3 className="font-sans font-extrabold text-stone-800 text-base md:text-lg group-hover:text-amber-600 transition truncate">
                      {b.title}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-xs text-stone-500">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>Story by: <strong className="text-stone-700">{b.author}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-50 pt-3.5 text-stone-400 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-300" />
                      <span>{b.createdAt}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteClick(b.id, e)}
                      className="p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-lg transition"
                      title="Remove book from shelf"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Blank Story Card inside Shelf */}
            <div
              onClick={() => {
                if (libraryMode === 'cloud' && activeBooks.length >= 2 && user?.subscriptionStatus !== 'premium') {
                  setShowPremiumModal(true);
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="border-3 border-dashed border-stone-200 hover:border-amber-400 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition bg-stone-50/50 hover:bg-amber-50/20 group h-56"
            >
              <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-200 rounded-full flex items-center justify-center text-amber-600 mb-3 transition">
                <Plus className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-stone-700 text-sm group-hover:text-amber-600 transition">Create New Book</h4>
              <p className="text-xs text-stone-400 mt-1 max-w-[180px]">
                {libraryMode === 'cloud' && activeBooks.length >= 2 && user?.subscriptionStatus !== 'premium' ? (
                  <span className="text-amber-600 font-bold flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to add more
                  </span>
                ) : (
                  "Type a title, authors, and construct a bespoke booklet page by page!"
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Community Public Library Showcase */
        <div id="community-library" className="flex flex-col gap-6 animate-fadeIn text-left">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="font-sans font-extrabold text-stone-800 text-lg md:text-xl">Community Masterpieces</h2>
            </div>
            <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
              {publicBooks.length} collaborative works published
            </span>
          </div>

          {publicBooks.length === 0 ? (
            <div className="bg-stone-50 rounded-3xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center gap-4">
              <Globe className="w-12 h-12 text-stone-300" />
              <div>
                <h3 className="font-bold text-stone-700 text-lg">The Public Library is currently empty</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">Publish your completed storybooks by opening any book, toggling the community publish setting of your work, and waiting for admin approval!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {publicBooks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onSelectBook(b)}
                  className="bg-white border border-stone-200 hover:border-amber-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col group transform hover:-translate-y-1"
                >
                  {/* Playful Backdrop Frame */}
                  <div className={`h-28 bg-gradient-to-tr ${b.themeColor} flex items-end justify-between p-4 border-b border-stone-100 relative`}>
                    
                    <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-white z-10">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                        {b.pages.length} Pages
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 opacity-60 pointer-events-none" />
                  </div>

                  {/* Book Metadata */}
                  <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-sans font-extrabold text-stone-800 text-base md:text-lg group-hover:text-amber-600 transition truncate">
                        {b.title}
                      </h3>
                      
                      <div className="flex items-center gap-1 text-xs text-stone-500">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <span>Story by: <strong className="text-stone-700">{b.author}</strong></span>
                      </div>
                    </div>

                    <div className="border-t border-stone-50 pt-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Community Approved</span>
                      <span className="text-xs text-amber-600 font-bold group-hover:translate-x-1 transition flex items-center gap-0.5">
                        Read Book <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Creation Modal Box */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl border border-stone-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-400 to-amber-300 flex justify-between items-center text-stone-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-900" />
                <h3 className="font-sans font-black tracking-tight text-sm uppercase">Create A Brand New Story</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-stone-800 font-bold text-sm select-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Inputs form */}
            <form onSubmit={handleCreateBook} className="p-6 flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-600">Storybook Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. My Magical Unicorn Journey"
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Kid's Name</label>
                  <input
                    type="text"
                    value={newKidName}
                    onChange={(e) => setNewKidName(e.target.value)}
                    placeholder="Leo"
                    className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Parent/Helper Name</label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    placeholder="Dad"
                    className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-stone-600">Choose Cover Pastel Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { style: 'from-sky-100 to-indigo-100', name: 'Blue Sky' },
                    { style: 'from-rose-100 to-amber-100', name: 'Sunset' },
                    { style: 'from-teal-50 to-emerald-100', name: 'Ocean' },
                    { style: 'from-violet-100 to-rose-100', name: 'Dream' }
                  ].map((t) => (
                    <button
                      key={t.style}
                      type="button"
                      onClick={() => setNewTheme(t.style)}
                      className={`h-11 rounded-xl bg-gradient-to-r ${t.style} border-2 transition cursor-pointer ${
                        newTheme === t.style ? 'border-amber-500 scale-105' : 'border-stone-100 hover:border-stone-200'
                      }`}
                      title={t.name}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm md:text-base rounded-2xl shadow shadow-amber-200 transition mt-2 transform active:scale-95 cursor-pointer"
              >
                Create storybook & edit ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Polish Deletion Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-stone-100 flex flex-col p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <ShieldAlert className="w-6 h-6" />
            </div>
            
            <h3 className="font-sans font-extrabold text-stone-800 text-lg mb-1">Remove Storybook</h3>
            <p className="text-sm text-stone-500 mb-6">
              Are you sure you want to permanently delete <strong className="text-stone-800">
                "{activeBooks.find(b => b.id === bookToDelete)?.title || 'this book'}"
              </strong> from your shelf? This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-sm font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-rose-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
