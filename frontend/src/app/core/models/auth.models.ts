export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at?: string;
  default_node_id?: string;
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
  latitude?: number;
  longitude?: number;
  participants_count?: number;
  created_at?: string;
}

export interface Producto {
  id?: string;
  name: string;
  description?: string;
  price: number;
  bulk_size: number;
  retail_price?: number;
  image_url?: string;
  created_at?: string;
}
