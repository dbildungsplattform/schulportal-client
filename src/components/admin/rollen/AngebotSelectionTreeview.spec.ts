import { ServiceProviderKategorie, type ServiceProviderResponse } from '@/api-client/generated/api';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import AngebotSelectionTreeview from './AngebotSelectionTreeview.vue';

let wrapper: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> | null = null;

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

function mountComponent(
  props: Partial<InstanceType<typeof AngebotSelectionTreeview>['$props']> = {},
): VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> {
  wrapper = mount(AngebotSelectionTreeview, {
    attachTo: document.getElementById('app') || '',
    props: {
      availableServiceProviders: [secondUnterrichtAngebot, emailAngebot, firstUnterrichtAngebot],
      initiallySelectedServiceProviderIds: [firstUnterrichtAngebot.id],
      loading: false,
      ...props,
    },
  });
  return wrapper;
}

beforeEach((): void => {
  document.body.innerHTML = '<div><div id="app"></div></div>';
});

afterEach((): void => {
  wrapper?.unmount();
  wrapper = null;
});

describe('AngebotSelectionTreeview', (): void => {
  it('renders non-empty categories in start-page order with sorted offers and selected count', async (): Promise<void> => {
    const component: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> = mountComponent();
    await flushPromises();

    const text: string = component.text();
    expect(text.indexOf('E-Mail')).toBeLessThan(text.indexOf('Unterricht'));
    expect(text.indexOf('Anton Unterricht')).toBeLessThan(text.indexOf('Zulu Unterricht'));
    expect(text).toContain('(1 von 2)');
    expect(text).not.toContain('Verwaltung');
  });

  it('opens all category groups initially', (): void => {
    const component: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> = mountComponent();
    const treeview: VueWrapper = component.findComponent({ name: 'VTreeview' });
    const treeviewProps: { opened?: Array<string> } = treeview.props();

    expect(treeviewProps.opened).toEqual(
      expect.arrayContaining([
        'group-EMAIL',
        'group-UNTERRICHT',
        'group-VERWALTUNG',
        'group-SCHULISCH',
        'group-HINWEISE',
      ]),
    );
  });

  it('emits only selectable offer ids', (): void => {
    const component: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> = mountComponent();
    const treeview: VueWrapper = component.findComponent({ name: 'VTreeview' });
    treeview.vm.$emit('update:modelValue', [emailAngebot.id, emailAngebot.id, 'group-EMAIL', 123]);

    expect(component.emitted('update:selectedServiceProviderIds')?.at(-1)?.[0]).toEqual([emailAngebot.id]);
  });

  it('selects all offers in a category through the category checkbox', async (): Promise<void> => {
    const component: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> = mountComponent({
      initiallySelectedServiceProviderIds: [],
    });

    await component.find('[data-testid="angebot-category-checkbox-UNTERRICHT"]').trigger('click');

    expect(component.emitted('update:selectedServiceProviderIds')?.at(-1)?.[0]).toEqual(
      expect.arrayContaining([firstUnterrichtAngebot.id, secondUnterrichtAngebot.id]),
    );
  });

  it('renders the empty state when service providers are temporarily undefined', async (): Promise<void> => {
    const component: VueWrapper<InstanceType<typeof AngebotSelectionTreeview>> = mountComponent({
      availableServiceProviders: undefined,
    });
    await flushPromises();

    expect(component.find('[data-testid="angebot-selection-tree-empty"]').exists()).toBe(true);
    expect(component.find('[data-testid="angebot-selection-tree"]').exists()).toBe(false);
  });
});
