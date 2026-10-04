"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="av-hall fade-in">
      <div className="hall-empty" role="alert">
        <div className="pixel">NO SE PUDO CARGAR EL VAULT</div>
        <p>No hay conexión con la base de datos. Inténtalo de nuevo en unos segundos.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => retry()}>
            REINTENTAR
          </button>
          <Link href="/" className="btn ghost">
            VOLVER AL INICIO
          </Link>
        </div>
      </div>
    </div>
  );
}
