import Link from 'next/link';
import { catalogoConSesion } from '@/lib/catalogoServidor';
import { linkWhatsApp } from '@/lib/format';
import { jsonLdString } from '@/lib/jsonLd';
import { metaPagina, NOMBRE } from '@/lib/seo';
import { Migas } from '@/components/Migas';
import { Locales } from '@/components/Locales';
import styles from './page.module.css';

const TITULO = 'Nosotros y preguntas frecuentes';
/** Los párrafos del texto del ERP (separados por un renglón en blanco). */
const parrafos = (texto = '') => texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export async function generateMetadata() {
  const cat = await catalogoConSesion().catch(() => null);
  return metaPagina(cat?.sitio, { titulo: TITULO, descripcion: parrafos(cat?.sitio.nosotros?.texto)[0]?.slice(0, 160), ruta: '/nosotros' });
}

/**
 * NOSOTROS Y PREGUNTAS FRECUENTES (20/10/2026, pedido del dueño: «que me
 * encuentren cuando buscan en ChatGPT o similares»). Las IA y Google responden
 * con lo que leen escrito: quiénes somos, dónde estamos, en qué horario y las
 * dudas de siempre. Todo sale del ERP (Tienda online › Configuración); las
 * preguntas van además como datos de preguntas y respuestas (FAQPage). Las
 * respuestas están en el HTML aunque se vean plegadas: se leen sin JavaScript.
 */
export default async function NosotrosPage() {
  const cat = await catalogoConSesion().catch(() => null);
  if (!cat) {
    return (
      <div className="container" style={{ paddingBlock: '60px', textAlign: 'center' }}>
        <p>No pudimos conectar con la tienda. Probá de nuevo en un momento.</p>
      </div>
    );
  }
  const { nosotros, locales = [], contacto } = cat.sitio;
  const faq = nosotros?.faq ?? [];

  return (
    <div className={styles.pagina}>
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: jsonLdString({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })),
            }),
          }}
        />
      )}
      <Migas pasos={[{ texto: 'Inicio', href: '/' }, { texto: TITULO }]} />

      <div className={`container ${styles.cuerpo}`}>
        <section>
          <h1 className={styles.titulo}>Sobre {NOMBRE}</h1>
          {parrafos(nosotros?.texto).map((p) => <p key={p} className={styles.texto}>{p}</p>)}
          <div className={styles.acciones}>
            <Link href="/tienda" className={styles.boton}>Ver la tienda</Link>
            <a href={linkWhatsApp(contacto.whatsapp)} target="_blank" rel="noopener noreferrer" className={`${styles.boton} ${styles.whatsapp}`}>Escribinos por WhatsApp</a>
          </div>
        </section>

        {locales.length > 0 && (
          <section>
            <h2 className={styles.subtitulo}>{locales.length > 1 ? 'Nuestros locales' : 'Nuestro local'}</h2>
            <Locales locales={locales} />
          </section>
        )}

        {faq.length > 0 && (
          <section>
            <h2 className={styles.subtitulo}>Preguntas frecuentes</h2>
            <div className={styles.faq}>
              {faq.map((f) => (
                <details key={f.pregunta} className={styles.pregunta}>
                  <summary>{f.pregunta}</summary>
                  <p>{f.respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
