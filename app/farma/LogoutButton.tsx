"use client";

// Botón "Salir": postea al logout (que caduca la cookie) y recarga en el login.
// Cliente con fetch, como LoginForm — un form-POST con redirect 303 no limpiaba
// la cookie de forma fiable.
export default function LogoutButton() {
  async function salir() {
    await fetch("/farma/api/logout", { method: "POST" });
    window.location.assign("/farma");
  }
  return (
    <button
      type="button"
      onClick={salir}
      className="text-sm text-neutral-600 hover:text-neutral-900"
    >
      Salir
    </button>
  );
}
