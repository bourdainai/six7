import React, { createContext, useContext, useState, useEffect } from 'react';

type Marketplace = 'UK' | 'US';

interface MarketplaceContextType {
  marketplace: Marketplace;
  setMarketplace: (marketplace: Marketplace) => void;
  currencySymbol: string;
  currencyCode: string;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketplace, setMarketplaceState] = useState<Marketplace>(() => {
    const stored = localStorage.getItem('marketplace');
    return (stored === 'US' || stored === 'UK') ? stored : 'UK';
  });

  const setMarketplace = (newMarketplace: Marketplace) => {
    setMarketplaceState(newMarketplace);
    localStorage.setItem('marketplace', newMarketplace);
  };

  const currencySymbol = marketplace === 'US' ? '$' : '£';
  const currencyCode = marketplace === 'US' ? 'USD' : 'GBP';

  return (
    <MarketplaceContext.Provider value={{ marketplace, setMarketplace, currencySymbol, currencyCode }}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
