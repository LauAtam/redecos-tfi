export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at?: string;
}

export interface AppError {
  code: string;
  message: string;
  originalError?: any;
}

export interface AuthResponse {
  user: Profile | null;
  error?: AppError | null;
}
