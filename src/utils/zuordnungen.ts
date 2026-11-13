import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import type { RollenArt, TranslatedRolleWithAttrs } from '@/stores/RolleStore';
import { Zuordnung } from '@/stores/types/Zuordnung';
import type { Ref } from 'vue';

export type ZuordnungWithKlasse = Zuordnung & {
  klasse?: string;
};

// The Zuordnungen state of the edit flow that is shared between the different kinds of changes
export type ZuordnungenWorkingState = {
  selectedZuordnungen: Ref<ZuordnungWithKlasse[]>;
  zuordnungenWithPendingChanges: Ref<ZuordnungWithKlasse[] | undefined>;
  newZuordnung: Ref<ZuordnungWithKlasse | undefined>;
  zuordnungenToBePersisted: Ref<Zuordnung[]>;
};

export type PersonWithZuordnungenSource = {
  zuordnungen: Zuordnung[];
};

export type ZuordnungChange = {
  // Used to display the pending change in the template
  newZuordnung: ZuordnungWithKlasse;
  zuordnungenToBePersisted: Zuordnung[];
};

function isKlasse(zuordnung: Zuordnung): boolean {
  return zuordnung.typ === OrganisationsTyp.Klasse;
}

export function withoutKlassen<T extends Zuordnung>(zuordnungen: T[]): T[] {
  return zuordnungen.filter((zuordnung: T) => !isKlasse(zuordnung));
}

// Deep copy that is safe for reactive (proxied) Zuordnungen, which structuredClone cannot handle
export function cloneZuordnungen(zuordnungen: ZuordnungWithKlasse[] | undefined): ZuordnungWithKlasse[] | undefined {
  return zuordnungen?.map((zuordnung: ZuordnungWithKlasse) => {
    const copy: ZuordnungWithKlasse = Zuordnung.from(zuordnung);
    copy.merkmale = [...zuordnung.merkmale];
    copy.admins = [...zuordnung.admins];
    copy.klasse = zuordnung.klasse;
    return copy;
  });
}

// Merges every Klasse into its administrating Zuordnung (same Rolle) and sorts the result
export function computeZuordnungenWithKlasse(
  personenuebersicht: PersonWithZuordnungenSource | null,
): ZuordnungWithKlasse[] | undefined {
  const zuordnungen: Zuordnung[] | undefined = personenuebersicht?.zuordnungen;

  if (!zuordnungen) {
    return;
  }

  const result: ZuordnungWithKlasse[] = [];

  for (const klasse of zuordnungen.filter(isKlasse)) {
    // The Rolle in the Klasse is the same as the Rolle in the parent (Schule)
    const administrierendeZuordnung: Zuordnung | undefined = zuordnungen.find(
      (z: Zuordnung) => z.sskId === klasse.administriertVon && z.rolleId === klasse.rolleId && !isKlasse(z),
    );
    if (administrierendeZuordnung) {
      const newZuordnungWithKlasse: ZuordnungWithKlasse = Zuordnung.from(administrierendeZuordnung);
      newZuordnungWithKlasse.klasse = klasse.sskName;
      result.push(newZuordnungWithKlasse);
    }
  }

  for (const zuordnung of withoutKlassen(zuordnungen)) {
    // Only add Zuordnungen that don't have the same sskId and rolleId to avoid redundancy in the final result
    if (!result.some((z: Zuordnung) => z.sskId === zuordnung.sskId && z.rolleId === zuordnung.rolleId)) {
      result.push(zuordnung);
    }
  }

  // Sort by klasse, rolle and SSK
  result.sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) =>
    a.klasse && b.klasse ? a.klasse.localeCompare(b.klasse) : 0,
  );
  result.sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) => a.rolle.localeCompare(b.rolle));
  result.sort((a: ZuordnungWithKlasse, b: ZuordnungWithKlasse) => {
    if (a.sskDstNr == null) {
      return 1;
    }
    if (b.sskDstNr == null) {
      return -1;
    }
    return a.sskDstNr.localeCompare(b.sskDstNr);
  });
  return result;
}

// Returns the Klassen Zuordnungen that belong to one of the remaining (merged) Zuordnungen
export function getKlassenZuordnungenToKeep(
  remainingZuordnungen: ZuordnungWithKlasse[] | undefined,
  existingZuordnungen: Zuordnung[] | undefined,
  rolleKey: 'rolle' | 'rolleId',
): Zuordnung[] {
  const schuleToKlasseMap: Map<string, Zuordnung[]> = new Map<string, Zuordnung[]>();

  existingZuordnungen?.filter(isKlasse).forEach((klasseZuordnung: Zuordnung) => {
    const key: string = klasseZuordnung.administriertVon + klasseZuordnung.sskName + klasseZuordnung[rolleKey];
    if (!schuleToKlasseMap.has(key)) {
      schuleToKlasseMap.set(key, []);
    }
    schuleToKlasseMap.get(key)?.push(klasseZuordnung);
  });

  const klassenToKeep: Zuordnung[] = [];
  remainingZuordnungen?.forEach((zuordnung: ZuordnungWithKlasse) => {
    klassenToKeep.push(...(schuleToKlasseMap.get(zuordnung.sskId + zuordnung.klasse + zuordnung[rolleKey]) ?? []));
  });
  return klassenToKeep;
}

export function buildZuordnungenForDeletion(
  currentZuordnungen: ZuordnungWithKlasse[] | undefined,
  existingZuordnungen: Zuordnung[] | undefined,
  selectedZuordnungen: ZuordnungWithKlasse[],
): { remainingZuordnungen: ZuordnungWithKlasse[] | undefined; zuordnungenToBePersisted: Zuordnung[] | undefined } {
  const remainingZuordnungen: ZuordnungWithKlasse[] | undefined = currentZuordnungen?.filter(
    (zuordnung: ZuordnungWithKlasse) => !selectedZuordnungen.includes(zuordnung),
  );
  const klassenToKeep: Zuordnung[] = getKlassenZuordnungenToKeep(remainingZuordnungen, existingZuordnungen, 'rolle');
  return {
    remainingZuordnungen,
    zuordnungenToBePersisted: remainingZuordnungen?.concat(klassenToKeep),
  };
}

export type ZuordnungCreationParams = {
  currentZuordnungen: ZuordnungWithKlasse[];
  existingZuordnungen: Zuordnung[] | undefined;
  organisation: Organisation;
  klasse: Organisation | undefined;
  rolleId: string;
  rolle: Pick<TranslatedRolleWithAttrs, 'title' | 'rollenart'> | undefined;
  befristung: string | null;
};

export function buildZuordnungenForCreation({
  currentZuordnungen,
  existingZuordnungen,
  organisation,
  klasse,
  rolleId,
  rolle,
  befristung,
}: ZuordnungCreationParams): ZuordnungChange {
  const newZuordnung: ZuordnungWithKlasse = new Zuordnung(
    organisation.id,
    rolleId,
    organisation.name,
    organisation.kennung ?? '',
    rolle?.title || '',
    rolle?.rollenart as RollenArt,
    organisation.administriertVon ?? '',
    OrganisationsTyp.Schule,
    true,
    befristung,
    [],
    [],
  );
  const zuordnungenToBePersisted: Zuordnung[] = [...currentZuordnungen, newZuordnung];

  if (klasse) {
    newZuordnung.klasse = klasse.name;
    zuordnungenToBePersisted.push(
      new Zuordnung(
        klasse.id,
        rolleId,
        klasse.name,
        klasse.kennung ?? '',
        rolle?.title || '',
        rolle?.rollenart as RollenArt,
        klasse.administriertVon ?? '',
        OrganisationsTyp.Klasse,
        true,
        befristung,
        [],
        [],
      ),
    );
  }

  // Keep all existing Klassenzuordnungen
  existingZuordnungen?.filter(isKlasse).forEach((existingKlasse: Zuordnung) => {
    zuordnungenToBePersisted.push(Zuordnung.from(existingKlasse));
  });

  return { newZuordnung, zuordnungenToBePersisted };
}

export type KlassenwechselParams = {
  currentZuordnungen: ZuordnungWithKlasse[];
  existingZuordnungen: Zuordnung[] | undefined;
  selectedZuordnungen: ZuordnungWithKlasse[];
  schule: Organisation;
  newKlasse: Organisation | undefined;
};

export function buildZuordnungenForKlassenwechsel({
  currentZuordnungen,
  existingZuordnungen,
  selectedZuordnungen,
  schule,
  newKlasse,
}: KlassenwechselParams): ZuordnungChange {
  const selectedZuordnung: ZuordnungWithKlasse = selectedZuordnungen[0]!;
  const remainingZuordnungen: ZuordnungWithKlasse[] = currentZuordnungen.filter(
    (zuordnung: ZuordnungWithKlasse) => !selectedZuordnungen.includes(zuordnung),
  );

  // The Zuordnung to the Schule already exists, it is only built to display the pending change
  const newZuordnung: ZuordnungWithKlasse = new Zuordnung(
    schule.id,
    selectedZuordnung.rolleId,
    schule.name,
    schule.kennung ?? '',
    selectedZuordnung.rolle,
    selectedZuordnung.rollenArt,
    schule.administriertVon ?? '',
    OrganisationsTyp.Schule,
    true,
    null,
    [],
    [],
  );

  const zuordnungenToBePersisted: Zuordnung[] = [
    ...currentZuordnungen,
    ...getKlassenZuordnungenToKeep(remainingZuordnungen, existingZuordnungen, 'rolleId'),
  ];

  if (newKlasse) {
    newZuordnung.klasse = newKlasse.name;
    zuordnungenToBePersisted.push(
      new Zuordnung(
        newKlasse.id,
        selectedZuordnung.rolleId,
        newKlasse.name,
        newKlasse.kennung ?? '',
        selectedZuordnung.rolle,
        selectedZuordnung.rollenArt,
        newKlasse.administriertVon ?? '',
        OrganisationsTyp.Klasse,
        true,
        null,
        [],
        [],
      ),
    );
  }

  return { newZuordnung, zuordnungenToBePersisted };
}

// Updates the Befristung of the selected Zuordnung and of its Klassen
export function buildZuordnungenForBefristungChange(
  existingZuordnungen: Zuordnung[] | undefined,
  selectedZuordnung: ZuordnungWithKlasse,
  befristung: string | null,
): ZuordnungChange {
  const newZuordnung: ZuordnungWithKlasse = Zuordnung.from(selectedZuordnung);
  newZuordnung.klasse = selectedZuordnung.klasse;
  newZuordnung.befristung = befristung;
  newZuordnung.editable = true;

  const zuordnungenToBePersisted: Zuordnung[] = (existingZuordnungen ?? []).map((zuordnung: Zuordnung) => {
    const isSelectedOrgaOrChildKlasse: boolean =
      zuordnung.sskId === selectedZuordnung.sskId ||
      (isKlasse(zuordnung) && zuordnung.administriertVon === selectedZuordnung.sskId);
    if (isSelectedOrgaOrChildKlasse && zuordnung.rolleId === selectedZuordnung.rolleId) {
      const updatedZuordnung: Zuordnung = Zuordnung.from(zuordnung);
      updatedZuordnung.befristung = befristung;
      return updatedZuordnung;
    }
    return zuordnung;
  });

  return { newZuordnung, zuordnungenToBePersisted };
}
