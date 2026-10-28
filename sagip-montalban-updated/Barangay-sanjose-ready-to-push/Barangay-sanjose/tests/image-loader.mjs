// Node cannot import the bundled .jpg/.png assets that Vite handles for the app,
// so unit tests stub every image import with a plain string URL.
const IMAGE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && IMAGE.test(new URL(url).pathname)) {
    return { format: 'module', source: 'export default "test-image.png";', shortCircuit: true };
  }
  return nextLoad(url, context);
}
