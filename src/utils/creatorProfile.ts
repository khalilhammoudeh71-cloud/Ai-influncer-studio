import { useState, useEffect, useCallback } from 'react';
import { CreatorProfile } from '../types';

export const CREATOR_PROFILE_KEY = 'ai_studio_creator_profile';
export const CREATOR_PROFILE_EVENT = 'ai_studio_creator_profile_updated';

export const DEFAULT_CREATOR_PROFILE: CreatorProfile = {
  name: 'Dr. H',
  role: 'Creator & Creative Director',
  appearance: 'Completely bald, smooth clean-shaven bald head (no hair on head), trimmed dark beard, sharp masculine facial features, athletic muscular build',
  bio: 'Visionary digital creator, studio director, and AI influencer architect.',
  gender: 'Male',
  photos: [],
  primaryPhoto: undefined,
  customDynamic: 'Close creative partners with natural banter, intellectual depth, and mutual inspiration'
};

export function getCreatorProfile(): CreatorProfile {
  try {
    const raw = localStorage.getItem(CREATOR_PROFILE_KEY);
    if (!raw) {
      // Check legacy displayName if any
      const prefsRaw = localStorage.getItem('ai_studio_prefs');
      const legacyName = localStorage.getItem('persona_user_name');
      let name = DEFAULT_CREATOR_PROFILE.name;
      if (legacyName && legacyName.trim()) {
        name = legacyName.trim();
      } else if (prefsRaw) {
        try {
          const parsed = JSON.parse(prefsRaw);
          if (parsed.displayName) name = parsed.displayName;
        } catch {}
      }
      return { ...DEFAULT_CREATOR_PROFILE, name };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CREATOR_PROFILE,
      ...parsed,
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      primaryPhoto: parsed.primaryPhoto || (Array.isArray(parsed.photos) && parsed.photos.length > 0 ? parsed.photos[0] : undefined),
    };
  } catch (err) {
    console.error('Failed to load creator profile from localStorage:', err);
    return DEFAULT_CREATOR_PROFILE;
  }
}

function safeSetLocalStorage(key: string, value: string, fallbackWithoutBigImages?: any) {
  try {
    localStorage.setItem(key, value);
  } catch (quotaErr) {
    console.warn('[LocalStorage Quota] Could not save full profile to localStorage, saving lightweight version:', quotaErr);
    if (fallbackWithoutBigImages) {
      try {
        const lightweight = {
          ...fallbackWithoutBigImages,
          // Filter out giant base64 data URLs to prevent quota crash, keep /uploads/ paths
          photos: (fallbackWithoutBigImages.photos || []).filter((p: string) => !p.startsWith('data:image')),
          primaryPhoto: fallbackWithoutBigImages.primaryPhoto?.startsWith('data:image') ? undefined : fallbackWithoutBigImages.primaryPhoto
        };
        localStorage.setItem(key, JSON.stringify(lightweight));
      } catch (innerErr) {
        console.error('[LocalStorage Quota] Even lightweight save failed:', innerErr);
      }
    }
  }
}

export async function fetchServerCreatorProfile(): Promise<CreatorProfile | null> {
  try {
    const token = localStorage.getItem('supabase_auth_token') || localStorage.getItem('sb-access-token') || '';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/creator-profile', { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.profile && typeof data.profile === 'object') {
      const merged: CreatorProfile = {
        ...DEFAULT_CREATOR_PROFILE,
        ...data.profile,
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
        primaryPhoto: data.profile.primaryPhoto || (Array.isArray(data.profile.photos) && data.profile.photos.length > 0 ? data.profile.photos[0] : undefined),
      };
      safeSetLocalStorage(CREATOR_PROFILE_KEY, JSON.stringify(merged), merged);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CREATOR_PROFILE_EVENT, { detail: merged }));
      }
      return merged;
    }
  } catch (err) {
    console.warn('[Creator Profile] Could not fetch from server:', err);
  }
  return null;
}

export async function saveCreatorProfileAsync(updates: Partial<CreatorProfile>): Promise<CreatorProfile> {
  const current = getCreatorProfile();
  const updated: CreatorProfile = {
    ...current,
    ...updates,
    photos: updates.photos !== undefined ? updates.photos : current.photos,
  };

  if (updated.photos.length > 0) {
    if (!updated.primaryPhoto || !updated.photos.includes(updated.primaryPhoto)) {
      updated.primaryPhoto = updated.photos[0];
    }
  } else {
    updated.primaryPhoto = undefined;
  }

  // Save to localStorage
  safeSetLocalStorage(CREATOR_PROFILE_KEY, JSON.stringify(updated), updated);

  if (updated.name) {
    localStorage.setItem('persona_user_name', updated.name);
    try {
      const prefs = JSON.parse(localStorage.getItem('ai_studio_prefs') || '{}');
      prefs.displayName = updated.name;
      localStorage.setItem('ai_studio_prefs', JSON.stringify(prefs));
    } catch {}
  }

  // Dispatch custom event for real-time reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CREATOR_PROFILE_EVENT, { detail: updated }));
  }

  // Persist to server disk store (and convert base64 to /uploads/ files)
  try {
    const token = localStorage.getItem('supabase_auth_token') || localStorage.getItem('sb-access-token') || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/creator-profile', {
      method: 'POST',
      headers,
      body: JSON.stringify(updated),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.profile) {
        const serverMerged: CreatorProfile = {
          ...DEFAULT_CREATOR_PROFILE,
          ...data.profile,
          photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
          primaryPhoto: data.profile.primaryPhoto || (Array.isArray(data.profile.photos) && data.profile.photos.length > 0 ? data.profile.photos[0] : undefined),
        };
        safeSetLocalStorage(CREATOR_PROFILE_KEY, JSON.stringify(serverMerged), serverMerged);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(CREATOR_PROFILE_EVENT, { detail: serverMerged }));
        }
        return serverMerged;
      }
    }
  } catch (err) {
    console.warn('[Creator Profile] Error posting to server:', err);
  }

  return updated;
}

export function saveCreatorProfile(updates: Partial<CreatorProfile>): CreatorProfile {
  const current = getCreatorProfile();
  const updated: CreatorProfile = {
    ...current,
    ...updates,
    photos: updates.photos !== undefined ? updates.photos : current.photos,
  };

  if (updated.photos.length > 0) {
    if (!updated.primaryPhoto || !updated.photos.includes(updated.primaryPhoto)) {
      updated.primaryPhoto = updated.photos[0];
    }
  } else {
    updated.primaryPhoto = undefined;
  }

  safeSetLocalStorage(CREATOR_PROFILE_KEY, JSON.stringify(updated), updated);

  if (updated.name) {
    localStorage.setItem('persona_user_name', updated.name);
    try {
      const prefs = JSON.parse(localStorage.getItem('ai_studio_prefs') || '{}');
      prefs.displayName = updated.name;
      localStorage.setItem('ai_studio_prefs', JSON.stringify(prefs));
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CREATOR_PROFILE_EVENT, { detail: updated }));
  }

  // Trigger async server sync in background
  saveCreatorProfileAsync(updates).catch(console.warn);

  return updated;
}

export function useCreatorProfile(): [CreatorProfile, (updated: Partial<CreatorProfile>) => Promise<CreatorProfile>] {
  const [profile, setProfile] = useState<CreatorProfile>(() => getCreatorProfile());

  useEffect(() => {
    // Initial fetch from server to guarantee persistence across browser sessions
    fetchServerCreatorProfile().then(serverProf => {
      if (serverProf) {
        setProfile(serverProf);
      }
    });

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<CreatorProfile>;
      if (custom.detail) {
        setProfile(custom.detail);
      } else {
        setProfile(getCreatorProfile());
      }
    };

    window.addEventListener(CREATOR_PROFILE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(CREATOR_PROFILE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const update = useCallback(async (updates: Partial<CreatorProfile>) => {
    const saved = await saveCreatorProfileAsync(updates);
    setProfile(saved);
    return saved;
  }, []);

  return [profile, update];
}
