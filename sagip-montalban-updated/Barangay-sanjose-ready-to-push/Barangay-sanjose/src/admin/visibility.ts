import type { ManagedHazard, MapDisplaySettings } from './types';

/**
 * The single definition of "what the public map shows".
 * A hazard must be published, its layer must be enabled, and resolved
 * incidents are hidden when the resolved layer is switched off.
 */
export function visibleHazards(data: { hazards: ManagedHazard[]; map: MapDisplaySettings }): ManagedHazard[] {
  return data.hazards.filter(hazard =>
    hazard.visibility === 'published' &&
    data.map.types[hazard.type] !== false &&
    (data.map.showResolved || hazard.status !== 'resolved'),
  );
}
