"use client";

export default function LogoutButton({ className }: { className?: string }) {
  async function salir() {
    await fetch("/arbol/api/logout", { method: "POST" });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- la navegación de Next reusa el caché del router; el logout necesita recarga dura para que la cookie caducada surta efecto
    window.location.assign("/arbol");
  }
  return (
    <button
      type="button"
      onClick={salir}
      className={className ?? "text-sm text-neutral-500 hover:text-neutral-900"}
    >
      Salir
    </button>
  );
}
