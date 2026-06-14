import React, { useState, useEffect, useRef } from 'react';
import { KidBook, BookPage, LayoutStyle } from '../types';
import ColoringConverter from './ColoringConverter';
import HandwritingCustomizer from './HandwritingCustomizer';
import { getVectorOutlineFallback, generateId } from '../utils/generators';
import { 
  Book, ArrowLeft, Plus, ChevronRight, PenTool, Sparkles, 
  Trash2, FileText, Printer, Save, CheckCircle, HelpCircle, User, Loader2,
  AlertCircle, Image as ImageIcon, Globe, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BookStudioProps {
  book: KidBook;
  onBack: () => void;
  onSave: (updatedBook: KidBook) => void | Promise<void>;
}

export default function BookStudio({ book, onBack, onSave }: BookStudioProps) {
  const { user, libraryMode, setShowPremiumModal, toggleBookPublicity } = useAuth();
  const [currentBook, setCurrentBook] = useState<KidBook>(book);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // State for AI generation
  const [aiPrompt, setAiPrompt] = useState('');
  const [kidName, setKidName] = useState(() => {
    try {
      return localStorage.getItem('storycraft_kid_name') || '';
    } catch {
      return '';
    }
  });
  const [kidAge, setKidAge] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('storycraft_kid_age');
      return saved ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [pagesToGenerate, setPagesToGenerate] = useState<number>(3);

  // Status banners
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to onSave so the unmount flush uses the latest version.
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Serialization: only one save runs at a time. If a new save arrives while
  // one is in flight, we keep the latest book in pendingBookRef and start
  // another save immediately after the current one finishes.
  const isSavingRef = useRef(false);
  const pendingBookRef = useRef<KidBook | null>(null);

  const executeSave = async (updatedBook: KidBook) => {
    if (isSavingRef.current) {
      pendingBookRef.current = updatedBook;
      return;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveRef.current(updatedBook);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e: any) {
      console.error("Save failed:", e);
      const raw = e?.message || String(e);
      let msg = 'Save failed.';
      try {
        const parsed = JSON.parse(raw);
        msg = parsed?.error || msg;
      } catch {
        msg = raw.slice(0, 120);
      }
      setErrorMsg(msg);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
      // Drain the single-slot queue: save the latest version that arrived while we were busy.
      if (pendingBookRef.current) {
        const next = pendingBookRef.current;
        pendingBookRef.current = null;
        void executeSave(next);
      }
    }
  };

  // Auto-saves are debounced so rapid edits (typing, slider drags) batch into
  // one upload. Manual save (button) fires immediately.
  const triggerSave = (updatedBook: KidBook, immediate = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (immediate) {
      void executeSave(updatedBook);
    } else {
      saveTimerRef.current = setTimeout(() => void executeSave(updatedBook), 1500);
    }
  };

  // Cancel any pending debounced save on unmount.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // active page helper
  const activePage = currentBook.pages[activePageIndex] || null;

  // Persist kidName and kidAge on change
  useEffect(() => {
    try {
      localStorage.setItem('storycraft_kid_name', kidName);
    } catch (e) {
      console.warn('Unable to write to localStorage:', e);
    }
  }, [kidName]);

  useEffect(() => {
    try {
      localStorage.setItem('storycraft_kid_age', kidAge.toString());
    } catch (e) {
      console.warn('Unable to write to localStorage:', e);
    }
  }, [kidAge]);

  // Check if AI is configured in backend on mount
  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.json())
      .then(data => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false));
  }, []);

  const handlePageSelect = (index: number) => {
    setActivePageIndex(index);
  };

  const handleUpdatePage = (updatedPage: Partial<BookPage>) => {
    if (activePageIndex === -1 || !activePage) return;
    
    const updatedPages = [...currentBook.pages];
    updatedPages[activePageIndex] = {
      ...activePage,
      ...updatedPage,
    };
    
    const nextBook = { ...currentBook, pages: updatedPages };
    setCurrentBook(nextBook);
    triggerSave(nextBook);
  };

  // Turn page photo to black & white coloring template
  const handleColoringGenerated = (coloringUrl: string, originalUrl: string, adjustments: any) => {
    if (!activePage) return;
    
    const adjustmentsChanged = !activePage.coloringAdjustments || 
      activePage.coloringAdjustments.threshold !== adjustments.threshold ||
      activePage.coloringAdjustments.edgeStrength !== adjustments.edgeStrength ||
      activePage.coloringAdjustments.brightness !== adjustments.brightness ||
      activePage.coloringAdjustments.contrast !== adjustments.contrast ||
      activePage.coloringAdjustments.invert !== adjustments.invert ||
      activePage.coloringAdjustments.noProcess !== adjustments.noProcess;

    // Prevent state-update infinite loop: update if image URLs changed or adjustments changed
    if (
      activePage.coloringImage !== coloringUrl || 
      activePage.originalImage !== originalUrl ||
      adjustmentsChanged
    ) {
      handleUpdatePage({
        coloringImage: coloringUrl,
        originalImage: originalUrl,
        coloringAdjustments: adjustments,
      });
    }
  };

  // Add new page
  const handleAddPage = () => {
    // Check if free user is exceeding the 3 pages limit
    if (currentBook.pages.length >= 3 && user?.subscriptionStatus !== 'premium') {
      setShowPremiumModal(true);
      return;
    }

    const num = currentBook.pages.length + 1;
    const newPage: BookPage = {
      id: generateId(),
      title: `Page ${num} Magic Adventure`,
      type: 'mixed',
      layout: 'coloring-top-writing-bottom',
      storyText: 'Write a sweet story sentence here with your child...!',
      tracingText: 'KID',
      pageNumber: num,
      coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
    };
    
    const nextBook = {
      ...currentBook,
      pages: [...currentBook.pages, newPage]
    };
    setCurrentBook(nextBook);
    setActivePageIndex(nextBook.pages.length - 1);
    triggerSave(nextBook, true);
  };

  // Delete page
  const handleDeletePage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentBook.pages.length <= 1) {
      alert("Your storybook needs at least one page!");
      return;
    }
    
    const filtered = currentBook.pages.filter((_, idx) => idx !== index);
    // Recalculate page numbers
    const renumbered = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    
    const nextBook = {
      ...currentBook,
      pages: renumbered
    };
    
    setCurrentBook(nextBook);
    setActivePageIndex(Math.max(0, index - 1));
    triggerSave(nextBook, true);
  };

  // Trigger browser raw physical sheet printer layout and print helper instructions modal
  const handlePrint = () => {
    setShowPrintModal(true);
    try {
      window.print();
    } catch (e) {
      console.log("Print popup blocked inside sandbox", e);
    }
  };

  const handleManualSave = () => {
    triggerSave(currentBook, true);
  };

  const generateAIBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    // AI generated booklets are a premium VIP subscription feature!
    if (user?.subscriptionStatus !== 'premium') {
      setShowPremiumModal(true);
      return;
    }

    setAiGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: aiPrompt,
          kidName: kidName,
          kidAge: kidAge,
          pagesCount: pagesToGenerate
        })
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || `HTTP ${response.status}: ${response.statusText}` };
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `API error (Status: ${response.status})`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedPages: BookPage[] = data.pages.map((p: any, idx: number) => ({
        id: generateId(),
        title: p.pageTitle,
        type: 'mixed',
        layout: 'coloring-top-writing-bottom',
        storyText: p.storyText,
        tracingText: p.tradingWord || '',
        pageNumber: idx + 1,
        coloringAdjustments: { threshold: 40, edgeStrength: 3, brightness: 15, contrast: 50, invert: false }
      }));

      const newAIBook: KidBook = {
        ...currentBook,
        title: data.bookTitle,
        author: `${kidName || 'Me'} & ${currentBook.author || 'Parent'}`,
        pages: generatedPages
      };

      setCurrentBook(newAIBook);
      setActivePageIndex(0);
      triggerSave(newAIBook, true);
      setAiPrompt('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong generating your storybook. Let\'s try key fallback!');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="book-studio">
      
      {/* Top action status headers (Hidden in printing stylesheet) */}
      <div className="print:hidden w-full flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition"
            title="Go to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Story Workshop</span>
              {isSaving ? (
                <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {libraryMode === 'cloud' ? 'Syncing to cloud...' : 'Saving...'}
                </span>
              ) : showSaveSuccess ? (
                <span className="text-xs text-emerald-650 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-bounce" /> {libraryMode === 'cloud' ? 'Synced to cloud' : 'Saved locally'}
                </span>
              ) : null}
            </div>
            <h2 className="text-xl font-sans font-bold text-stone-800 mt-0.5">{currentBook.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={async () => {
                const currentlyPublic = currentBook.isPublic || false;
                const updated = {
                  ...currentBook,
                  isPublic: !currentlyPublic,
                  moderationStatus: 'pending' as const
                };
                setCurrentBook(updated);
                triggerSave(updated, true);
                await toggleBookPublicity(currentBook.id, !currentlyPublic);
              }}
              className={`px-3.5 py-2 text-xs font-black rounded-xl border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                currentBook.isPublic
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-250'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-500 border-stone-200'
              }`}
              title={currentBook.isPublic ? "Unpublish from library" : "Publish to community showcase"}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
              <span>{currentBook.isPublic ? "Public Requested" : "Publish Book"}</span>
            </button>
          )}

          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className={`px-4 py-2 font-semibold text-sm rounded-xl transition flex items-center gap-2 border shadow-sm ${
              isSaving
                ? 'bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200 cursor-pointer'
            }`}
          >
            {isSaving
              ? <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
              : <Save className="w-4 h-4 text-stone-500" />}
            <span>{isSaving ? 'Saving...' : 'Save Book'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition flex items-center gap-2 shadow-sm shadow-amber-200 transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheets</span>
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout (Hidden in printing stylesheet) */}
      <div className="print:hidden flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Page organizer navigator drawer */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-stone-700 text-xs tracking-wider uppercase">Book Pages</h3>
              <span className="text-xs font-mono font-bold text-stone-400">{currentBook.pages.length} total</span>
            </div>

            {/* Vertically scrolls drafts */}
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 max-h-[400px]">
              {currentBook.pages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => handlePageSelect(idx)}
                  className={`flex-shrink-0 w-36 lg:w-full flex items-center justify-between gap-2 p-3 rounded-xl border text-left transition ${
                    activePageIndex === idx
                      ? 'bg-amber-500 text-white border-amber-600 shadow'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      activePageIndex === idx ? 'bg-white/30 text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {p.pageNumber}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[80px] lg:max-w-[110px]">{p.title}</span>
                  </div>

                  <Trash2
                    onClick={(e) => handleDeletePage(idx, e)}
                    className={`w-3.5 h-3.5 cursor-pointer transition transform hover:scale-110 ${
                      activePageIndex === idx ? 'text-white/80 hover:text-white' : 'text-stone-400 hover:text-rose-500'
                    }`}
                  />
                </button>
              ))}

              {/* Add New Page Block */}
              <button
                onClick={handleAddPage}
                className="flex-shrink-0 w-36 lg:w-full flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 font-bold text-xs hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Page</span>
              </button>
            </div>
          </div>

          {/* Book settings details Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="font-sans font-bold text-stone-700 text-xs tracking-wider uppercase">Book Cover Info</h3>
            
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Title of Book</label>
                <input
                  type="text"
                  value={currentBook.title}
                  onChange={(e) => {
                    const next = { ...currentBook, title: e.target.value };
                    setCurrentBook(next);
                    triggerSave(next);
                  }}
                  className="px-2.5 py-1 text-xs rounded border border-stone-300 bg-white text-stone-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Authors</label>
                <input
                  type="text"
                  value={currentBook.author}
                  onChange={(e) => {
                    const next = { ...currentBook, author: e.target.value };
                    setCurrentBook(next);
                    triggerSave(next);
                  }}
                  placeholder="Parent & Kids names"
                  className="px-2.5 py-1 text-xs rounded border border-stone-300 bg-white text-stone-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Page workspace canvas area */}
        <div className="flex-grow flex flex-col gap-6">
          
          {/* AI Page Generation Magic Ribbon (Always elegant regardless of API keys fallback triggers) */}
          <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/50 rounded-2xl p-5 relative overflow-hidden">
            {/* Background sparkle blur */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-200 rounded-full filter blur-2xl opacity-40" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-400 rounded-xl text-white shadow shadow-amber-200 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-stone-800 text-sm">Write Story Book with AI Magic</h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Describe your fairytale idea below! Our companion Gemini writer will instantly spin a magical children's adventure book complete with key vocabulary writing practice!
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono font-bold px-2 py-1 rounded bg-stone-100 text-stone-500 self-start md:self-center">
                {aiAvailable ? "🔥 AI Mode: Standard" : "⚡ Falling back to Local Creator Patterns"}
              </div>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={generateAIBook} className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <input
                  type="text"
                  required
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A friendly dragon who wanted to bake blueberry muffins"
                  disabled={aiGenerating}
                  className="w-full pl-3 pr-4 py-2 bg-white text-stone-800 placeholder-stone-400 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200 text-stone-800"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="text"
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  placeholder="Kid's name"
                  disabled={aiGenerating}
                  className="w-full px-3 py-2 bg-white text-stone-800 placeholder-stone-400 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200 text-stone-800"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={kidAge}
                  onChange={(e) => setKidAge(Number(e.target.value))}
                  disabled={aiGenerating}
                  className="w-full px-3 py-2 bg-white text-stone-800 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200 text-stone-800 font-sans"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map(age => (
                    <option key={age} value={age}>Age {age}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={pagesToGenerate}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 3 && user?.subscriptionStatus !== 'premium') {
                      setShowPremiumModal(true);
                      setPagesToGenerate(3);
                    } else {
                      setPagesToGenerate(val);
                    }
                  }}
                  disabled={aiGenerating}
                  className="w-full px-3 py-2 bg-white text-stone-800 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-200 text-stone-800 font-sans cursor-pointer"
                >
                  <option value={3}>3 Pages (Free)</option>
                  <option value={5}>5 Pages {user?.subscriptionStatus !== 'premium' ? '🔒' : '✨'}</option>
                  <option value={8}>8 Pages {user?.subscriptionStatus !== 'premium' ? '🔒' : '✨'}</option>
                  <option value={12}>12 Pages {user?.subscriptionStatus !== 'premium' ? '🔒' : '✨'}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={aiGenerating}
                className="md:col-span-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Spinning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Story</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Page Editor Panel */}
          {activePage ? (
            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 flex flex-col gap-6" id="active-page-editor">
              
              {/* Active Page Details Box */}
              <div className="flex flex-col gap-4 border-b border-stone-200 pb-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {activePage.pageNumber}
                    </span>
                    <input
                      type="text"
                      value={activePage.title}
                      onChange={(e) => handleUpdatePage({ title: e.target.value })}
                      placeholder="Title this page..."
                      className="font-sans font-bold text-lg text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:outline-none bg-transparent"
                    />
                  </div>

                  {/* Layout Style Choice */}
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1 shadow-sm">
                    {[
                      { id: 'coloring-top-writing-bottom', label: 'Color + Trace', icon: PenTool },
                      { id: 'coloring-only', label: 'Color Only', icon: ImageIcon },
                      { id: 'writing-only', label: 'Trace Only', icon: FileText },
                    ].map((lay) => (
                      <button
                        key={lay.id}
                        type="button"
                        onClick={() => handleUpdatePage({ layout: lay.id as LayoutStyle })}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                          activePage.layout === lay.id
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <lay.icon className="w-3.5 h-3.5" />
                        <span>{lay.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Narrative / story sentence (Parents & Kids Edit together) */}
                <div className="flex flex-col gap-1 pt-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Storybook sentence</label>
                  <textarea
                    rows={2}
                    value={activePage.storyText || ''}
                    onChange={(e) => handleUpdatePage({ storyText: e.target.value })}
                    placeholder="Tell a simple, loving sentence for this scene of the story..."
                    className="w-full text-stone-700 bg-white border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-amber-200 text-sm"
                  />
                </div>
              </div>

              {/* REAL-TIME WORKBOOK WORKSHEET PREVIEW SHEET (MORPHS DYNAMICALLY) */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-stone-100 px-4 py-2 rounded-xl">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Real-Time Sheet Preview (Exactly how it will print)</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded shadow-2xs">
                    Layout: {
                      activePage.layout === 'coloring-top-writing-bottom' ? 'Color + Trace' : 
                      activePage.layout === 'coloring-only' ? 'Color Only' : 'Trace Only'
                    }
                  </span>
                </div>

                {/* THE LIVE DIGITAL PAPER WORKBOOK VIEW */}
                <div className="w-full flex justify-center bg-stone-200 p-3 sm:p-6 rounded-2xl border border-stone-300 shadow-inner">
                  <div className="w-full max-w-[680px] min-h-[580px] bg-white rounded-lg shadow-xl p-6 sm:p-8 flex flex-col gap-5 justify-between relative overflow-hidden text-stone-700">
                    
                    {/* elementary notebook red binder line */}
                    <div className="absolute left-4 top-0 bottom-0 w-[1.5px] bg-red-200 pointer-events-none" />

                    {/* Paper Header */}
                    <div className="flex justify-between items-baseline border-b border-stone-200 pb-2 pl-4">
                      <div>
                        <h4 className="font-serif font-black text-sm sm:text-base text-stone-900 tracking-tight truncate max-w-[340px] sm:max-w-[440px]">{currentBook.title}</h4>
                        <p className="text-[9px] sm:text-[10px] text-stone-500">Page Concept: <span className="font-bold text-stone-700">{activePage.title}</span></p>
                      </div>
                      <span className="text-[10px] font-sans font-black text-stone-400">PAGE {activePage.pageNumber}</span>
                    </div>

                    {/* Story sentence block if present */}
                    {activePage.storyText && (
                      <div className="pl-4 py-1.5 px-3 bg-stone-50 rounded border border-stone-150">
                        <p className="text-xs font-serif italic text-stone-800 leading-relaxed">"{activePage.storyText}"</p>
                      </div>
                    )}

                    {/* COLORING SEGMENT LAYER */}
                    {(activePage.layout === 'coloring-top-writing-bottom' || activePage.layout === 'coloring-only') && (
                      <div className={`flex-1 min-h-[380px] flex flex-col items-center justify-center border border-dashed border-stone-300 rounded-xl p-4 bg-white pl-5 relative ${
                        activePage.layout === 'coloring-only' ? 'p-6 min-h-[520px]' : ''
                      }`}>
                        {activePage.coloringImage ? (
                          <img 
                            src={activePage.coloringImage} 
                            alt="Coloring outline preview" 
                            className={`w-full object-contain select-none ${
                              activePage.layout === 'coloring-only' ? 'max-h-[480px]' : 'max-h-[365px]'
                            }`}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-center gap-2 p-3 text-stone-400">
                            <div 
                              className="w-24 h-24 mb-1"
                              dangerouslySetInnerHTML={{ __html: getVectorOutlineFallback(activePage.tracingText || 'KID') }}
                            />
                            <p className="text-xs font-bold text-stone-600">Default coloring illustration is active</p>
                            <p className="text-[10px] text-stone-400 max-w-xs">Upload your kid's photo or drawing in the tool below to convert it to a custom coloring outline!</p>
                          </div>
                        )}
                        <span className="text-[8px] sm:text-[9px] font-sans font-bold text-stone-400 absolute bottom-1 sm:bottom-2 tracking-widest uppercase">Coloring Plate</span>
                      </div>
                    )}

                    {/* WRITING TRACING SEGMENT LAYER */}
                    {(activePage.layout === 'coloring-top-writing-bottom' || activePage.layout === 'writing-only') && (
                      <div className={`flex-shrink-0 flex flex-col pt-1 pl-4 ${
                        activePage.layout === 'writing-only' ? 'flex-1 justify-center min-h-[280px]' : ''
                      }`}>
                        <div className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 flex justify-between items-center">
                          <span>Handwriting Practice Grid</span>
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-mono tracking-normal font-bold">Trace word: {activePage.tracingText || 'KID'}</span>
                        </div>
                        
                        {/* Realistic handwriting background guides lines */}
                        <div className="w-full border border-dotted border-stone-350 rounded-xl bg-white p-3.5 relative h-[100px] pl-6 select-none overflow-hidden shadow-2xs">
                          {/* standard ruled lines sizing */}
                          <svg className="absolute inset-0 w-full h-[100px] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="0%" y1="18" x2="100%" y2="18" stroke="#93c5fd" strokeWidth="1" />
                            <line x1="0%" y1="50" x2="100%" y2="50" stroke="#fca5a5" strokeWidth="1" strokeDasharray="5 3" />
                            <line x1="0%" y1="82" x2="100%" y2="82" stroke="#93c5fd" strokeWidth="1" />
                          </svg>

                          {/* Dashed guidelines letter template layer */}
                          <div className="absolute inset-y-0 inset-x-6 flex items-center justify-center">
                            <div className="w-full flex justify-center items-baseline gap-2 overflow-hidden px-2">
                              {(activePage.tracingText || 'KID').split('').map((char, index) => {
                                if (char === ' ') return <span key={index} className="w-3" />;
                                return (
                                  <div key={index} className="relative flex flex-col items-center">
                                    <svg viewBox="0 0 100 120" className="w-10 h-16 pointer-events-none overflow-visible">
                                      <text
                                        x="50%"
                                        y="94"
                                        textAnchor="middle"
                                        className="school-tracing-font font-handwriting text-[92px] fill-none stroke-stone-300 stroke-[1.5]"
                                        style={{
                                          fontFamily: '"Playwrite GB J", "Schoolbell", "Short Stack", "Playpen Sans", cursive',
                                          fontStyle: 'italic',
                                          fontWeight: 400,
                                          strokeDasharray: '6,3'
                                        }}
                                      >
                                        {char}
                                      </text>
                                      {/* helper point dot */}
                                      {!activePage.hideStartDots && (
                                        <circle cx="50%" cy="16" r="3" fill="#ef4444" opacity="0.8" />
                                      )}
                                    </svg>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Paper Footer information */}
                    <div className="flex justify-between items-center border-t border-stone-150 pt-1.5 text-[8px] sm:text-[9px] text-stone-400 font-mono tracking-wide px-2">
                      <span>By: {currentBook.author || 'Parent'}</span>
                      <span className="italic">Print & Playroom Studio</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* ACTIVE PAGE TOOL CUSTOMIZERS CONTROL AREA */}
              <div className="flex flex-col gap-6 border-t border-stone-200 pt-5">
                
                {/* 1. Photo Outline Creator (Only visible if layout includes image) */}
                {(activePage.layout === 'coloring-top-writing-bottom' || activePage.layout === 'coloring-only') && (
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                      <div className="w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                        A
                      </div>
                      <span className="text-xs font-sans font-bold text-stone-700 uppercase tracking-wider">Convert Custom Photo to Coloring Outline</span>
                    </div>
                    
                    <ColoringConverter
                      onColoringGenerated={handleColoringGenerated}
                      initialOriginalImage={activePage.originalImage}
                      initialAdjustments={activePage.coloringAdjustments}
                    />
                  </div>
                )}

                {/* 2. Tracing practice editor (Only visible if layout includes writing) */}
                {(activePage.layout === 'coloring-top-writing-bottom' || activePage.layout === 'writing-only') && (
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                      <div className="w-6 h-6 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                        {activePage.layout === 'coloring-top-writing-bottom' ? 'B' : 'A'}
                      </div>
                      <span className="text-xs font-sans font-bold text-stone-700 uppercase tracking-wider">
                        {activePage.layout === 'coloring-top-writing-bottom' ? 'Handwriting practice tracing word configuration' : 'Configure Lined Tracing Practice Word'}
                      </span>
                    </div>
                    
                    <HandwritingCustomizer
                      initialText={activePage.tracingText || 'KID'}
                      onTextChange={(val) => handleUpdatePage({ tracingText: val })}
                      hideStartDots={!!activePage.hideStartDots}
                      onHideStartDotsChange={(val) => handleUpdatePage({ hideStartDots: val })}
                    />
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-stone-50 border border-dashed border-stone-300 rounded-3xl p-12 text-center text-stone-500">
              <Book className="w-12 h-12 text-stone-400 mx-auto mb-4 animate-pulse" />
              <h4 className="font-sans font-bold text-stone-700 text-lg">Your workspace is ready!</h4>
              <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto">
                Select a page from the list on the left to start editing, or create a magic story from scratch with AI!
              </p>
            </div>
          )}
        </div>
      </div>

       {/* PRINT-ONLY STORYBOOK LAYOUT GRID (EXCLUSIVELY visible during print trigger window, hidden in viewport) */}
      <div className="hidden print:block w-full">
        {currentBook.pages.map((p, idx) => {
          const isDouble = p.layout === 'coloring-top-writing-bottom';
          const isColoringOnly = p.layout === 'coloring-only';
          const isWritingOnly = p.layout === 'writing-only';

          return (
            <div 
              key={p.id} 
              className="w-full p-6 flex flex-col justify-between page-break-after-always bg-white print:p-4 print:gap-2.5 print:h-[232mm] print:min-h-[232mm] print:max-h-[232mm] print:overflow-hidden print:box-border print:border-none"
              style={{ boxSizing: 'border-box' }}
            >
              
              {/* Kid worksheet sheet banner */}
              <div className="flex justify-between items-baseline border-b-2 border-stone-300 pb-2 print:pb-1 flex-shrink-0">
                <div>
                  <h1 className="text-xl font-serif font-black tracking-tight text-neutral-900 print:text-lg">{currentBook.title}</h1>
                  <p className="text-[10px] text-stone-500 mt-0.5">Created with love by: <span className="font-bold text-stone-700">{currentBook.author || 'Parent & Kid'}</span></p>
                </div>
                <span className="text-xs font-sans font-extrabold text-stone-400">PAGE {p.pageNumber}</span>
              </div>

              {/* Title / Narrative story */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-stone-200 print:p-2 print:rounded-xl flex-shrink-0">
                <h2 className="text-base font-bold text-neutral-800 font-sans mb-0.5 print:text-[11px]">{p.title}</h2>
                <p className="text-xs text-stone-600 font-serif leading-relaxed italic print:text-[10px]">"{p.storyText}"</p>
              </div>

              {/* Illustration Plate (Coloring Area) */}
              {(isDouble || isColoringOnly) && (
                <div 
                  className={`flex-1 flex flex-col items-center justify-center border-4 border-double border-stone-300 rounded-3xl bg-white relative ${
                    isDouble 
                      ? 'p-4 my-2.5 min-h-[300px] max-h-[420px] print:my-1.5 print:p-2.5 print:min-h-[280px] print:max-h-[360px]' 
                      : 'p-6 my-4 min-h-[360px] print:p-4 print:my-2 print:min-h-[380px] print:max-h-[440px]'
                  }`}
                >
                  {p.coloringImage ? (
                    <img 
                      src={p.coloringImage} 
                      alt="Coloring outline printable" 
                      className={`w-full object-contain ${
                        isDouble 
                          ? 'max-h-[380px] print:max-h-[330px]' 
                          : 'max-h-[440px] print:max-h-[400px]'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className={`flex items-center justify-center ${
                        isDouble ? 'w-36 h-36 print:w-32 print:h-32' : 'w-48 h-48 print:w-60 print:h-60'
                      }`}
                      dangerouslySetInnerHTML={{ __html: getVectorOutlineFallback(p.tracingText || 'KID') }}
                    />
                  )}
                  <span className="text-[8px] font-sans font-bold text-stone-400 absolute bottom-1 mt-0.5 tracking-widest uppercase">Coloring Plate — Grab your Crayons!</span>
                </div>
              )}

              {/* Tracing / Handwriting template plate */}
              {(isDouble || isWritingOnly) && (
                <div className="w-full flex-shrink-0 flex flex-col pt-2 print:pt-1">
                  <span className="text-[10px] font-bold text-stone-500 font-sans uppercase mb-1 flex justify-between pr-2 print:text-[9px] print:mb-0.5">
                    <span>Pencil tracing exercise:</span>
                    <span className="font-mono text-stone-400">Word: {p.tracingText || 'KID'}</span>
                  </span>
                  
                  {/* SVG Tracing template block suited for real print pencils */}
                  <div className={`w-full border-2 border-dotted border-stone-300 rounded-2xl bg-white p-4 relative pl-8 print:p-1.5 sm:print:p-2 ${
                    isDouble ? 'h-[105px] print:h-[80px]' : 'h-[170px] print:h-[150px]'
                  }`}>
                    {/* binder left border */}
                    <div className="absolute left-3 top-0 bottom-0 w-[1.5px] bg-red-200" />
                    
                    {/* Worksheets ruled lines of standard sizing */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0%" y1={isDouble ? "16" : "26"} x2="100%" y2={isDouble ? "16" : "26"} stroke="#93c5fd" strokeWidth="1.2" />
                      <line x1="0%" y1={isDouble ? "46" : "78"} x2="100%" y2={isDouble ? "46" : "78"} stroke="#fca5a5" strokeWidth="1.2" strokeDasharray="5 3" />
                      <line x1="0%" y1={isDouble ? "76" : "130"} x2="100%" y2={isDouble ? "76" : "130"} stroke="#93c5fd" strokeWidth="1.2" />
                    </svg>

                    {/* Big printable dashed characters */}
                    <div className="absolute inset-y-0 inset-x-8 flex items-center justify-center">
                      <div className="w-full flex justify-center items-baseline gap-1.5 overflow-hidden px-2">
                        {(p.tracingText || 'KID').split('').map((char, index) => {
                          if (char === ' ') {
                            return <span key={index} className={isDouble ? "w-3" : "w-6"} />;
                          }
                          return (
                            <div key={index} className="relative flex flex-col items-center">
                              <svg viewBox="0 0 100 120" className={`overflow-visible pointer-events-none ${
                                isDouble ? 'w-10 h-14 print:w-7.5 print:h-11' : 'w-14 h-24'
                              }`}>
                                <text
                                  x="50%"
                                  y="94"
                                  textAnchor="middle"
                                  fontSize="92"
                                  className="school-tracing-font font-handwriting fill-none stroke-neutral-300 stroke-[1.5]"
                                  style={{
                                    fontFamily: '"Playwrite GB J", "Schoolbell", "Short Stack", "Playpen Sans", cursive',
                                    fontStyle: 'italic',
                                    fontWeight: 400,
                                    strokeDasharray: '6,3'
                                  }}
                                >
                                  {char}
                                </text>
                                {!p.hideStartDots && (
                                  <circle cx="50%" cy="16" r="3.5" fill="#f43f5e" />
                                )}
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center text-[9px] text-stone-400 font-sans mt-2 print:mt-1 border-t border-neutral-150 pt-2 print:pt-1 flex-shrink-0">
                Generated by StoryCraft Workshop • Designed for Happy Learning & Handwriting Practice
              </div>
            </div>
          );
        })}
      </div>

      {/* PRINT DIALOG PREVIEW & EXPLANATION MODAL (CRO PERFECTED!) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border border-stone-200">
            {/* Close button */}
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-50 bg-stone-100 text-stone-600 transition"
              aria-label="Close Print Preview"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow shadow-amber-200">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-black text-lg text-stone-909 text-stone-900">Print Sheets & Save PDF Guide</h3>
                <p className="text-xs text-stone-500 font-mono">Real-world workflow for happy parenting sheets</p>
              </div>
            </div>

            {/* Instruction body */}
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex gap-3 text-stone-700">
                <span className="text-lg">💡</span>
                <div className="text-xs sm:text-sm leading-relaxed">
                  <strong className="text-amber-900 block font-bold mb-1">Standard Sandboxed iFrame Blocks Direct Printing</strong>
                  Because this application is loaded inside an interactive developer preview frame, direct <strong>window.print()</strong> prompts are blocked by browser sandboxing flags to keep you safe.
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 flex flex-col gap-3.5">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest block">How to easily print or download:</span>
                
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-xs sm:text-sm text-stone-700">
                    Click the <strong>Open in New Tab</strong> icon (circular arrow) in the very top right corner of this screen frame to launch the app standalone in a full browser tab.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-xs sm:text-sm text-stone-700">
                    Click the <strong>Print Sheets</strong> button there. This will instantly launch your standard browser printing system.
                  </p>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-xs sm:text-sm text-stone-700">
                    In your browser print popups settings: select <strong>"Save as PDF"</strong> to download a digital worksheet workbook, or choose your home physical ink-jet printer! Check <strong>"Background graphics"</strong> to print the ruled guidelines too!
                  </p>
                </div>
              </div>

              {/* Printable sheet scroll preview widget */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-1">Quick Workbook Sheet Preview:</span>
                <div className="max-h-[160px] overflow-y-auto border border-stone-200 rounded-2xl bg-stone-100 p-3 grid grid-cols-2 gap-2">
                  {currentBook.pages.map((p) => (
                    <div key={p.id} className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-2xs flex flex-col justify-between h-[80px]">
                      <span className="text-[8px] font-mono font-bold text-stone-400 block">SHEET {p.pageNumber}:</span>
                      <span className="text-[10px] font-bold text-stone-800 truncate">{p.title}</span>
                      <span className="text-[8px] text-stone-400 capitalize">Layout: {p.layout.replace(/-/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-6 border-t border-stone-100 pt-4 gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 border border-stone-300 rounded-xl font-bold text-xs text-stone-600 hover:bg-stone-50 transition"
              >
                Cancel & Back
              </button>
              
              <button
                onClick={() => {
                  try {
                    window.print();
                  } catch (e) {
                    alert("Print attempt blocked by sandboxed iframe. Please open in New Tab as shown in step 1.");
                  }
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Try Direct Print Anyway</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
