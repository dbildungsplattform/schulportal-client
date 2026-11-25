import { ServiceProviderKategorie, type ServiceProviderResponse } from '@/api-client/generated/api';
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import AngebotSelectionTreeview from './AngebotSelectionTreeview.vue';

type TreeviewWrapper = VueWrapper<InstanceType<typeof AngebotSelectionTreeview>>;
type TreeviewProps = Partial<InstanceType<typeof AngebotSelectionTreeview>['$props']>;

enableAutoUnmount(afterEach);

function setup(props: TreeviewProps = {}): {
  wrapper: TreeviewWrapper;
  emailAngebot: ServiceProviderResponse;
  firstUnterrichtAngebot: ServiceProviderResponse;
  secondUnterrichtAngebot: ServiceProviderResponse;
} {
  document.body.innerHTML = '<div><div id="app"></div></div>';

  const emailAngebot: ServiceProviderResponse = DoFactory.getServiceProviderResponse({
    name: 'Zentrale E-Mail',
    kategorie: ServiceProviderKategorie.Email,
  });
  const firstUnterrichtAngebot: ServiceProviderResponse = DoFactory.getServiceProviderResponse({
    name: 'Anton Unterricht',
    kategorie: ServiceProviderKategorie.Unterricht,
  });
  const secondUnterrichtAngebot: ServiceProviderResponse = DoFactory.getServiceProviderResponse({
    name: 'Zulu Unterricht',
    kategorie: ServiceProviderKategorie.Unterricht,
  });

  const wrapper: TreeviewWrapper = mount(AngebotSelectionTreeview, {
    attachTo: document.getElementById('app') || '',
    props: {
      availableServiceProviders: [secondUnterrichtAngebot, emailAngebot, firstUnterrichtAngebot],
      initiallySelectedServiceProviderIds: [firstUnterrichtAngebot.id],
      loading: false,
      ...props,
    },
  });

  return { wrapper, emailAngebot, firstUnterrichtAngebot, secondUnterrichtAngebot };
}

describe('AngebotSelectionTreeview', (): void => {
  it('renders non-empty categories in start-page order with sorted offers and selected count', async (): Promise<void> => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    await flushPromises();

    const text: string = wrapper.text();
    expect(text.indexOf('E-Mail')).toBeLessThan(text.indexOf('Unterricht'));
    expect(text.indexOf('Anton Unterricht')).toBeLessThan(text.indexOf('Zulu Unterricht'));
    expect(text).toContain('(1 von 2)');
    expect(text).not.toContain('Verwaltung');
  });

  it('renders offers of the new kategorien under their translated label', async (): Promise<void> => {
    const newKategorieAngebot: ServiceProviderResponse = DoFactory.getServiceProviderResponse({
      name: 'Fortbildungsportal',
      kategorie: ServiceProviderKategorie.FortbildungUndQualifizierung,
    });
    const { wrapper }: ReturnType<typeof setup> = setup({
      availableServiceProviders: [newKategorieAngebot],
      initiallySelectedServiceProviderIds: [],
    });
    await flushPromises();

    const category: string = wrapper
      .find(`[data-testid="angebot-category-${ServiceProviderKategorie.FortbildungUndQualifizierung}"]`)
      .text();
    expect(category).toContain('Fortbildung und Qualifizierung');
    expect(wrapper.text()).toContain('Fortbildungsportal');
  });

  it('opens all category groups initially', (): void => {
    const { wrapper }: ReturnType<typeof setup> = setup();
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    const treeviewProps: { opened?: Array<string> } = treeview.props();

    expect(treeviewProps.opened).toEqual(
      expect.arrayContaining(
        Object.values(ServiceProviderKategorie).map((kategorie: ServiceProviderKategorie) => `group-${kategorie}`),
      ),
    );
  });

  it('emits only selectable offer ids', (): void => {
    const { wrapper, emailAngebot }: ReturnType<typeof setup> = setup();
    const treeview: VueWrapper = wrapper.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', [emailAngebot.id, emailAngebot.id, 'group-EMAIL', 123]);

    expect(wrapper.emitted('update:selectedServiceProviderIds')?.at(-1)?.[0]).toEqual([emailAngebot.id]);
  });

  it('selects all offers in a category through the category checkbox', async (): Promise<void> => {
    const { wrapper, firstUnterrichtAngebot, secondUnterrichtAngebot }: ReturnType<typeof setup> = setup({
      initiallySelectedServiceProviderIds: [],
    });

    await wrapper.find('[data-testid="angebot-category-checkbox-UNTERRICHT"]').trigger('click');

    expect(wrapper.emitted('update:selectedServiceProviderIds')?.at(-1)?.[0]).toEqual(
      expect.arrayContaining([firstUnterrichtAngebot.id, secondUnterrichtAngebot.id]),
    );
  });

  it('renders the empty state when service providers are temporarily undefined', async (): Promise<void> => {
    const { wrapper }: ReturnType<typeof setup> = setup({
      availableServiceProviders: undefined,
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="angebot-selection-tree-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="angebot-selection-tree"]').exists()).toBe(false);
  });
});
