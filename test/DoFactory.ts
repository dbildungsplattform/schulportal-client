import {
  type DBiamPersonenkontextResponse,
  type DBiamPersonenuebersichtResponse,
  type DBiamPersonenzuordnungResponse,
  type DBiamPersonResponse,
  EmailAddressStatus,
  type ManageableServiceProviderListEntryResponse,
  type ManageableServiceProviderSimpleListEntryResponse,
  type OrganisationResponse,
  type OrganisationResponseLegacy,
  OrganisationsTyp,
  type PersonendatensatzResponse,
  type PersonenkontexteUpdateResponse,
  type PersonenkontextRolleFieldsResponse,
  type PersonInfoResponse,
  type PersonLandesbediensteterSearchPersonenkontextResponse,
  type PersonLandesbediensteterSearchResponse,
  type PersonResponse,
  type ProviderControllerFindRollenerweiterungenByServiceProviderId200Response,
  RollenArt,
  type RollenerweiterungWithExtendedDataResponse,
  RollenSystemRechtEnum,
  type RollenSystemRechtServiceProviderIDResponse,
  ServiceProviderKategorie,
  type ServiceProviderResponse,
  ServiceProviderTarget,
  TraegerschaftTyp,
  type UserinfoResponse,
} from '@/api-client/generated';
import { PersonenkontextWorkflowResponse, ServiceProviderMerkmal } from '@/api-client/generated/api';
import type { Organisation } from '@/stores/OrganisationStore';
import { type Personendatensatz } from '@/stores/PersonStore';
import type { Rolle, RolleResponse, RolleWithServiceProvidersResponse } from '@/stores/RolleStore';
import {
  type ManageableServiceProviderDetail,
  type RollenErweiterungenUebersicht,
  type RollenerweiterungMap,
  type StartPageServiceProvider,
} from '@/stores/ServiceProviderStore';
import type { Person } from '@/stores/types/Person';
import { PersonenUebersicht } from '@/stores/types/PersonenUebersicht';
import { PersonWithZuordnungen } from '@/stores/types/PersonWithZuordnungen';
import { Zuordnung } from '@/stores/types/Zuordnung';
import { PersonLockOccasion, type UserLock } from '@/utils/lock';

import { faker } from '@faker-js/faker';

export class DoFactory {
  private static getFakeSchuleName(): string {
    return `${faker.person.firstName()}-${faker.person.lastName()}-Schule`;
  }

  public static getPersonWithZuordnung(
    person?: Partial<Person>,
    zuordnungen?: Array<Zuordnung>,
  ): PersonWithZuordnungen {
    return new PersonWithZuordnungen(this.getPerson(person), zuordnungen ?? [this.getZuordnung()]);
  }

  public static getPerson(props?: Partial<Person>): Person {
    return {
      id: faker.string.uuid(),
      name: {
        vorname: faker.person.firstName(),
        familienname: faker.person.lastName(),
      },
      username: faker.internet.username(),
      revision: faker.string.numeric(2),
      personalnummer: faker.string.numeric(7),
      isLocked: false,
      userLock: [],
      lastModified: new Date().toISOString(),
      email: {
        status: EmailAddressStatus.Enabled,
        address: faker.internet.email(),
      },
      ...props,
    };
  }

  public static getZuordnung(props?: Partial<Zuordnung>, nested?: { organisation: Partial<Organisation> }): Zuordnung {
    const schule: Organisation = DoFactory.getSchule(nested?.organisation);

    return new Zuordnung(
      props?.sskId ?? schule.id,
      props?.rolleId ?? faker.string.uuid(),
      props?.sskName ?? schule.name,
      props?.sskDstNr ?? schule.kennung!,
      props?.rolle ?? faker.string.alpha(5),
      props?.rollenArt ?? faker.helpers.arrayElement<RollenArt>([RollenArt.Lern, RollenArt.Lehr]),
      props?.administriertVon ?? schule.administriertVon!,
      props?.typ ?? schule.typ,
      props?.editable ?? true,
      props?.befristung ?? faker.date.soon().toISOString(),
      props?.merkmale ?? [],
      props?.admins ?? [faker.person.fullName()],
    );
  }

  public static getPersonenUebersicht(
    person: Person = DoFactory.getPerson(),
    zuordnungen: Array<Zuordnung> = [DoFactory.getZuordnung()],
  ): PersonenUebersicht {
    return new PersonenUebersicht(
      person.id,
      person.name.vorname,
      person.name.familienname,
      person.username,
      faker.date.recent().toISOString(),
      zuordnungen,
    );
  }

  public static getPersonResponse(props?: Partial<PersonResponse>): PersonResponse {
    const person: Person = DoFactory.getPerson();
    return {
      ...person,
      mandant: faker.string.uuid(),
      stammorganisation: faker.string.uuid(),
      startpasswort: faker.string.alpha(10),
      ...props,
    };
  }

  public static getPersonendatensatzResponse(props?: Partial<PersonResponse>): PersonendatensatzResponse {
    return {
      person: this.getPersonResponse(props),
    };
  }

  public static getDBiamPersonResponse(props?: Partial<DBiamPersonResponse>): DBiamPersonResponse {
    const person: PersonResponse = this.getPersonResponse(props?.person);
    const dBiamPersonenkontextResponses: DBiamPersonenkontextResponse[] = props?.dBiamPersonenkontextResponses
      ? props.dBiamPersonenkontextResponses.map((kontext: DBiamPersonenkontextResponse) => ({
          ...kontext,
          personId: kontext.personId ?? person.id,
        }))
      : [this.getDBiamPersonenkontextResponse({ personId: person.id })];

    return {
      ...props,
      person,
      dBiamPersonenkontextResponses,
    };
  }

  public static getOrganisation(props?: Partial<Organisation>): Organisation {
    const organisationsTypen: Array<OrganisationsTyp> = [
      OrganisationsTyp.Schule,
      OrganisationsTyp.Klasse,
      OrganisationsTyp.Anbieter,
      OrganisationsTyp.Land,
      OrganisationsTyp.Traeger,
    ];
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      kennung: faker.string.numeric(7),
      typ: faker.helpers.arrayElement<OrganisationsTyp>(organisationsTypen),
      administriertVon: faker.string.uuid(),
      ...props,
    };
  }

  public static getSchule(props?: Partial<Organisation>): Organisation {
    return {
      id: faker.string.uuid(),
      name: DoFactory.getFakeSchuleName(),
      kennung: faker.string.numeric(7),
      typ: OrganisationsTyp.Schule,
      administriertVon: faker.string.uuid(),
      ...props,
    };
  }

  public static getKlasse(parentSchule?: Organisation, props?: Partial<Organisation>): Organisation {
    const name: string = props?.name ?? `${faker.string.numeric(2)}${faker.string.alpha(1)}`;
    return {
      id: faker.string.uuid(),
      name,
      kennung: `${parentSchule?.kennung ?? faker.string.numeric(7)}-${name}`,
      namensergaenzung: 'Klasse',
      kuerzel: faker.string.alpha(4),
      typ: OrganisationsTyp.Klasse,
      administriertVon: parentSchule?.id ?? faker.string.uuid(),
      ...props,
    };
  }

  public static getOrganisationenResponseLegacy(
    props?: Partial<OrganisationResponseLegacy>,
  ): OrganisationResponseLegacy {
    return {
      ...DoFactory.getSchule(),
      administriertVon: faker.string.uuid(),
      kennung: faker.string.numeric(7),
      kuerzel: 'Schulkürzel',
      namensergaenzung: null,
      ...props,
    };
  }

  public static getOrganisationResponse(props?: Partial<OrganisationResponse>): OrganisationResponse {
    return {
      ...DoFactory.getSchule(),
      // eslint-disable-next-line no-underscore-dangle
      traegerschaft: TraegerschaftTyp._01,
      administriertVon: faker.string.uuid(),
      zugehoerigZu: faker.string.uuid(),
      kennung: faker.string.numeric(7),
      kuerzel: 'Schulkürzel',
      itslearningEnabled: true,
      namensergaenzung: null,
      version: 1,
      ...props,
    };
  }

  public static getUserinfoResponse(props?: Partial<UserinfoResponse>): UserinfoResponse {
    const firstName: string = faker.person.firstName();
    const lastName: string = faker.person.lastName();
    return {
      personId: faker.string.uuid(),
      email: faker.internet.email({ firstName, lastName }),
      email_verified: true,
      family_name: lastName,
      given_name: firstName,
      middle_name: faker.person.middleName(),
      profile: null,
      picture: null,
      phone_number: faker.phone.number(),
      website: faker.internet.url(),
      zoneinfo: null,
      locale: faker.location.countryCode(),
      updated_at: faker.date.past().toISOString(),
      password_updated_at: faker.date.past().toISOString(),
      acr: 'gold',
      timeLimits: [],
      name: faker.person.fullName({ firstName, lastName }),
      preferred_username: faker.internet.displayName({ firstName, lastName }),
      sub: faker.string.uuid(),
      personenkontexte: [
        {
          organisation: this.getOrganisationResponse(),
          rolle: {
            systemrechte: ['ROLLEN_VERWALTEN', 'SCHULEN_VERWALTEN', 'IMPORT_DURCHFUEHREN', 'PERSON_SYNCHRONISIEREN'],
            serviceProviderIds: ['789897798'],
          },
        },
      ],
      ...props,
    };
  }

  public static getPersonenkontextUpdateResponse(
    props?: Partial<PersonenkontexteUpdateResponse>,
  ): PersonenkontexteUpdateResponse {
    const person: Person = DoFactory.getPerson();
    return {
      dBiamPersonenkontextResponses: [
        DoFactory.getDBiamPersonenkontextResponse({ personId: person.id }),
        DoFactory.getDBiamPersonenkontextResponse({ personId: person.id }),
      ],
      ...props,
    };
  }

  public static getDBiamPersonenkontextResponse(
    props?: Partial<DBiamPersonenkontextResponse>,
  ): DBiamPersonenkontextResponse {
    return {
      personId: faker.string.uuid(),
      organisationId: faker.string.uuid(),
      rolleId: faker.string.uuid(),
      befristung: faker.date.soon().toISOString(),
      ...props,
    };
  }

  public static getPersonenkontextRolleFieldsResponse(
    props?: Partial<PersonenkontextRolleFieldsResponse>,
  ): PersonenkontextRolleFieldsResponse {
    return {
      organisation: this.getOrganisationResponse(),
      rolle: this.getRollenSystemRechtServiceProviderIDResponse(),
      ...props,
    };
  }

  public static getRollenSystemRechtServiceProviderIDResponse(
    props?: Partial<RollenSystemRechtServiceProviderIDResponse>,
  ): RollenSystemRechtServiceProviderIDResponse {
    return {
      systemrechte: [
        RollenSystemRechtEnum.RollenVerwalten,
        RollenSystemRechtEnum.SchulenVerwalten,
        RollenSystemRechtEnum.ImportDurchfuehren,
        RollenSystemRechtEnum.PersonSynchronisieren,
      ],
      serviceProviderIds: [faker.string.uuid()],
      ...props,
    };
  }

  public static getRolleWithServiceProviders(
    props?: Partial<RolleWithServiceProvidersResponse>,
  ): RolleWithServiceProvidersResponse {
    return {
      id: faker.string.uuid(),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.past().toISOString(),
      name: faker.string.alpha(4),
      administeredBySchulstrukturknoten: faker.string.uuid(),
      administeredBySchulstrukturknotenName: faker.string.alpha(4),
      administeredBySchulstrukturknotenKennung: faker.string.alpha(4),
      rollenart: RollenArt.Lehr,
      merkmale: [],
      systemrechte: [],
      version: 1,
      serviceProviders: [],
      ...props,
    };
  }

  public static getRolle(props?: Partial<Rolle>): Rolle {
    return {
      administeredBySchulstrukturknoten: faker.string.uuid(),
      id: faker.string.uuid(),
      name: faker.string.alpha(4),
      merkmale: [],
      rollenart: RollenArt.Lehr,
      systemrechte: new Set<RollenSystemRechtEnum>(),
      version: 1,
      ...props,
    };
  }

  public static getRolleResponse(props?: Partial<RolleResponse>): RolleResponse {
    return {
      ...this.getRolle(),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      merkmale: [],
      systemrechte: [],
      administeredBySchulstrukturknotenName: this.getFakeSchuleName(),
      administeredBySchulstrukturknotenKennung: faker.string.numeric(7),
      ...props,
    };
  }

  public static getPersonenkontextWorkflowResponse(
    props?: Partial<PersonenkontextWorkflowResponse>,
  ): PersonenkontextWorkflowResponse {
    const organisation: OrganisationResponseLegacy = this.getOrganisationenResponseLegacy();
    return {
      organisations: [organisation],
      rollen: [
        this.getRolleResponse({
          administeredBySchulstrukturknoten: organisation.id,
          administeredBySchulstrukturknotenName: organisation.name,
          administeredBySchulstrukturknotenKennung: organisation.kennung,
        }),
      ],
      selectedOrganisation: null,
      selectedRollen: null,
      canCommit: false,
      ...props,
    };
  }

  public static getDBiamPersonenuebersichtResponse(
    props?: Partial<DBiamPersonenuebersichtResponse>,
    nested?: Partial<{ organisation: Organisation }>,
  ): DBiamPersonenuebersichtResponse {
    const zuordnung: DBiamPersonenzuordnungResponse | undefined = nested?.organisation
      ? DoFactory.getDBiamPersonenzuordnungResponse({}, { organisation: nested.organisation })
      : undefined;
    return {
      personId: faker.string.uuid(),
      vorname: faker.person.firstName(),
      nachname: faker.person.lastName(),
      benutzername: faker.internet.username(),
      lastModifiedZuordnungen: faker.date.recent().toISOString(),
      zuordnungen: zuordnung ? [zuordnung] : [],
      ...props,
    };
  }

  public static getDBiamPersonenzuordnungResponse(
    props?: Partial<DBiamPersonenzuordnungResponse>,
    nested?: Partial<{ organisation: Organisation }>,
  ): DBiamPersonenzuordnungResponse {
    return {
      sskId: nested?.organisation?.id ?? faker.string.uuid(),
      sskName: nested?.organisation?.name ?? DoFactory.getFakeSchuleName(),
      sskDstNr: nested?.organisation?.kennung ?? faker.string.numeric(7),
      rolleId: faker.string.uuid(),
      rolle: faker.string.alpha(4),
      rollenArt: RollenArt.Lehr,
      befristung: faker.date.future().toISOString(),
      administriertVon: faker.string.uuid(),
      editable: true,
      merkmale: [],
      admins: [faker.person.fullName()],
      typ: nested?.organisation?.typ ?? OrganisationsTyp.Schule,
      ...props,
    };
  }

  public static getUserLockEntry(props?: Partial<UserLock>): UserLock {
    return {
      personId: faker.string.uuid(),
      locked_by: faker.string.uuid(),
      created_at: faker.date.recent().toISOString(),
      locked_until: faker.date.future().toISOString(),
      lock_occasion: PersonLockOccasion.MANUELL_GESPERRT,
      ...props,
    };
  }

  public static getPersonendatensatz(props?: Partial<Personendatensatz>): Personendatensatz {
    return {
      person: this.getPerson(),
      ...props,
    };
  }

  public static getPersonLandesbediensteterSearchResponse(
    props?: Partial<PersonLandesbediensteterSearchResponse>,
  ): PersonLandesbediensteterSearchResponse {
    const person: Person = DoFactory.getPerson();
    const schule: Organisation = DoFactory.getSchule();
    const rolle: Rolle = DoFactory.getRolle({ rollenart: RollenArt.Lehr });
    return {
      id: person.id,
      vorname: person.name.vorname,
      familienname: person.name.familienname,
      username: person.username,
      personalnummer: person.personalnummer!,
      primaryEmailAddress: person.email!.address,
      personenkontexte: [DoFactory.getPersonLandesbediensteterSearchPersonenkontextResponse(rolle, schule)],
      ...props,
    };
  }

  public static getPersonLandesbediensteterSearchPersonenkontextResponse(
    rolle: Rolle,
    organisation: Organisation,
  ): PersonLandesbediensteterSearchPersonenkontextResponse {
    return {
      rolleId: rolle.id,
      rolleName: rolle.name,
      organisationId: organisation.id,
      organisationName: organisation.name,
      organisationDstNr: organisation.kennung ?? '',
    };
  }

  public static getServiceProviderResponse(props?: Partial<ServiceProviderResponse>): ServiceProviderResponse {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      target: faker.helpers.enumValue(ServiceProviderTarget),
      url: faker.internet.url(),
      kategorie: faker.helpers.enumValue(ServiceProviderKategorie),
      hasLogo: true,
      logoId: 1,
      requires2fa: false,
      merkmale: [],
      rollenartenWhitelist: [],
      ...props,
    };
  }

  public static getManageableServiceProviderSimpleListEntryResponse(
    props?: Partial<ManageableServiceProviderSimpleListEntryResponse>,
  ): ManageableServiceProviderSimpleListEntryResponse {
    return {
      id: faker.string.uuid(),
      kategorie: faker.helpers.enumValue(ServiceProviderKategorie),
      name: faker.company.name(),
      administrationsebene: { id: faker.string.uuid(), name: faker.company.name(), kennung: faker.string.numeric(7) },
      rollen: [{ id: faker.string.uuid(), name: faker.person.jobTitle() }],
      requires2fa: faker.datatype.boolean(),
      merkmale: [],
      hasRollenerweiterungen: false,
      hasSomeVerwaltenPermission: faker.datatype.boolean(),
      rollenartenWhitelist: [],
      ...props,
    };
  }

  public static getManageableServiceProviderListEntryResponse(
    props?: Partial<ManageableServiceProviderListEntryResponse>,
  ): ManageableServiceProviderListEntryResponse {
    return {
      id: faker.string.uuid(),
      kategorie: faker.helpers.enumValue(ServiceProviderKategorie),
      name: faker.company.name(),
      administrationsebene: { id: faker.string.uuid(), name: faker.company.name(), kennung: faker.string.numeric(7) },
      rollen: [{ id: faker.string.uuid(), name: faker.person.jobTitle() }],
      requires2fa: faker.datatype.boolean(),
      merkmale: [
        ServiceProviderMerkmal.VerfuegbarFuerRollenerweiterung,
        ServiceProviderMerkmal.AnbietenInSchulischerAngebotsverwaltung,
        ServiceProviderMerkmal.AnbietenInSchulischerRollenverwaltung,
      ],
      rollenerweiterungen: [],
      hasSomeVerwaltenPermission: faker.datatype.boolean(),
      rollenartenWhitelist: [],
      ...props,
    };
  }

  public static getManageableServiceProviderDetail(
    props?: Partial<ManageableServiceProviderDetail>,
  ): ManageableServiceProviderDetail {
    return {
      ...this.getManageableServiceProviderListEntryResponse(props),
      url: props?.url ?? faker.internet.url(),
      availableForRollenerweiterung: props?.availableForRollenerweiterung ?? false,
      logoId: props?.logoId,
      relevantSystemrechte: props?.relevantSystemrechte ?? [],
    };
  }

  public static buildRollenerweiterungenUebersicht(
    items: RollenerweiterungWithExtendedDataResponse[],
  ): RollenErweiterungenUebersicht[] {
    const map: Map<string, RollenerweiterungMap> = new Map();

    for (const item of items) {
      const orgId: string = item.organisationId;
      if (!map.has(orgId)) {
        map.set(orgId, {
          id: orgId,
          kennung: item.organisationKennung,
          schule: item.organisationName,
          rollen: new Set<string>(),
        });
      }
      map.get(orgId)!.rollen.add(item.rolleName);
    }

    return Array.from(map.values()).map((g: RollenerweiterungMap) => ({
      id: g.id,
      kennung: g.kennung,
      schule: g.schule,
      rollenerweiterungen: Array.from(g.rollen).join(', '),
    }));
  }

  public static getRollenerweiterungItem(
    props?: Partial<RollenerweiterungWithExtendedDataResponse>,
  ): RollenerweiterungWithExtendedDataResponse {
    return {
      id: faker.string.uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organisationId: faker.string.uuid(),
      organisationName: faker.company.name(),
      organisationKennung: faker.string.alphanumeric(6),
      rolleId: faker.string.uuid(),
      rolleName: faker.person.jobTitle(),
      serviceProviderId: faker.string.uuid(),
      ...props,
    };
  }

  public static getRollenerweiterungenResponse(
    items?: RollenerweiterungWithExtendedDataResponse[],
    props?: Partial<ProviderControllerFindRollenerweiterungenByServiceProviderId200Response>,
  ): ProviderControllerFindRollenerweiterungenByServiceProviderId200Response {
    const generatedItems: RollenerweiterungWithExtendedDataResponse[] =
      items && items.length > 0
        ? items
        : [this.getRollenerweiterungItem(), this.getRollenerweiterungItem(), this.getRollenerweiterungItem()];

    return {
      items: generatedItems,
      total: generatedItems.length,
      offset: props?.offset ?? 0,
      limit: props?.limit ?? generatedItems.length,
      ...props,
    };
  }

  public static getPersonInfoResponse(props?: Partial<PersonInfoResponse>): PersonInfoResponse {
    const person: Person = DoFactory.getPerson();
    return {
      person: {
        id: person.id,
        name: {
          familiennamen: person.name.familienname,
          vorname: person.name.vorname,
        },
        username: person.username,
        personalnummer: person.personalnummer,
        mandant: '',
        stammorganisation: '',
        revision: '',
        dienststellen: [],
      },
      pid: faker.string.uuid(),
      personenkontexte: [],
      gruppen: [],
      email: person.email
        ? {
            status: person.email.status,
            address: person.email.address,
          }
        : null,
      ...props,
    };
  }

  public static getStartPageServiceProvider(props?: Partial<StartPageServiceProvider>): StartPageServiceProvider {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      url: faker.internet.url(),
      kategorie: faker.helpers.enumValue(ServiceProviderKategorie),
      requires2fa: faker.datatype.boolean(),
      hasLogo: faker.datatype.boolean(),
      target: ServiceProviderTarget.Url,
      ...props,
    };
  }
}
