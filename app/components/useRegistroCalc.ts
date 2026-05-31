"use client";

import { useEffect, useRef, useState } from "react";

export type RegistroPage<R> = {
  records: R[];
  total: number;
  page: number;
  totalPages: number;
};

// Flujo de guardado de una partida, compartido por las calculadoras de registro
// (castle-combo, agrícola). Cada página construye su propio payload con buildPayload;
// el render del tablero se queda en cada página (I4).
export function useRegistroCalc({
  endpoint,
  buildPayload,
}: {
  endpoint: string;
  buildPayload: (password: string) => Record<string, unknown>;
}) {
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savePassword, setSavePassword] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [saveAttempts, setSaveAttempts] = useState(0);
  const savePasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSavePrompt) savePasswordRef.current?.focus();
  }, [showSavePrompt]);

  const saveResult = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(savePassword)),
      });
      if (res.ok) {
        setSaved(true);
        setShowSavePrompt(false);
      } else {
        setSaveError(true);
        setSaveAttempts((n) => n + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  const resetSave = () => {
    setDone(false);
    setSaved(false);
    setShowSavePrompt(false);
    setSavePassword("");
    setSaveError(false);
    setSaveAttempts(0);
  };

  return {
    done, setDone,
    saved, saving,
    showSavePrompt, setShowSavePrompt,
    savePassword, setSavePassword,
    saveError, setSaveError,
    saveAttempts,
    savePasswordRef,
    saveResult, resetSave,
  };
}

// Carga + paginación del historial de partidas (RegistroSection). El render
// (colores, tarjetas, tabla de detalle) se queda en cada página; aquí solo los datos (I4).
export function useRegistroHistorial<R>(endpoint: string) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RegistroPage<R> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${endpoint}?page=${page}`);
      const json = await res.json();
      setData(json);
      setExpanded(null);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open && !data) load(1);
    setOpen((v) => !v);
  };

  return { open, data, loading, expanded, setExpanded, load, toggle };
}
