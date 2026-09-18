import styles from './FirmaCoftech.module.css';

/**
 * FIRMA DE COFTECH — la barra de cierre del sitio.
 * ============================================================================
 * Réplica exacta del diseño original: la franja oscura partida al medio, el
 * "Coftech" en 1,5 rem con el celeste en "Cof", el separador, "Soluciones
 * digitales" y el año a la derecha.
 *
 * LO QUE CAMBIA ES CÓMO LLEGA, no cómo se ve. El instructivo montaba un
 * `<script type="text/babel">` traído de saboryaroma.com, y eso en un sitio que
 * Next entrega ya renderizado habría costado, en cada visita: Babel standalone
 * (~1,5 MB) para compilar veinte líneas, una petición a otro dominio en el
 * camino crítico, y la fuente pedida a fonts.googleapis.com — tres cosas que
 * pegan justo en la métrica con la que Google posiciona la tienda.
 *
 * LA FUENTE ES LA MISMA, y viaja con el repositorio. El archivo está en
 * `src/assets/fonts`: el subconjunto LATINO de Nunito Sans en una sola fuente
 * variable que cubre del peso 400 al 700, 31 KB servidos desde este mismo
 * dominio. Se descartó `next/font/google` —que es lo idiomático— por una razón
 * de despliegue: baja la fuente EN CADA BUILD, o sea que un deploy pasaría a
 * depender de que fonts.gstatic.com conteste. Un tipo de letra no es motivo
 * para que no salga una versión.
 *
 * SIN HOOKS Y SIN HANDLERS: el hover es CSS. El original lo guardaba en un
 * `useState`, y eso habría obligado a mandar JavaScript al navegador para un
 * efecto que el navegador ya sabe hacer. Así, esto se renderiza en el servidor
 * y viaja dentro del HTML que ya se estaba mandando.
 */
/** Una vez por render del servidor, no una por interacción. */
const ANIO = new Date().getFullYear();

const WHATSAPP = 'https://wa.me/5493704819019?text=Hola,%20me%20contacto%20desde%20su%20aplicaci%C3%B3n.';

export function FirmaCoftech() {
  return (
    <footer className={styles.firma}>
      <div className={styles.inner}>
        <div className={styles.izq}>
          <a
            className={styles.marca}
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Coftech — escribinos por WhatsApp"
          >
            <span className={styles.cof}>Cof</span><span className={styles.tech}>tech</span>
          </a>
          <span className={styles.sep} aria-hidden="true">|</span>
          <p className={styles.lema}>Soluciones digitales</p>
        </div>
        <span className={styles.anio}>© {ANIO}</span>
      </div>
    </footer>
  );
}
