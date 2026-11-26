import { createPinia, setActivePinia } from 'pinia';
import { DoFactory } from 'test/DoFactory';
import type { Organisation } from './OrganisationStore';
import { RollenArt, RollenMerkmal, type RolleResponse } from './RolleStore';
import {
  DEFAULT_SERVICE_PROVIDER_KATEGORIEN,
  PersonStatusFilter,
  rollenPerPageDefault,
  useSearchFilterStore,
  type SearchFilterStore,
} from './SearchFilterStore';
import { ServiceProviderKategorie, type ServiceProviderIdNameResponse } from './ServiceProviderStore';

const NEW_KATEGORIEN: ReadonlyArray<ServiceProviderKategorie> = [
  ServiceProviderKategorie.KommunikationUndZusammenarbeit,
  ServiceProviderKategorie.UnterrichtUndLernen,
  ServiceProviderKategorie.SchulorganisationUndVerwaltung,
  ServiceProviderKategorie.FortbildungUndQualifizierung,
  ServiceProviderKategorie.InformationenUndPortale,
  ServiceProviderKategorie.HilfeUndUnterstuetzung,
];

function setup(): SearchFilterStore {
  setActivePinia(createPinia());
  return useSearchFilterStore();
}

describe('SearchFilterStore', () => {
  it('should initalize state correctly', () => {
    const searchFilterStore: SearchFilterStore = setup();
    expect(searchFilterStore.selectedKlassen).toEqual([]);
    expect(searchFilterStore.selectedRollen).toEqual([]);
    expect(searchFilterStore.selectedStatusForPersonen).toEqual([]);
    expect(searchFilterStore.selectedOrganisationen).toEqual([]);
    expect(searchFilterStore.searchStringForRollen).toEqual('');
    expect(searchFilterStore.searchStringForPersonen).toEqual('');
    expect(searchFilterStore.searchStringForSchulen).toEqual('');
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('');
    expect(searchFilterStore.selectedSchuleForKlassen).toEqual(null);
    expect(searchFilterStore.selectedKlassenForKlassen).toEqual([]);
    expect(searchFilterStore.selectedSchuleForMptRollen).toEqual(null);
    expect(searchFilterStore.mptRollenPage).toEqual(1);
    expect(searchFilterStore.mptRollenPerPage).toEqual(30);
    expect(searchFilterStore.selectedSchuleForSchulischeServiceProvider).toEqual(null);
    expect(searchFilterStore.selectedMerkmaleForRollen).toEqual([]);
    expect(searchFilterStore.selectedRollenartenForRollen).toEqual([]);
    expect(searchFilterStore.selectedOrganisationenForRollen).toEqual([]);
    expect(searchFilterStore.rollenPerPage).toEqual(rollenPerPageDefault);
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual(DEFAULT_SERVICE_PROVIDER_KATEGORIEN);
    expect(searchFilterStore.selectedServiceProvidersForRollen).toEqual([]);
  });

  it('should change the state', () => {
    const searchFilterStore: SearchFilterStore = setup();
    const selectedKlassen: Organisation[] = [DoFactory.getKlasse(), DoFactory.getKlasse()];
    // it sets the selectedKlassen
    searchFilterStore.setKlasseFilterForPersonen(selectedKlassen);
    expect(searchFilterStore.selectedKlassen).toEqual(selectedKlassen);

    // it sets the selectedRollen
    const selectedRollen: RolleResponse[] = [DoFactory.getRolleResponse(), DoFactory.getRolleResponse()];
    searchFilterStore.setRolleFilterForPersonen(selectedRollen);
    expect(searchFilterStore.selectedRollen).toEqual(selectedRollen);
    searchFilterStore.setRolleFilterForPersonen(null);
    expect(searchFilterStore.selectedRollen).toBeNull();

    // it sets the selectedOrganisationen
    const schulen: Organisation[] = [DoFactory.getSchule(), DoFactory.getSchule()];
    searchFilterStore.setOrganisationFilterForPersonen(schulen);
    expect(searchFilterStore.selectedOrganisationen).toEqual(schulen);
    searchFilterStore.setOrganisationFilterForPersonen(null);
    expect(searchFilterStore.selectedOrganisationen).toBeNull();

    // it sets the searchFilter for personen
    searchFilterStore.setSearchFilterForPersonen('search');
    expect(searchFilterStore.searchStringForPersonen).toEqual('search');
    searchFilterStore.setSearchFilterForPersonen(null);
    expect(searchFilterStore.searchStringForPersonen).toEqual('');

    // it sets the searchFilter for rollen name
    searchFilterStore.setSearchFilterForRollen('search');
    expect(searchFilterStore.searchStringForRollen).toEqual('search');
    searchFilterStore.setSearchFilterForRollen(null);
    expect(searchFilterStore.searchStringForRollen).toEqual('');

    // it sets the searchFilter for schulen
    searchFilterStore.setSearchFilterForSchulen('search');
    expect(searchFilterStore.searchStringForSchulen).toEqual('search');
    searchFilterStore.setSearchFilterForSchulen(null);
    expect(searchFilterStore.searchStringForSchulen).toEqual('');

    // it sets the searchFilter for service provider
    searchFilterStore.setSearchFilterForServiceProvider('search');
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('search');
    searchFilterStore.setSearchFilterForServiceProvider(null);
    expect(searchFilterStore.searchStringForServiceProvider).toEqual('');

    // it sets the selectedSchuleForKlassen
    const schule: Organisation = DoFactory.getSchule();
    searchFilterStore.setSchuleFilterForKlassen(schule);
    expect(searchFilterStore.selectedSchuleForKlassen).toEqual(schule);

    // it sets the selectedKlassenForKlassen
    searchFilterStore.setKlasseFilterForKlassen(selectedKlassen);
    expect(searchFilterStore.selectedKlassenForKlassen).toEqual(selectedKlassen);

    searchFilterStore.setSchuleForMptRollen(schule);
    expect(searchFilterStore.selectedSchuleForMptRollen).toEqual(schule);
    searchFilterStore.setSchuleForMptRollen(null);
    expect(searchFilterStore.selectedSchuleForMptRollen).toEqual(null);

    searchFilterStore.setSchuleForSchulischeServiceProvider(schule);
    expect(searchFilterStore.selectedSchuleForSchulischeServiceProvider).toEqual(schule);

    searchFilterStore.setKategorienForServiceProvider([ServiceProviderKategorie.Email]);
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual([ServiceProviderKategorie.Email]);

    // it resets the selectedKategorienForServiceProvider back to the default selection
    searchFilterStore.resetKategorienForServiceProvider();
    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual(DEFAULT_SERVICE_PROVIDER_KATEGORIEN);
  });

  it('should select the new kategorien but not SCHULISCH by default', () => {
    const searchFilterStore: SearchFilterStore = setup();

    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual([
      ServiceProviderKategorie.Email,
      ServiceProviderKategorie.Unterricht,
      ServiceProviderKategorie.Verwaltung,
      ServiceProviderKategorie.Hinweise,
      ...NEW_KATEGORIEN,
    ]);
    expect(searchFilterStore.selectedKategorienForServiceProvider).not.toContain(ServiceProviderKategorie.Schulisch);
  });

  it('should restore the new kategorien when resetting the kategorien selection', () => {
    const searchFilterStore: SearchFilterStore = setup();
    searchFilterStore.setKategorienForServiceProvider([ServiceProviderKategorie.Schulisch]);

    searchFilterStore.resetKategorienForServiceProvider();

    expect(searchFilterStore.selectedKategorienForServiceProvider).toEqual(expect.arrayContaining([...NEW_KATEGORIEN]));
    expect(searchFilterStore.selectedKategorienForServiceProvider).not.toContain(ServiceProviderKategorie.Schulisch);
  });

  it('should persist, clear and reset the person status selection', () => {
    const searchFilterStore: SearchFilterStore = setup();
    searchFilterStore.setStatusFilterForPersonen([PersonStatusFilter.Locked]);
    expect(searchFilterStore.selectedStatusForPersonen).toEqual([PersonStatusFilter.Locked]);

    searchFilterStore.setStatusFilterForPersonen([]);
    expect(searchFilterStore.selectedStatusForPersonen).toEqual([]);

    searchFilterStore.setStatusFilterForPersonen([PersonStatusFilter.Locked]);
    searchFilterStore.$reset();
    expect(searchFilterStore.selectedStatusForPersonen).toEqual([]);
  });

  it('should set merkmale filter for rollen', () => {
    const searchFilterStore: SearchFilterStore = setup();
    searchFilterStore.setMerkmaleFilterForRollen([RollenMerkmal.KopersPflicht]);
    expect(searchFilterStore.selectedMerkmaleForRollen).toEqual([RollenMerkmal.KopersPflicht]);
  });

  it('should set rollenarten filter for rollen', () => {
    const searchFilterStore: SearchFilterStore = setup();
    searchFilterStore.setRollenartenFilterForRollen([RollenArt.Lehr]);
    expect(searchFilterStore.selectedRollenartenForRollen).toEqual([RollenArt.Lehr]);
  });

  it('should set organisationen filter for rollen', () => {
    const searchFilterStore: SearchFilterStore = setup();
    const organisations: Organisation[] = [DoFactory.getSchule(), DoFactory.getSchule()];
    searchFilterStore.setOrganisationenFilterForRollen(organisations);
    expect(searchFilterStore.selectedOrganisationenForRollen).toEqual(organisations);
  });

  it('should set selected service providers for rollen', () => {
    const searchFilterStore: SearchFilterStore = setup();
    const firstProvider: ServiceProviderIdNameResponse = DoFactory.getServiceProviderResponse({
      id: 'sp1',
      name: 'Provider One',
    });
    const secondProvider: ServiceProviderIdNameResponse = DoFactory.getServiceProviderResponse({
      id: 'sp2',
      name: 'Provider Two',
    });
    const selectedServiceProviders: ServiceProviderIdNameResponse[] = [
      { id: firstProvider.id, name: firstProvider.name },
      { id: secondProvider.id, name: secondProvider.name },
    ];

    searchFilterStore.setServiceProvidersFilterForRollen(selectedServiceProviders);

    expect(searchFilterStore.selectedServiceProvidersForRollen).toEqual(selectedServiceProviders);
  });
});
