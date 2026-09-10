import { RollenMerkmal, type DBiamPersonenuebersichtResponse } from '@/api-client/generated';
import { DoFactory } from 'test/DoFactory';
import { PersonenUebersicht } from './PersonenUebersicht';
import { Zuordnung } from './Zuordnung';

describe('PersonenUebersicht', () => {
  describe('fromResponse', () => {
    it('should construct from response', () => {
      const response: DBiamPersonenuebersichtResponse = DoFactory.getDBiamPersonenuebersichtResponse();

      const personenUebersicht: PersonenUebersicht = PersonenUebersicht.fromResponse(response);

      expect(personenUebersicht.personId).toBe(response.personId);
      expect(personenUebersicht.vorname).toBe(response.vorname);
      expect(personenUebersicht.nachname).toBe(response.nachname);
      expect(personenUebersicht.benutzername).toBe(response.benutzername);
      expect(personenUebersicht.lastModifiedZuordnungen).toBe(response.lastModifiedZuordnungen);
      expect(personenUebersicht.zuordnungen).toHaveLength(response.zuordnungen.length);
      expect(personenUebersicht.zuordnungen).toEqual(expect.arrayContaining(response.zuordnungen));
    });
  });

  describe('hasRollenMerkmale', () => {
    it.each([
      [
        'should return true if all merkmale are present',
        [
          DoFactory.getZuordnung({
            merkmale: [RollenMerkmal.BefristungPflicht],
          }),
          DoFactory.getZuordnung({
            merkmale: [RollenMerkmal.KopersPflicht],
          }),
          DoFactory.getZuordnung({
            merkmale: [RollenMerkmal.MptRolle],
          }),
        ],
        true,
      ],
      [
        'should return false if merkmale are not present',
        [
          DoFactory.getZuordnung({
            merkmale: [],
          }),
          DoFactory.getZuordnung({
            merkmale: [],
          }),
        ],
        false,
      ],
    ])('%s', (_label: string, zuordnungen: Array<Zuordnung>, expectedValue: boolean) => {
      const personenUebersicht: PersonenUebersicht = DoFactory.getPersonenUebersicht(undefined, zuordnungen);
      for (const possibleMerkmal of Object.values(RollenMerkmal)) {
        const result: boolean = personenUebersicht.hasRollenMerkmale([possibleMerkmal]);
        expect(result).toBe(expectedValue);
      }
    });
  });
});
