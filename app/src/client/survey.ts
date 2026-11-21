// Cuestionario inicial: mismas claves que la app clásica (se guardan en nutriplan_client_onboarding.form
// y, la parte de salud, en nutriplan_client_health_private.info).
export type Field = { key: string; label: string; type: 'text' | 'number' | 'select' | 'textarea'; placeholder?: string; required?: boolean; options?: string[] };
export type Step = { title: string; desc: string; health?: boolean; fields: Field[] };

const f = (key: string, label: string, type: Field['type'], placeholder = '', required = false, options?: string[]): Field => ({ key, label, type, placeholder, required, options });

export const SURVEY: Step[] = [
  {
    title: 'Sobre ti',
    desc: 'Lo básico de tu rutina. Podrás editarlo cuando quieras.',
    fields: [
      f('firstName', 'Nombre', 'text', 'Tu nombre', true),
      f('lastName', 'Apellidos', 'text', 'Tus apellidos', true),
      f('weightKg', 'Peso actual (kg)', 'number', 'Ej. 65'),
      f('age', 'Edad', 'number', 'Ej. 30'),
      f('heightCm', 'Altura (cm)', 'number', 'Ej. 175'),
      f('dailyActivity', 'Actividad diaria', 'select', '', false, [
        'Mayormente sentado/a',
        'Ligera (paseos y tareas cotidianas)',
        'Moderada (me muevo regularmente)',
        'Alta (muy activo/a)',
        'Muy alta (actividad física gran parte del día)',
      ]),
      f('jobTitle', '¿En qué trabajas o qué estudias?', 'text', 'Puesto o estudios'),
      f('workDays', 'Días de trabajo/estudio por semana', 'number', 'Ej. 5'),
      f('workHours', 'Horas al día', 'number', 'Ej. 8'),
    ],
  },
  {
    title: 'Entreno y descanso',
    desc: 'Cuéntanos tu actividad real, no la ideal.',
    fields: [
      f('trainingDays', 'Días que entrenas a la semana', 'number', 'Ej. 4'),
      f('trainingDuration', 'Duración de cada entreno (min)', 'number', 'Ej. 60'),
      f('trainingTypes', '¿Qué entrenas?', 'select', '', false, ['Solo gimnasio', 'Gimnasio y otros deportes', 'Solo otros deportes', 'No entreno actualmente']),
      f('otherSports', 'Otros deportes', 'textarea', 'Ej. pádel, natación…'),
      f('trainingTimes', '¿A qué hora sueles entrenar?', 'text', 'Ej. 18:00–19:30'),
      f('sleepHours', 'Horas de sueño', 'number', 'Por noche'),
    ],
  },
  {
    title: 'Tu alimentación',
    desc: 'Cómo comes normalmente y qué te resultaría fácil mantener.',
    fields: [
      f('usualBreakfast', '¿Qué sueles desayunar?', 'textarea', 'Alimentos y cantidades, si las conoces'),
      f('usualLunch', '¿Qué sueles comer?', 'textarea', 'Tu comida habitual'),
      f('usualDinner', '¿Qué sueles cenar?', 'textarea', 'Tu cena habitual'),
      f('favoriteFoods', 'Comidas favoritas', 'textarea', 'Lo que más te gusta'),
      f('dislikedFoods', 'Lo que no te gusta', 'textarea', 'Alimentos a evitar'),
      f('dietStyle', '¿Dieta variada o simple?', 'select', '', false, ['Variada, con distintas opciones', 'Simple, con comidas repetibles', 'Una mezcla de ambas']),
      f('simpleMealCount', 'Si es simple, ¿cuántas comidas distintas?', 'number', 'Ej. 4'),
      f('cookingTime', 'Minutos para cocinar', 'number', 'Tiempo habitual'),
      f('heaviestMeal', 'Tu comida más abundante', 'select', '', false, ['Desayuno', 'Comida (14:00–15:00)', 'Cena', 'Varía según el día']),
    ],
  },
  {
    title: 'Salud (opcional)',
    desc: 'Se guarda aparte y en privado. Tu coach solo lo verá si lo autorizas.',
    health: true,
    fields: [
      f('allergies', 'Alergias o intolerancias', 'textarea', 'Escribe «Ninguna» si quieres'),
      f('nutritionConditions', 'Enfermedad o condición alimentaria relevante', 'textarea', 'Opcional'),
      f('cardioRespConditions', 'Condición cardiovascular o respiratoria', 'textarea', 'Opcional'),
      f('otherHealth', 'Otra circunstancia de salud', 'textarea', 'Opcional'),
    ],
  },
];
