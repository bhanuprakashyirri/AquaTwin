"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface RecentAction {
  id: string;
  title: string;
  timestamp: Date;
}

interface RecentActionsContextType {
  actions: RecentAction[];
  addAction: (title: string) => void;
  clearActions: () => void;
}

const RecentActionsContext = createContext<RecentActionsContextType | undefined>(undefined);

export function RecentActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<RecentAction[]>([]);

  const addAction = useCallback((title: string) => {
    setActions((prev) => {
      const newAction: RecentAction = {
        id: Math.random().toString(36).substring(7),
        title,
        timestamp: new Date(),
      };
      // Keep only the last 10 actions
      return [newAction, ...prev].slice(0, 10);
    });
  }, []);

  const clearActions = useCallback(() => {
    setActions([]);
  }, []);

  return (
    <RecentActionsContext.Provider value={{ actions, addAction, clearActions }}>
      {children}
    </RecentActionsContext.Provider>
  );
}

export function useRecentActions() {
  const context = useContext(RecentActionsContext);
  if (!context) {
    throw new Error("useRecentActions must be used within a RecentActionsProvider");
  }
  return context;
}
