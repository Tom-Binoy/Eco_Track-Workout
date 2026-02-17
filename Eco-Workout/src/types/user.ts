export interface UserProfile {
  _id: string;
  email: string;
  name?: string;
  createdAt: number;
  preferences?: {
    units: 'kg' | 'lbs';
    reminderTime?: string;
  };
}
