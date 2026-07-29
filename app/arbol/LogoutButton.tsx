"use client";

export default function LogoutButton({ className }: { className?: string }) {
  async function salir() {
    await fetch("/arbol/api/logout", { method: "POST" });
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
