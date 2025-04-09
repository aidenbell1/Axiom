import React, { 
    createContext, 
    useState, 
    useContext, 
    useEffect 
  } from 'react';
  import { colors, typography, spacing } from '../styles/theme';
  
  type ThemeMode = 'light' | 'dark';
  
  interface ThemeContextType {
    mode: ThemeMode;
    toggleMode: () => void;
    colors: typeof colors;
    typography: typeof typography;
    spacing: typeof spacing;
  }
  
  const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
  
  export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');
  
    // Check for system preference and local storage on initial load
    useEffect(() => {
      const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
  
      setMode(savedMode || systemPreference);
    }, []);
  
    // Apply theme mode to document when it changes
    useEffect(() => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(mode);
      localStorage.setItem('theme-mode', mode);
    }, [mode]);
  
    const toggleMode = () => {
      setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
    };
  
    const contextValue: ThemeContextType = {
      mode,
      toggleMode,
      colors,
      typography,
      spacing
    };
  
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  };
  
  // Custom hook to use theme context
  export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
      throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
  };