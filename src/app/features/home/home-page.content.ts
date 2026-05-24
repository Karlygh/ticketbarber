import {
  ModernExperienceFeature,
  ModernExperienceFloatingCard,
  ModernExperienceKpi
} from './components/modern-experience-section.component';

export interface HeroMetric {
  value: string;
  label: string;
}

export interface QuickBenefit {
  title: string;
  description: string;
}

export interface ToolFeature {
  title: string;
  description: string;
}

export interface Testimonial {
  business: string;
  location: string;
  quote: string;
  image: string;
}

export interface StartStep {
  number: string;
  title: string;
  description: string;
}

export interface HomeFaq {
  question: string;
  answer: string;
}

export const HOME_HERO_METRICS: HeroMetric[] = [
  { value: '+2,500', label: 'Clientes confían' },
  { value: '4.9/5', label: 'Valoracion de usuarios' }
];

export const HOME_QUICK_BENEFITS: QuickBenefit[] = [
  { title: 'Menos esperas', description: 'Clientes mas satisfechos' },
  { title: 'Mas organizacion', description: 'Equipo y procesos al dia' },
  { title: 'Mas clientes felices', description: 'Mejores resenas y recomendaciones' },
  { title: 'Mas crecimiento', description: 'Enfocate en lo que importa' }
];

export const HOME_EXPERIENCE_COPY = {
  kicker: 'Experiencia moderna para tus clientes',
  headline: 'Tus clientes saben exactamente',
  subheadline: 'cuando les toca.',
  description:
    'Una experiencia simple, rapida y profesional para organizar turnos, mejorar la espera y transmitir confianza en todo momento.'
} as const;

export const HOME_EXPERIENCE_FEATURES: ModernExperienceFeature[] = [
  { title: 'Sin instalaciones', description: 'Funciona 100% en la nube desde TV, tablet, movil o PC.' },
  { title: 'Clientes autogeneran tickets', description: 'El cliente toma su turno y ve su posicion en tiempo real.' },
  { title: 'MULTI-Barberos', description: 'Todo tu equipo en un solo sistema con colas y tiempos sincronizados.' }
];

export const HOME_EXPERIENCE_FLOATING_CARDS: ModernExperienceFloatingCard[] = [
  { title: 'Ticket activo', value: 'Carlos', detail: 'Corte clasico · 5 min', tone: 'blue', slot: 'left-top' },
  { title: 'En espera', value: '5 clientes', detail: 'Antes de ti', tone: 'blue', slot: 'left-bottom' },
  { title: 'Resumen del dia', value: '23', detail: 'Turnos completados', tone: 'blue', slot: 'right-top' },
  { title: '+12 clientes hoy', value: '8 min', detail: 'Tiempo medio de atencion', tone: 'blue', slot: 'right-mid' },
  { title: 'Turno llamado', value: 'Carlos', detail: 'Puesto 2 · ahora', tone: 'green', slot: 'right-bottom' }
];

export const HOME_EXPERIENCE_KPIS: ModernExperienceKpi[] = [
  { value: '+2,500', label: 'Tickets generados esta semana' },
  { value: '98%', label: 'Clientes satisfechos' },
  { value: '-35%', label: 'Menos tiempo de espera' },
  { value: '4.9 / 5', label: 'Calificacion promedio' }
];

export const HOME_TOOL_FEATURES: ToolFeature[] = [
  { title: 'Gestion de turnos', description: 'Organiza tu dia, evita aglomeraciones y tiempos muertos.' },
  { title: 'Estadisticas y reportes', description: 'Conoce tus horas pico, servicios mas pedidos y rendimiento del equipo.' },
  { title: 'Gestion de clientes', description: 'Historial de visitas, servicios realizados y preferencias.' },
  { title: 'Multi-sucursal', description: 'Administra todas tus sucursales desde un solo lugar.' }
];

export const HOME_TESTIMONIALS: Testimonial[] = [
  {
    business: 'The Classic Cut',
    location: 'Alicante',
    quote:
      'Desde que usamos TicketBarber, nuestros clientes esperan menos y estan mas felices. Nos ayudo a organizarnos y a profesionalizar nuestro servicio.',
    image: '/assets/empresa1.jpg'
  },
  {
    business: 'Barberia Norte',
    location: 'Madrid',
    quote:
      'Ahora el equipo trabaja con mucha mas claridad. La cola se entiende, el cliente confia y el local transmite otro nivel.',
    image: '/assets/empresa2.jpg'
  },
  {
    business: 'Distrito Fade',
    location: 'Oviedo',
    quote:
      'La sensacion de orden se nota desde la entrada. TicketBarber nos ayudo a mejorar operacion y experiencia sin complicar al staff.',
    image: '/assets/empresa3.jpg'
  }
];

export const HOME_START_STEPS: StartStep[] = [
  { number: '1', title: 'Crea tu cuenta', description: 'Registrate en minutos y configura tu barberia.' },
  { number: '2', title: 'Invita a tu equipo', description: 'Agrega a tus barberos y define servicio y horarios.' },
  { number: '3', title: 'Listo!', description: 'Empieza a recibir clientes y optimiza tu dia.' }
];

export const HOME_FAQS: HomeFaq[] = [
  {
    question: '¿Cómo utilizarás TicketBarber?',
    answer:
      'Cada vez que abras tu jornada, entrarás en tu panel de staff y seleccionarás los barberos que estarán activos ese día. Automáticamente, esos barberos aparecerán en la pantalla de la TV junto con la cola de clientes y el estado de los turnos en tiempo real.'
  },
  {
    question: '¿Necesito instalar algo en mi local?',
    answer:
      'Sí, pero muy poca cosa. TicketBarber funciona en la nube, así que no necesitas instalaciones complicadas ni equipos especiales. Solo necesitarías una TV o pantalla donde quieras mostrar la cola de clientes, por ejemplo en la zona de espera, y una tablet, móvil u ordenador para usarlo en recepción y gestionar los tickets, clientes y turnos. Con eso ya podrías empezar a usar TicketBarber desde cualquier dispositivo con conexión a internet.'
  },
  {
    question: '¿Mis clientes necesitan descargar la app?',
    answer:
      'No. Tus clientes no necesitan descargar nada. TicketBarber está pensado para peluquerías, barberías y profesionales autónomos que quieren gestionar la cola de clientes de forma sencilla. Solo tú accedes a la plataforma para vincular tu cuenta con la TV donde quieras mostrar la cola y gestionar los turnos desde recepción.'
  },
  {
    question: '¿Cuánto tardo en configurar TicketBarber para mi peluquería?',
    answer:
      'En unos 5 minutos puedes tener TicketBarber listo para usar. Solo tienes que registrarte, configurar los datos de tu peluquería y tus barberos, y vincular tu teléfono con la TV mediante un código. Después de eso, ya podrás empezar a gestionar la cola de clientes y disfrutar de TicketBarber.'
  }
];
