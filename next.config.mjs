/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * SALIDA `standalone`, para poder empaquetar el sitio en una imagen chica.
   *
   * Sin esto, correr Next en producción exige arrastrar los `node_modules`
   * enteros —cientos de megas de los que el servidor usa una fracción— y la
   * imagen tarda una eternidad en construirse y en subir. Con `standalone`,
   * Next analiza qué necesita de verdad para arrancar y arma una carpeta con
   * eso y nada más, incluido su propio `server.js`.
   *
   * No cambia nada del desarrollo local: `npm run dev` sigue igual.
   */
  output: 'standalone',
};

export default nextConfig;
