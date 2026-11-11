import React from 'react';
import * as Icons from './Icons';
import { Theme } from '../theme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle inline-flex h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6557f5] focus-visible:ring-offset-2"
    >
      <Icons.Moon size={16} aria-hidden="true" />
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
