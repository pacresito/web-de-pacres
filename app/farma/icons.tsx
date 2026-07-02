// Iconos de acción compartidos por las tablas editables de /farma (Inventario y
// Descuentos). Mismo estilo: 16×16, trazo currentColor (el color lo pone el botón).

export const PencilIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
  </svg>
);

export const CheckIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 8l4 4 7-7" />
  </svg>
);

export const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l10 10M13 3L3 13" />
  </svg>
);

// Confirmar (dar por bueno un descuento inferido): check dentro de un círculo, para
// distinguirlo del check de Guardar.
export const ConfirmarIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M5.5 8l1.8 1.8L10.5 6.3" />
  </svg>
);
