import React from 'react';
import * as Icons from '../Icons';
import { Screen, Navigate } from '../../types';
import { useWishlist } from '../../context/WishlistContext';
import './customer-home.css';
import '../../commerce/commerce.css';
import StorefrontHeader from './StorefrontHeader';
import './storefront.css';

interface CustomerLayoutProps {
  current: Screen;
  navigate: Navigate;
  children: React.ReactNode;
  themeToggle?: React.ReactNode;
}

const TABS: { id: Screen; label: string; icon: keyof typeof Icons }[] = [
  { id: 'customer_home', label: 'Home', icon: 'Home' },
  { id: 'customer_search', label: 'Search', icon: 'Explore' },
];

export default function CustomerLayout({ current, navigate, children, themeToggle }: CustomerLayoutProps) {
  const { count } = useWishlist();

  // "Saved" is a distinct tab handled separately so we can show the count badge.
  const isSaved = current === 'customer_saved';

  return (
    <div className="customer-layout flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f7f2]">
      <StorefrontHeader current={current} navigate={navigate} themeToggle={themeToggle} />
      <div className="customer-scroll">{children}</div>

      <nav aria-label="Shopper navigation" className="customer-bottom-nav isl-shopper-nav">
        <div className="isl-shopper-nav-inner">
          {TABS.map((tab) => {
            const isActive = current === tab.id;
            const IconComp = Icons[tab.icon] as React.ComponentType<{ size?: number }>;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <IconComp size={19} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => navigate('customer_saved')}
            aria-current={isSaved ? 'page' : undefined}
            aria-label={`Wishlist${count ? `, ${count} saved items` : ''}`}
          >
            <div className="isl-nav-icon">
              <Icons.Favorite size={19} />
              {count > 0 && (
                <span className="isl-nav-count">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </div>
            <span>Wishlist</span>
          </button>
           <button type="button" onClick={() => navigate('customer_orders')} aria-current={current === 'customer_orders' ? 'page' : undefined}><Icons.Package size={19} /><span>Orders</span></button>
           <button type="button" onClick={() => navigate('customer_stores')} aria-current={current === 'customer_stores' || current === 'customer_store' ? 'page' : undefined}><Icons.Map size={19} /><span>Nearby</span></button>
        </div>
      </nav>
    </div>
  );
}
