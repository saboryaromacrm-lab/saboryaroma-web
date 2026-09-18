import styles from './Footer.module.css';

/**
 * FIRMA DE COFTECH — cierre del pie de la tienda.
 * ============================================================================
 * NO se integra como decía el instructivo original (un `<script type="text/babel">`
 * traído de saboryaroma.com y compilado en el navegador). Eso, en un sitio que
 * Next entrega ya renderizado, habría significado traer **Babel standalone**
 * —~1,5 MB cuyo único trabajo sería compilar estas veinte líneas—, una petición
 * a otro dominio en el camino crítico y la familia Nunito Sans entera para
 * escribir una palabra. Tres costos nuevos en la métrica que Google mira para
 * posicionar la tienda, a cambio de nada.
 *
 * Acá va con el resto del sitio: se renderiza en el servidor, viaja dentro del
 * HTML que ya se estaba mandando y usa la tipografía que la página ya cargó.
 *
 * SIN HOOKS Y SIN HANDLERS, a propósito: el hover es CSS. El componente
 * original guardaba el hover en un `useState`, y eso lo habría obligado a ser
 * un componente de cliente — o sea, JavaScript enviado y ejecutado para un
 * efecto que el navegador ya sabe hacer solo.
 */

/** Una vez por render del servidor, no una por interacción. */
const ANIO = new Date().getFullYear();

const WHATSAPP = 'https://wa.me/5493704819019?text=Hola,%20me%20contacto%20desde%20su%20aplicaci%C3%B3n.';

export function FirmaCoftech() {
  return (
    <a
      className={styles.firma}
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      title="Coftech · Soluciones digitales — escribinos por WhatsApp"
    >
      <span className={styles.firmaMarca}>
        <span className={styles.firmaCof}>Cof</span><span className={styles.firmaTech}>tech</span>
      </span>
      <span className={styles.firmaSep} aria-hidden="true">|</span>
      <span className={styles.firmaTexto}>Soluciones digitales · © {ANIO}</span>
    </a>
  );
}
