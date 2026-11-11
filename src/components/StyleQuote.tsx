import React, { useEffect, useState } from 'react';

export const STYLE_QUOTES = [
  'Style starts with what feels like you.',
  'The best finds are already around the corner.',
  'Wear the mood. Find the local edit.',
  'Good taste looks better when it is close by.',
];

export default function StyleQuote({ className = '' }: { className?: string }) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % STYLE_QUOTES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={className} aria-live="polite" aria-atomic="true">
      <p className="text-sm font-semibold leading-relaxed">“{STYLE_QUOTES[quoteIndex]}”</p>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {STYLE_QUOTES.map((quote, index) => (
          <span
            key={quote}
            className={`h-1.5 rounded-full transition-all ${index === quoteIndex ? 'w-5 bg-current' : 'w-1.5 bg-current/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
