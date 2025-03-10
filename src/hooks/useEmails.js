// src/hooks/useEmails.js
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as EmailService from '../services/EmailService';

export default function useEmails(platform) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Load emails from storage on mount
  useEffect(() => {
    const loadEmails = async () => {
      try {
        const storedEmails = await AsyncStorage.getItem(`emails_${platform}`);
        if (storedEmails) {
          setEmails(JSON.parse(storedEmails));
        }
        
        const timestamp = await AsyncStorage.getItem(`lastFetched_${platform}`);
        if (timestamp) {
          setLastFetched(new Date(parseInt(timestamp)));
        }
      } catch (error) {
        console.error(`Error loading ${platform} emails:`, error);
      }
    };

    loadEmails();
  }, [platform]);

  // Fetch emails from the server
  const fetchEmails = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const fetchedEmails = await EmailService.fetchEmails(platform);
      
      setEmails(fetchedEmails);
      
      // Save last fetched timestamp
      const now = Date.now();
      await AsyncStorage.setItem(`lastFetched_${platform}`, now.toString());
      setLastFetched(new Date(now));
      
    } catch (error) {
      console.error(`Error fetching ${platform} emails:`, error);
      setError(error.message || 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [platform, loading]);

  // Clear emails for this platform
  const clearEmails = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(`emails_${platform}`);
      await AsyncStorage.removeItem(`lastFetched_${platform}`);
      setEmails([]);
      setLastFetched(null);
    } catch (error) {
      console.error(`Error clearing ${platform} emails:`, error);
    }
  }, [platform]);

  return {
    emails,
    loading,
    error,
    lastFetched,
    fetchEmails,
    clearEmails
  };
}