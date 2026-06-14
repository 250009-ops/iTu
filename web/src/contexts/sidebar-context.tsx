"use client";



import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useState,

  type ReactNode,

} from "react";



type SidebarContextValue = {

  collapsed: boolean;

  toggle: () => void;

};



const SidebarContext = createContext<SidebarContextValue | null>(null);



const STORAGE_KEY = "ielts-sidebar-collapsed";



export function SidebarProvider({ children }: { children: ReactNode }) {

  const [collapsed, setCollapsed] = useState(false);



  useEffect(() => {

    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");

  }, []);



  const toggle = useCallback(() => {

    setCollapsed((prev) => {

      const next = !prev;

      localStorage.setItem(STORAGE_KEY, String(next));

      return next;

    });

  }, []);



  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);



  return (

    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>

  );

}



export function useSidebar() {

  const ctx = useContext(SidebarContext);

  if (ctx == null) {

    throw new Error("useSidebar must be used within SidebarProvider");

  }

  return ctx;

}


