# Quadribarrat Mini

Crea una aplicación web moderna, limpia y responsive enfocada en el baloncesto catalán (estilo FCBQ / Bàsquet Català) para consultar clasificaciones, partidos de la jornada y estadísticas de jugadores.

La app debe tener las siguientes secciones e interacción:

1. FILTRO SUPERIOR (Header):

   - Un selector desplegable para elegir la categoría (por ejemplo: "U11 Mini Masculí 1r Any - Nivell A1 - Grup 02", "Super Copa Masculina", "Sènior Femeni", etc.).

   - Un buscador rápido por nombre de equipo o club.

2. NAVEGACIÓN POR PESTAÑAS:

   - Pestaña "Clasificación":

     Muestra una tabla ordenada con: Posición, Equipo (con un pequeño logo/escudo), Partidos Jugados (J), Ganados (G), Perdidos (P), Puntos a Favor (PF), En Contra (PC) y Puntos Totales (Pts).

   - Pestaña "Partidos de la Semana":

     Selector de Jornada (ej. "< Jornada 12 >").

     Tarjetas de partidos con: Fecha, Hora, Pavelló/Cancha, Estado (Finalizado, En juego, Programado), Escudos y Nombres de los equipos local y visitante, y Resultado (ej. 68 - 62).

3. FICHA DE DETALLE DE PARTIDO (Modal/Pantalla de estadísticas):

   - Al hacer clic en un partido finalizado, se abre el desglose del partido.

   - Muestra el resultado por cuartos (Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8).

   - Un selector/pestanas para alternar entre [Equipo Local] y [Equipo Visitante].

   - Tabla estadística de jugadores del equipo seleccionado con las columnas:

     Dorsal (#), Nombre del Jugador, Puntos Anotados (PTS), Faltas (F), Triples (3P) y Tiros Libres (TL).

   - Destaca al máximo anotador (MVP) de cada equipo con una pequeña medalla o distintivo dorado.

4. DISEÑO Y ESTILO:

   - Apariencia deportiva moderna, interfaz clara (opción de modo oscuro/claro), tablas muy legibles en pantallas de teléfono móvil.

   - Incluye datos de prueba simulados para que la app sea 100% interactiva desde el primer segundo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quadribarrat-mini.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ce6b2e1-3b8e-5229-8537-538b1c1a026f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
