import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/api.models';

const AUTH_STORAGE_KEY = 'tienda_zapatos_auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly session = signal<AuthResponse | null>(this.readStoredSession());

  readonly usuario = computed(() => this.session());
  readonly estaAutenticado = computed(() => Boolean(this.session()?.token));
  readonly esAdmin = computed(() => this.session()?.rol === 'ADMINISTRADOR');
  readonly esVentas = computed(() => this.session()?.rol === 'VENTAS');
  readonly esRepartidor = computed(() => this.session()?.rol === 'REPARTIDOR');
  readonly esCliente = computed(() => this.session()?.rol === 'CLIENTE');

  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.saveSession(response))
    );
  }

  register(request: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/auth/register`, request, { responseType: 'text' });
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  private saveSession(response: AuthResponse): void {
    this.session.set(response);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response));
  }

  private readStoredSession(): AuthResponse | null {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthResponse;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }
}
