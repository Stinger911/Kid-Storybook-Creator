// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Library from './Library';
import { KidBook } from '../types';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    libraryMode: 'local',
    cloudBooks: [] as KidBook[],
    publicBooks: [] as KidBook[],
    saveBookToStore: vi.fn(),
    deleteBookFromStore: vi.fn(),
    toggleBookPublicity: vi.fn(),
    setShowPremiumModal: vi.fn(),
    setShowLab18Modal: vi.fn(),
  }),
}));

describe('Library', () => {
  const onSelectBook = vi.fn();

  beforeEach(() => {
    onSelectBook.mockReset();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    const { container } = render(<Library onSelectBook={onSelectBook} />);
    expect(container).toBeTruthy();
  });

  it('seeds starter templates into localStorage on first load', () => {
    render(<Library onSelectBook={onSelectBook} />);
    const saved = localStorage.getItem('kid-book-factory-saved-books');
    expect(saved).not.toBeNull();
    const books = JSON.parse(saved!);
    expect(books.length).toBeGreaterThan(0);
  });

  it('displays starter template titles', () => {
    render(<Library onSelectBook={onSelectBook} />);
    expect(screen.getByText(/Space Cadet Adventure/i)).toBeInTheDocument();
    expect(screen.getByText(/Treasures of the Sea/i)).toBeInTheDocument();
  });

  it('shows a button to create a new book', () => {
    render(<Library onSelectBook={onSelectBook} />);
    const createBtn = screen.getByRole('button', { name: /new|create|start/i });
    expect(createBtn).toBeInTheDocument();
  });

  it('shows the Community tab', () => {
    render(<Library onSelectBook={onSelectBook} />);
    expect(screen.getByText(/community/i)).toBeInTheDocument();
  });

  it('loads books from existing localStorage data', () => {
    const customBook: KidBook = {
      id: 'test-book-1',
      title: 'My Custom Story',
      author: 'Test Parent & Test Kid',
      createdAt: '2026-01-01',
      themeColor: 'from-sky-100 to-indigo-100',
      pages: [],
    };
    localStorage.setItem(
      'kid-book-factory-saved-books',
      JSON.stringify([customBook])
    );
    render(<Library onSelectBook={onSelectBook} />);
    expect(screen.getByText('My Custom Story')).toBeInTheDocument();
  });
});
