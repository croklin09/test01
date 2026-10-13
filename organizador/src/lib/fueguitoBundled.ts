// Animaciones incluidas en la app (Calcifer, de "El increíble castillo vagabundo", Studio Ghibli).
// Uso personal: SOLO porque el repo y sus releases son privados. Si el repo vuelve a ser público, hay que borrar
// esta lista y la carpeta assets/fueguito (también de la historia de git), porque es material con derechos de autor.
// Las imágenes quietas (.webp) se ven animadas por el marco que "respira" en components/fueguito.tsx.
export const BUNDLED_ANIMATIONS: { source: number; name: string }[] = [
  { source: require('../../assets/fueguito/calcifer-chimenea.gif'), name: 'Chimenea' },
  { source: require('../../assets/fueguito/calcifer-brasas.gif'), name: 'Brasas' },
  { source: require('../../assets/fueguito/calcifer-troncos.gif'), name: 'Troncos' },
  { source: require('../../assets/fueguito/calcifer-humo.webp'), name: 'Humo' },
  { source: require('../../assets/fueguito/calcifer-mural.webp'), name: 'Mural' },
  { source: require('../../assets/fueguito/calcifer-reja.webp'), name: 'Reja' },
];
