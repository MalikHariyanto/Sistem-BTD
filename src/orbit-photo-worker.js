import { assignOrbitPhotos } from './photo-textures.js';

self.onmessage = ({ data: { orbit, count } }) => {
  const ids = assignOrbitPhotos(orbit, count);
  self.postMessage(ids, [ids.buffer]);
};
