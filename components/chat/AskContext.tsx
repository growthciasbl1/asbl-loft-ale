'use client';

import { createContext, useContext } from 'react';

export const AskContext = createContext<(query: string) => void>(() => {
  // no-op default
});

export const useAsk = () => useContext(AskContext);
