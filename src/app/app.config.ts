import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes'; // <-- Vincula tu nuevo archivo de rutas

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()), // Activa el modo Hash ideal para el laboratorio
    provideHttpClient() // Deja listo el canal para Spring Boot
  ]
};