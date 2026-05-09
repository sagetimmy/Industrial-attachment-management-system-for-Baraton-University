import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Light theme colors
const lightTheme = {
  primary: '#C87941',
  secondary: '#1E3A5F',
  white: '#FFFFFF',
  black: '#000000',
  lightGray: '#F4F4F4',
  gray: '#CCCCCC',
  darkGray: '#444444',
  error: '#C62828',
  success: '#2E7D32',
  // Specific light mode colors
  background: '#FFFFFF',
  surface: '#F4F4F4',
  text: '#444444',
  textSecondary: '#CCCCCC',
  border: '#E0E0E0',
  // Additional colors
  subtitle: '#8899AA',
  muted: '#999999',
  disabled: '#AABBCC',
};

// Dark theme colors
const darkTheme = {
  primary: '#FF9F43',
  secondary: '#2E5090',
  white: '#121212',
  black: '#FFFFFF',
  lightGray: '#2C2C2C',
  gray: '#666666',
  darkGray: '#E0E0E0',
  error: '#EF5350',
  success: '#66BB6A',
  // Specific dark mode colors
  background: '#121212',
  surface: '#1E1E1E',
  text: '#E0E0E0',
  textSecondary: '#999999',
  border: '#444444',
  // Additional colors
  subtitle: '#99AABB',
  muted: '#666666',
  disabled: '#555555',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load theme preference on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('iams_theme_mode');
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (err) {
        console.error('Error loading theme:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('iams_theme_mode', newMode ? 'dark' : 'light');
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
