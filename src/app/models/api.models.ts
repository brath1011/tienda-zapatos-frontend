export type RolUsuario = 'CLIENTE' | 'ADMINISTRADOR' | 'VENTAS' | 'REPARTIDOR';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
}

export interface UsuarioAdminRequest {
  nombre: string;
  email: string;
  password: string;
  rol: 'VENTAS' | 'REPARTIDOR';
}

export interface AuthResponse {
  token: string;
  tipo: string;
  email: string;
  rol: RolUsuario;
  zona?: string;
}

// --- CATALOGO ---
export interface Zapato {
  id?: number;
  nombre: string;
  marca: string;
  genero: string; // 'Caballero' o 'Mujer'
  color: string;
  categoria: string;
  precio: number;
  tallasStock: { [talla: string]: number }; // Diccionario de tallas y su stock
  descripcion: string;
  descripcionGeneral?: string;
  imagen: string; // Asegurado para coincidir con la DB
  precioDescuento?: number;
}

export interface CarritoItem {
  id?: number;
  producto: Zapato;
  tallaSeleccionada: string;
  cantidad: number;
  subtotal: number;
}

// --- PEDIDOS Y PAGOS ---
export interface PedidoDetalleRequest {
  producto: Pick<Zapato, 'id'>;
  cantidad: number;
  tallaSeleccionada: string;
}

export interface PedidoRequest {
  detalles: PedidoDetalleRequest[];
}

export interface CompraWebRequest {
  pedido: any;
  metodoPago?: string;
  numeroTarjeta?: string;
  cvv?: string;
  reservaId?: number;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  calleJiron?: string;
  numero?: string;
  dptoInterior?: string;
}

export interface DetallePedido {
  idDetalle?: number;
  producto: Zapato;
  tallaSeleccionada: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  idPedido: number;
  fecha: string; // Fecha de compra
  fechaEntrega?: string; // Fecha en la que se entregó (opcional porque puede estar pendiente)
  total: number;
  subtotal?: number;
  costoEnvio?: number;
  estado: string;
  usuario?: Cliente;
  direccion?: Direccion;
  repartidor?: Cliente;
  vendedor?: Cliente;
  tipoPedido?: string;
  detalles: DetallePedido[];
  comprobante?: any; // Añadido para el historial de compras
}

// --- PERFIL Y DIRECCIONES ---
export interface PerfilUpdateRequest {
  nombre: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono?: string;
  emailContacto?: string;
  telefonoSecundario?: string;
  zona?: string;
}

export interface PasswordUpdateRequest {
  passwordActual: string;
  nuevaPassword: string;
}

export interface Direccion {
  idDireccion?: number;
  direccionExacta: string;
  distrito: string;
  referencia?: string;
}

// Modelo heredado (por si el frontend antiguo lo usa en otra vista)
export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  numeroDocumento?: string;
  emailContacto?: string;
  telefonoSecundario?: string;
  zona?: string;
  activo?: boolean;
}
