import type { DBiamPersonenzuordnungResponse } from '@/api-client/generated';
import type { OrganisationsTyp } from '../OrganisationStore';
import type { RollenArt, RollenMerkmal } from '../RolleStore';

export class Zuordnung {
  public constructor(
    public sskId: string,
    public rolleId: string,
    public sskName: string,
    public sskDstNr: string | null,
    public rolle: string,
    public rollenArt: RollenArt,
    public administriertVon: string,
    public typ: OrganisationsTyp | null,
    public editable: boolean,
    public befristung: string | null,
    public merkmale: Array<RollenMerkmal>,
    public admins: Array<string>,
  ) {}

  public static from(zuordnung: Zuordnung): Zuordnung {
    return new Zuordnung(
      zuordnung.sskId,
      zuordnung.rolleId,
      zuordnung.sskName,
      zuordnung.sskDstNr,
      zuordnung.rolle,
      zuordnung.rollenArt,
      zuordnung.administriertVon,
      zuordnung.typ,
      zuordnung.editable,
      zuordnung.befristung,
      zuordnung.merkmale,
      zuordnung.admins,
    );
  }

  public static fromResponse(response: DBiamPersonenzuordnungResponse): Zuordnung {
    return new Zuordnung(
      response.sskId,
      response.rolleId,
      response.sskName,
      response.sskDstNr,
      response.rolle,
      response.rollenArt,
      response.administriertVon,
      response.typ ?? null,
      response.editable,
      response.befristung !== '' ? response.befristung : null,
      response.merkmale,
      response.admins ?? [],
    );
  }
}
