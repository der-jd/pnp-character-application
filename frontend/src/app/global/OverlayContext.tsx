"use client";

import { createContext, useContext, useState } from "react";
import { LoadingOverlay } from "@lib/components/ui/loader";

const LoadingOverlayContext = createContext<{
  show: () => void;
  hide: () => void;
  isVisible: boolean;
}>({
  show: () => {},
  hide: () => {},
  isVisible: false,
});

export const LoadingOverlayProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  return (
    <LoadingOverlayContext.Provider value={{ show, hide, isVisible: visible }}>
      {children}
      {visible && <LoadingOverlay />}
    </LoadingOverlayContext.Provider>
  );
};

export const useLoadingOverlay = () => useContext(LoadingOverlayContext);
