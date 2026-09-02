/**
 * Solo está aquí por el script: corre antes de que el navegador pinte nada y decide si el
 * atlas se abre con el marco del terminal o sin él. Sin esto, el HTML —que es el mismo para
 * todos y trae el marco— se ve un instante antes de que el bundle llegue y lo pliegue.
 *
 * OJO: 'atlas:sesion' está duplicada con CLAVE_SESION en lib/atlas/almacen.ts. Este script
 * corre antes que el bundle y no puede importar la constante; si cambia, cambia en los dos.
 * El try/catch es por el modo privado, donde localStorage lanza.
 */
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('atlas:sesion')==='1')document.documentElement.dataset.atlasMax='1'}catch(e){}`,
        }}
      />
      {children}
    </>
  );
}
