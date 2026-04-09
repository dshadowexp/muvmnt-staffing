import * as h3 from 'h3-js';

/** Must match frontend `H3Service` resolution. */
const RESOLUTION = 8;

/**
 * All H3 cells within k steps of the origin cell (gridDisk).
 * @see https://h3geo.org/docs/api/traversal#griddiskdistances
 */
export function getCellsInRing(lat: number, lng: number, k: number): string[] {
  const origin = h3.latLngToCell(lat, lng, RESOLUTION);
  return h3.gridDisk(origin, k);
}
