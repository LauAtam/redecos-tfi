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

export interface Nodo {
  id?: string;
  name: string;
  address: string;
  manager_name: string;
  created_at?: string;
}

export interface Producto {
  id?: string;
  name: string;
  description?: string;
  price: number;
  bulk_size: number;
  image_url?: string;
  created_at?: string;
}
