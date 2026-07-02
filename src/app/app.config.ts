import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // <-- Importamos tus rutas

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes) // <-- ¡Este es el proveedor que Angular estaba pidiendo a gritos!
  ]
};