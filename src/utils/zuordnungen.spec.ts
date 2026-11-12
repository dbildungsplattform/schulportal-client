import { OrganisationsTyp, type Organisation } from '@/stores/OrganisationStore';
import { RollenArt, type TranslatedRolleWithAttrs } from '@/stores/RolleStore';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import { DoFactory } from 'test/DoFactory';
import {
  buildZuordnungenForBefristungChange,
  buildZuordnungenForCreation,
  buildZuordnungenForDeletion,
  buildZuordnungenForKlassenwechsel,
  cloneZuordnungen,
  computeZuordnungenWithKlasse,
  getKlassenZuordnungenToKeep,
  withoutKlassen,
  type ZuordnungChange,
  type ZuordnungWithKlasse,
} from './zuordnungen';

type SchuleWithKlasse = {
  schule: Organisation;
  klasse: Organisation;
  schulZuordnung: Zuordnung;
  klassenZuordnung: Zuordnung;
};

function getSchuleWithKlasse(rolleId: string = 'lern-rolle'): SchuleWithKlasse {
  const schule: Organisation = DoFactory.getSchule();
  const klasse: Organisation = DoFactory.getKlasse(schule);
  const rolleProps: Partial<Zuordnung> = { rolleId, rolle: 'SuS', rollenArt: RollenArt.Lern };
  return {
    schule,
    klasse,
    schulZuordnung: DoFactory.getZuordnung(rolleProps, { organisation: schule }),
    klassenZuordnung: DoFactory.getZuordnung(rolleProps, { organisation: klasse }),
  };
}

describe('zuordnungen', () => {
  describe('withoutKlassen', () => {
    test('it removes Zuordnungen of type Klasse', () => {
      const { schulZuordnung, klassenZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();

      expect(withoutKlassen([schulZuordnung, klassenZuordnung])).toEqual([schulZuordnung]);
    });
  });

  describe('computeZuordnungenWithKlasse', () => {
    test('it returns undefined without personenuebersicht', () => {
      expect(computeZuordnungenWithKlasse(null)).toBeUndefined();
    });

    test('it merges the Klasse into the administrating Zuordnung', () => {
      const { schule, klasse, schulZuordnung, klassenZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();

      const result: ZuordnungWithKlasse[] | undefined = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [schulZuordnung, klassenZuordnung]),
      );

      expect(result).toHaveLength(1);
      expect(result![0]).toMatchObject({ sskId: schule.id, klasse: klasse.name, typ: OrganisationsTyp.Schule });
    });

    test('it ignores Klassen without administrating Zuordnung and keeps other Zuordnungen', () => {
      const { schulZuordnung, klassenZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();
      const otherZuordnung: Zuordnung = DoFactory.getZuordnung({ typ: OrganisationsTyp.Schule });

      const result: ZuordnungWithKlasse[] | undefined = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [klassenZuordnung, otherZuordnung]),
      );

      expect(result).toEqual([otherZuordnung]);
      expect(result).not.toContainEqual(schulZuordnung);
    });

    test('it sorts by Dienststellennummer and puts Zuordnungen without one last', () => {
      const withoutDstNr: Zuordnung = DoFactory.getZuordnung({ typ: OrganisationsTyp.Schule });
      // DoFactory replaces a null sskDstNr with a random kennung, so it has to be cleared afterwards
      withoutDstNr.sskDstNr = null;
      const second: Zuordnung = DoFactory.getZuordnung({ sskDstNr: '2', rolle: 'a', typ: OrganisationsTyp.Schule });
      const first: Zuordnung = DoFactory.getZuordnung({ sskDstNr: '1', rolle: 'b', typ: OrganisationsTyp.Schule });

      const result: ZuordnungWithKlasse[] | undefined = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [withoutDstNr, second, first]),
      );

      expect(result).toEqual([first, second, withoutDstNr]);
    });

    test.each([[true], [false]])(
      'it puts the Zuordnung without Dienststellennummer last (without Dienststellennummer first: %s)',
      (withoutFirst: boolean) => {
        const withoutDstNr: Zuordnung = DoFactory.getZuordnung({ rolle: 'rolle', typ: OrganisationsTyp.Schule });
        withoutDstNr.sskDstNr = null;
        const withDstNr: Zuordnung = DoFactory.getZuordnung({
          rolle: 'rolle',
          sskDstNr: '1',
          typ: OrganisationsTyp.Schule,
        });

        const result: ZuordnungWithKlasse[] | undefined = computeZuordnungenWithKlasse(
          DoFactory.getPersonenUebersicht(
            undefined,
            withoutFirst ? [withoutDstNr, withDstNr] : [withDstNr, withoutDstNr],
          ),
        );

        expect(result).toEqual([withDstNr, withoutDstNr]);
      },
    );
  });

  describe('cloneZuordnungen', () => {
    test('it returns undefined without Zuordnungen', () => {
      expect(cloneZuordnungen(undefined)).toBeUndefined();
    });

    test('it creates an independent deep copy including the Klasse', () => {
      const { schulZuordnung, klassenZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();
      const original: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [schulZuordnung, klassenZuordnung]),
      )!;

      const copy: ZuordnungWithKlasse[] = cloneZuordnungen(original)!;

      expect(copy).toEqual(original);
      expect(copy[0]).not.toBe(original[0]);
      expect(copy[0]!.merkmale).not.toBe(original[0]!.merkmale);
      expect(copy[0]!.admins).not.toBe(original[0]!.admins);
      expect(copy[0]!.klasse).toBe(original[0]!.klasse);
    });
  });

  describe('getKlassenZuordnungenToKeep', () => {
    test.each([['rolle' as const], ['rolleId' as const]])(
      'it returns only the Klassen of the remaining Zuordnungen when matching by %s',
      (rolleKey: 'rolle' | 'rolleId') => {
        const kept: SchuleWithKlasse = getSchuleWithKlasse('kept-rolle');
        const removed: SchuleWithKlasse = getSchuleWithKlasse('removed-rolle');
        const remaining: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
          DoFactory.getPersonenUebersicht(undefined, [kept.schulZuordnung, kept.klassenZuordnung]),
        )!;

        const result: Zuordnung[] = getKlassenZuordnungenToKeep(
          remaining,
          [kept.schulZuordnung, kept.klassenZuordnung, removed.schulZuordnung, removed.klassenZuordnung],
          rolleKey,
        );

        expect(result).toEqual([kept.klassenZuordnung]);
      },
    );
  });

  describe('getKlassenZuordnungenToKeep (edge cases)', () => {
    test('it returns no Klassen for remaining Zuordnungen without Klasse', () => {
      const { schulZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();

      expect(getKlassenZuordnungenToKeep([schulZuordnung], [schulZuordnung], 'rolleId')).toEqual([]);
    });

    test('it collects all Klassen Zuordnungen with the same Schule, Klasse and Rolle', () => {
      const { schulZuordnung, klassenZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();
      const remaining: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [schulZuordnung, klassenZuordnung]),
      )!;

      const result: Zuordnung[] = getKlassenZuordnungenToKeep(
        remaining,
        [klassenZuordnung, klassenZuordnung],
        'rolleId',
      );

      expect(result).toEqual([klassenZuordnung, klassenZuordnung]);
    });
  });

  describe('buildZuordnungenForDeletion', () => {
    test('it keeps the remaining Zuordnungen together with their Klassen', () => {
      const kept: SchuleWithKlasse = getSchuleWithKlasse('kept-rolle');
      const deleted: SchuleWithKlasse = getSchuleWithKlasse('deleted-rolle');
      const existing: Zuordnung[] = [
        kept.schulZuordnung,
        kept.klassenZuordnung,
        deleted.schulZuordnung,
        deleted.klassenZuordnung,
      ];
      const current: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, existing),
      )!;
      const selected: ZuordnungWithKlasse = current.find(
        (zuordnung: ZuordnungWithKlasse) => zuordnung.sskId === deleted.schule.id,
      )!;

      const result: ReturnType<typeof buildZuordnungenForDeletion> = buildZuordnungenForDeletion(current, existing, [
        selected,
      ]);

      expect(result.remainingZuordnungen).toHaveLength(1);
      expect(result.remainingZuordnungen![0]!.sskId).toBe(kept.schule.id);
      expect(result.zuordnungenToBePersisted).toEqual([result.remainingZuordnungen![0], kept.klassenZuordnung]);
    });

    test('it returns undefined without current Zuordnungen', () => {
      expect(buildZuordnungenForDeletion(undefined, undefined, [])).toEqual({
        remainingZuordnungen: undefined,
        zuordnungenToBePersisted: undefined,
      });
    });
  });

  describe('buildZuordnungenForCreation', () => {
    const rolle: TranslatedRolleWithAttrs = { value: 'new-rolle', title: 'SuS', rollenart: RollenArt.Lern };

    test('it adds the new Zuordnung, its Klasse and keeps the existing Klassen', () => {
      const existing: SchuleWithKlasse = getSchuleWithKlasse();
      const current: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [existing.schulZuordnung, existing.klassenZuordnung]),
      )!;
      const schule: Organisation = DoFactory.getSchule();
      const klasse: Organisation = DoFactory.getKlasse(schule);

      const result: ZuordnungChange = buildZuordnungenForCreation({
        currentZuordnungen: current,
        existingZuordnungen: [existing.schulZuordnung, existing.klassenZuordnung],
        organisation: schule,
        klasse,
        rolleId: rolle.value,
        rolle,
        befristung: '2099-07-31T00:00:00.000Z',
      });

      expect(result.newZuordnung).toMatchObject({
        sskId: schule.id,
        rolleId: rolle.value,
        rolle: rolle.title,
        rollenArt: rolle.rollenart,
        typ: OrganisationsTyp.Schule,
        klasse: klasse.name,
        befristung: '2099-07-31T00:00:00.000Z',
      });
      expect(result.zuordnungenToBePersisted).toHaveLength(4);
      expect(result.zuordnungenToBePersisted.slice(0, 2)).toEqual([...current, result.newZuordnung]);
      expect(result.zuordnungenToBePersisted[2]).toMatchObject({
        sskId: klasse.id,
        rolleId: rolle.value,
        typ: OrganisationsTyp.Klasse,
        administriertVon: schule.id,
      });
      expect(result.zuordnungenToBePersisted[3]).toEqual(existing.klassenZuordnung);
    });

    test('it falls back to empty values for a Klasse without kennung and administriertVon', () => {
      const schule: Organisation = DoFactory.getSchule();
      const klasse: Organisation = DoFactory.getKlasse(schule, { kennung: undefined, administriertVon: undefined });

      const result: ZuordnungChange = buildZuordnungenForCreation({
        currentZuordnungen: [],
        existingZuordnungen: undefined,
        organisation: schule,
        klasse,
        rolleId: rolle.value,
        rolle: undefined,
        befristung: null,
      });

      expect(result.zuordnungenToBePersisted[1]).toMatchObject({ rolle: '', sskDstNr: '', administriertVon: '' });
    });

    test('it handles a missing Klasse and Rolle', () => {
      const schule: Organisation = DoFactory.getSchule({ kennung: undefined, administriertVon: undefined });

      const result: ZuordnungChange = buildZuordnungenForCreation({
        currentZuordnungen: [],
        existingZuordnungen: undefined,
        organisation: schule,
        klasse: undefined,
        rolleId: rolle.value,
        rolle: undefined,
        befristung: null,
      });

      expect(result.newZuordnung).toMatchObject({ rolle: '', sskDstNr: '', administriertVon: '', befristung: null });
      expect(result.newZuordnung.klasse).toBeUndefined();
      expect(result.zuordnungenToBePersisted).toEqual([result.newZuordnung]);
    });
  });

  describe('buildZuordnungenForKlassenwechsel', () => {
    test('it replaces the Klasse of the selected Zuordnung and keeps the other Klassen', () => {
      const selectedSchule: SchuleWithKlasse = getSchuleWithKlasse('selected-rolle');
      const otherSchule: SchuleWithKlasse = getSchuleWithKlasse('other-rolle');
      const existing: Zuordnung[] = [
        selectedSchule.schulZuordnung,
        selectedSchule.klassenZuordnung,
        otherSchule.schulZuordnung,
        otherSchule.klassenZuordnung,
      ];
      const current: ZuordnungWithKlasse[] = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, existing),
      )!;
      const selected: ZuordnungWithKlasse = current.find(
        (zuordnung: ZuordnungWithKlasse) => zuordnung.sskId === selectedSchule.schule.id,
      )!;
      const newKlasse: Organisation = DoFactory.getKlasse(selectedSchule.schule);

      const result: ZuordnungChange = buildZuordnungenForKlassenwechsel({
        currentZuordnungen: current,
        existingZuordnungen: existing,
        selectedZuordnungen: [selected],
        schule: selectedSchule.schule,
        newKlasse,
      });

      expect(result.newZuordnung).toMatchObject({
        sskId: selectedSchule.schule.id,
        rolleId: selected.rolleId,
        rolle: selected.rolle,
        rollenArt: selected.rollenArt,
        klasse: newKlasse.name,
      });
      expect(result.zuordnungenToBePersisted).toEqual([
        ...current,
        otherSchule.klassenZuordnung,
        expect.objectContaining({ sskId: newKlasse.id, rolleId: selected.rolleId, typ: OrganisationsTyp.Klasse }),
      ]);
      expect(result.zuordnungenToBePersisted).not.toContainEqual(selectedSchule.klassenZuordnung);
    });

    test('it falls back to empty values for a Schule and Klasse without kennung and administriertVon', () => {
      const schule: Organisation = DoFactory.getSchule({ kennung: undefined, administriertVon: undefined });
      const newKlasse: Organisation = DoFactory.getKlasse(schule, { kennung: undefined, administriertVon: undefined });
      const schulZuordnung: Zuordnung = DoFactory.getZuordnung({}, { organisation: schule });

      const result: ZuordnungChange = buildZuordnungenForKlassenwechsel({
        currentZuordnungen: [schulZuordnung],
        existingZuordnungen: [schulZuordnung],
        selectedZuordnungen: [schulZuordnung],
        schule,
        newKlasse,
      });

      expect(result.newZuordnung).toMatchObject({ sskDstNr: '', administriertVon: '' });
      expect(result.zuordnungenToBePersisted.at(-1)).toMatchObject({ sskDstNr: '', administriertVon: '' });
    });

    test('it does not add a Klasse without new Klasse', () => {
      const { schule, schulZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();

      const result: ZuordnungChange = buildZuordnungenForKlassenwechsel({
        currentZuordnungen: [schulZuordnung],
        existingZuordnungen: [schulZuordnung],
        selectedZuordnungen: [schulZuordnung],
        schule,
        newKlasse: undefined,
      });

      expect(result.newZuordnung.klasse).toBeUndefined();
      expect(result.zuordnungenToBePersisted).toEqual([schulZuordnung]);
    });
  });

  describe('buildZuordnungenForBefristungChange', () => {
    test('it updates the Befristung of the selected Zuordnung and its Klasse only', () => {
      const selectedSchule: SchuleWithKlasse = getSchuleWithKlasse('selected-rolle');
      const otherZuordnung: Zuordnung = DoFactory.getZuordnung();
      const existing: Zuordnung[] = [selectedSchule.schulZuordnung, selectedSchule.klassenZuordnung, otherZuordnung];
      const selected: ZuordnungWithKlasse = computeZuordnungenWithKlasse(
        DoFactory.getPersonenUebersicht(undefined, [selectedSchule.schulZuordnung, selectedSchule.klassenZuordnung]),
      )![0]!;
      const befristung: string = '2099-07-31T00:00:00.000Z';

      const result: ZuordnungChange = buildZuordnungenForBefristungChange(existing, selected, befristung);

      expect(result.newZuordnung).toMatchObject({
        sskId: selected.sskId,
        klasse: selected.klasse,
        befristung,
        editable: true,
      });
      expect(result.zuordnungenToBePersisted).toEqual([
        { ...selectedSchule.schulZuordnung, befristung },
        { ...selectedSchule.klassenZuordnung, befristung },
        otherZuordnung,
      ]);
    });

    test('it returns no Zuordnungen to persist without existing Zuordnungen', () => {
      const { schulZuordnung }: SchuleWithKlasse = getSchuleWithKlasse();

      expect(buildZuordnungenForBefristungChange(undefined, schulZuordnung, null).zuordnungenToBePersisted).toEqual([]);
    });
  });
});
