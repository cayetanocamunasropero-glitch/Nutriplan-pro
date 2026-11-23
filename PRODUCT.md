# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Clientes de Cayetano Camuñas Coach (CYC Fitness Lab):** personas con un plan nutricional personalizado. Usan la app en el móvil varias veces al día: en casa, justo al comer, y también fuera o en el gimnasio, de pie y con prisa. Su tarea: anotar lo que comen (o la opción del plan que han tomado), el agua, los pasos y el peso, y ver cuánto les queda del día.
- **El coach (Cayetano):** revisa a todos sus clientes con calma en el ordenador. Su tarea: ver quién registra y quién no, revisar diarios, importar dietas en PDF, calcular objetivos y enviar accesos por WhatsApp.

## Product Purpose
Cerrar el ciclo entre coach y cliente sin mensajes ni capturas: el cliente registra en segundos y el coach ve la evolución real (kcal, macros, constancia, peso, notas) al momento. Éxito: que el cliente anote todos los días porque es rápido y agradable, y que el coach detecte en un vistazo a quién tiene que escribir.

## Positioning
No es un contador de calorías genérico: el menú lo escribe el coach (opciones A/B/C importadas de su PDF), el cliente registra «lo del plan» con un toque, y el coach ve exactamente lo que pasó cada día. Es una herramienta de acompañamiento personal, no de autoservicio.

## Operating Context
- Cliente: móvil, a menudo con una mano, en cocina, restaurante, gimnasio o calle; también APK Android (WebView) y PWA instalada. Uso diario y repetitivo: añadir alimento, registrar opción del plan, sumar agua.
- Coach: escritorio, sesiones de revisión de varios clientes, PDFs de dieta hechos por él, invitaciones por WhatsApp.

## Capabilities and Constraints
- Funciones: diario por comidas (Desayuno, Media mañana, Comida, Merienda, Cena, Recena), buscador (biblioteca de 215 alimentos + Open Food Facts + escáner de código de barras), recientes/favoritos, repetir ayer, plan con opciones intercambiables, agua, pasos y entrenamientos, nota diaria, peso, fotos, cuestionario inicial, privacidad RGPD y descarga de datos. Coach: panel de clientes con alertas, resumen, diario, importación de PDF, ficha con Harris-Benedict, acceso por código.
- Datos compartidos con la versión clásica en Supabase: los formatos no pueden cambiar.
- Idioma: español. Debe funcionar dentro de la APK (file://, document.write) y en GitHub Pages / Vercel.

## Brand Commitments
- Nombre: NutriPlan · Cayetano Camuñas Coach · CYC Fitness Lab.
- El usuario autorizó un cambio de look total: colores, tipografías y estilo pueden cambiar; solo se mantienen las funciones.

## Evidence on Hand
- Datos reales de clientes solo en Supabase; nunca se muestran ni se publican. Las capturas y demos usan datos sintéticos.
- No hay testimonios, fotos de marca ni ilustraciones propias.

## Product Principles
1. Registrar tiene que ser más rápido que no hacerlo.
2. El plan del coach es el protagonista, no la base de datos de alimentos.
3. Información clara sin culpa: mostrar lo que queda, no regañar.
4. Que no parezca una app de calorías genérica de la tienda.
5. El coach ve en segundos a quién tiene que escribir.

## Accessibility & Inclusion
WCAG AA en contraste y tamaños; respeta «reducir movimiento»; uso con una mano y con luz fuerte en exterior.
