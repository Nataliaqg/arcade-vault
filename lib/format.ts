// Fecha fija en UTC (dd/mm/yyyy): evita diferencias entre servidor y navegador al hidratar.
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
