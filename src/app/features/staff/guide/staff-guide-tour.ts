export type StaffGuideView = 'dashboard' | 'barbers';

export type StaffGuidePlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface StaffGuideStep {
  id: string;
  view: StaffGuideView;
  targetId: string | null;
  title: string;
  body: string;
  placement: StaffGuidePlacement;
  allowNextWhenMissing: boolean;
  missingBody?: string;
}

export const STAFF_GUIDE_STEPS: StaffGuideStep[] = [
  {
    id: 'dashboard-sidebar',
    view: 'dashboard',
    targetId: 'staff-sidebar',
    title: 'Este lateral es tu base de control',
    body: 'Desde aqui saltas al **panel**, **barberos**, **agenda**, **pantalla TV**, **dispositivos** y **ajustes** del negocio sin perder tiempo.',
    placement: 'right',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-open-day',
    view: 'dashboard',
    targetId: 'staff-open-day',
    title: 'Abrir jornada',
    body: 'Usa este boton al empezar el dia para seleccionar que barberos trabajan hoy y activar la **jornada visible** para los clientes. Esto activa el acceso a la **gestion de turnos**, pero no te preocupes: puedes abrir la jornada aunque no tengas barberos cargados todavia y editarlos despues.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-close-day',
    view: 'dashboard',
    targetId: 'staff-close-day',
    title: 'Cerrar jornada',
    body: 'Cuando termines el dia, aqui puedes **cerrar la jornada activa**. El sistema **limpia la cola** y **reinicia el estado diario**.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-add-barber',
    view: 'dashboard',
    targetId: 'staff-add-barber',
    title: 'Agregar barbero',
    body: 'Crea **nuevos perfiles** de barberos desde aqui. Despues podras **activarlos en jornada**, **asignarles cola** y editarlos con mas detalle.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-metrics',
    view: 'dashboard',
    targetId: 'staff-metrics',
    title: 'Resumen rapido del dia',
    body: 'Estas tarjetas te muestran **cuantos barberos tienes**, **quienes estan activos**, **cuantos turnos hay en curso** y **cuanta gente sigue esperando**.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-toolbar',
    view: 'dashboard',
    targetId: 'staff-team-toolbar',
    title: 'Gestion del equipo',
    body: 'Este bloque resume si la **jornada esta abierta** y cuantos barberos estan **disponibles hoy**. Tambien te da **acceso rapido** a acciones operativas.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'dashboard-turn-actions',
    view: 'dashboard',
    targetId: 'staff-turn-actions',
    title: 'Mover la cola por barbero',
    body: 'Con **Anterior** y **Siguiente** gestionas el turno actual de cada barbero. Solo funciona cuando la **jornada esta abierta**. Recuerda que cada barbero tiene su **propia cola**: cuando termine un turno, debe pulsar en **Panel de barberos** el boton **Siguiente** para avanzar su cola y atender al siguiente cliente. Si lo que deseas es cancelar un turno, puedes hacerlo desde **Anterior**, que tambien sirve para volver a atender al cliente anterior si fue un error marcar **Siguiente**.',
    placement: 'top',
    allowNextWhenMissing: true,
    missingBody: 'Todavia no hay **barberos creados**, asi que no aparece la **cola individual**. En cuanto tengas al menos uno, aqui podras **avanzar o retroceder turnos**.'
  },
  {
    id: 'dashboard-status-actions',
    view: 'dashboard',
    targetId: 'staff-status-actions',
    title: 'Cambiar estado del barbero',
    body: 'Desde **Estado** puedes marcar a un barbero como **disponible**, **en descanso** u **oculto**, y tambien borrarlo si hace falta. Si tu barbero no esta disponible, los clientes no podran elegirlo al sacar turno, asi que es una buena forma de gestionar **ausencias o dias libres**. Recuerda que el estado de cada barbero se puede editar tambien desde su **perfil** en la pantalla dedicada de barberos.',
    placement: 'left',
    allowNextWhenMissing: true,
    missingBody: 'Este menu aparece dentro de cada **fila de barbero**. Si aun no has creado perfiles, el tutorial sigue y volveras a verlo cuando haya **equipo cargado**.'
  },
  {
    id: 'barbers-overview',
    view: 'barbers',
    targetId: 'barbers-overview',
    title: 'Pantalla dedicada de barberos',
    body: 'Aqui entras cuando quieres centrarte solo en el **equipo**: revisar **perfiles**, corregir **nombres** o mantener la informacion limpia.',
    placement: 'bottom',
    allowNextWhenMissing: false
  },
  {
    id: 'barbers-list',
    view: 'barbers',
    targetId: 'barbers-list',
    title: 'Listado completo',
    body: 'Cada tarjeta representa un barbero y te muestra rapidamente su **nombre**, **foto** y **disponibilidad actual** del dia.',
    placement: 'top',
    allowNextWhenMissing: false
  },
  {
    id: 'barbers-edit',
    view: 'barbers',
    targetId: 'barbers-edit-button',
    title: 'Editar un perfil',
    body: 'Con **Editar** puedes cambiar **nombre** y **foto** del barbero sin tocar la configuracion del resto del equipo.',
    placement: 'left',
    allowNextWhenMissing: true,
    missingBody: 'Aun no hay **barberos** para editar. Cuando crees el primero desde el **panel principal**, este boton aparecera dentro de su tarjeta.'
  },
  {
    id: 'barbers-delete',
    view: 'barbers',
    targetId: 'barbers-delete-button',
    title: 'Eliminar con cuidado',
    body: '**Eliminar** borra definitivamente el perfil y antes cancela sus **tickets pendientes**, por eso conviene usarlo solo cuando sea necesario.',
    placement: 'left',
    allowNextWhenMissing: true,
    missingBody: 'Si no hay **perfiles creados**, no veras el boton de **eliminar**. El tutorial termina aqui igualmente para no bloquearte.'
  }
];
