export interface Influencer {
  id: string;
  name: string;
  username: string;
  platform: 'tiktok' | 'instagram';
  avatarUrl: string;
  followers: number;
  engagementRate: number;
  profileUrl: string;
  niche: string;
  bio: string;
  tone: string;
  visualStyle: string;
}
