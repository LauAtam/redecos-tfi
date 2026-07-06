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

export interface Categoria {
  id: string;
  name: string;
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
  category_id?: string;
  categories?: Categoria;
}

export interface BuyGroup {
  id: string;
  productId: string;
  nodeId: string;
  status: 'OPEN' | 'COMPLETED' | 'CLOSED' | 'DELIVERED' | 'CANCELLED';
  targetSize: number;
  createdAt: string;
  closedAt?: string | null;
  product?: Producto;
  unitsBought: number;
  unitsLeft: number;
  progress: number;
}

export interface GroupOrder {
  id: string;
  group_id: string;
  profile_id: string;
  quantity: number;
  unit_price: number;
  status: 'CONFIRMED' | 'CANCELLED';
  created_at: string;
  group?: {
    id: string;
    status: string;
    target_size: number;
    product?: Producto;
    node?: Nodo;
  };
}

