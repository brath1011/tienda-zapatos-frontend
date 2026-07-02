export type RolUsuario = 'USER' | 'ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
}

export interface AuthResponse {
  token: string;
  tipo: string;
  email: string;
  rol: RolUsuario;
}

export interface Zapato {
  id?: number;
  nombre: string;
  marca: string;
  talla: string;
  color: string;
  categoria: string;
  precio: number;
  stock: number;
  descripcion: string;
  imagenUrl: string;
}

export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
}

export interface CarritoItem {
  id?: number;
  producto: Zapato;
  cantidad: number;
  subtotal: number;
}

export interface PedidoDetalleRequest {
  producto: Pick<Zapato, 'id'>;
  cantidad: number;
}

export interface PedidoRequest {
  detalles: PedidoDetalleRequest[];
}
