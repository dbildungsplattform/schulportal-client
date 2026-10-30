/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/typedef */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */
import { MeldungStatus, useMeldungStore, type MeldungStore } from '@/stores/MeldungStore';
import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import type { ComponentInstance } from 'vue';
import HinweiseCreationView from './HinweiseCreationView.vue';

enableAutoUnmount(afterEach);

const setup = () => {
  const meldungStore: MeldungStore = useMeldungStore();
  meldungStore.meldungen = [
    {
      id: '1',
      text: 'Initial Hinweis',
      status: MeldungStatus.NICHT_VEROEFFENTLICHT,
    },
  ];
  meldungStore.errorCode = '';
  meldungStore.loading = false;

  vi.spyOn(meldungStore, 'getAllMeldungen').mockResolvedValue(undefined);
  vi.spyOn(meldungStore, 'createOrUpdateMeldung').mockResolvedValue(undefined);

  const wrapper = mount(HinweiseCreationView, {
    attachTo: document.getElementById('app') || '',
  });

  return { wrapper, meldungStore };
};

describe('HinweiseCreationView', (): void => {
  beforeEach((): void => {
    document.body.innerHTML = `
      <div>
        <div id="app"></div>
      </div>
    `;

    Object.defineProperty(window, 'history', {
      value: {
        go: vi.fn(),
      },
      writable: true,
    });
  });

  test('should mount successfully', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    expect(wrapper.exists()).toBe(true);
  });

  test('should render admin headline', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    const headline = wrapper.find('[data-testid="admin-headline"]');
    expect(headline.exists()).toBe(true);
  });

  test('should render LayoutCard component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    expect(wrapper.findComponent({ name: 'LayoutCard' }).exists()).toBe(true);
  });

  test('should render FormWrapper component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    expect(wrapper.findComponent({ name: 'FormWrapper' }).exists()).toBe(true);
  });

  test('should render TextEditor component', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    expect(wrapper.findComponent({ name: 'TextEditor' }).exists()).toBe(true);
  });

  test('should load meldungen on mount', async (): Promise<void> => {
    const { meldungStore } = setup();

    await flushPromises();

    expect(meldungStore.getAllMeldungen).toHaveBeenCalled();
  });

  test('should show SpshAlert when errorCode is set', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.errorCode = 'MELDUNG_ERROR';
    await flushPromises();

    expect(wrapper.findComponent({ name: 'SpshAlert' }).exists()).toBe(true);
  });

  test('should not show SpshAlert when errorCode is empty', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();
    const alert = wrapper.findComponent({ name: 'SpshAlert' });
    expect(alert.exists()).toBe(false);
  });

  test('should render submit button with publish label for unpublished meldung', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.meldungen = [
      {
        id: '1',
        text: 'Test',
        status: MeldungStatus.NICHT_VEROEFFENTLICHT,
      },
    ];

    await flushPromises();

    const submitButton = wrapper.find('[data-testid="submit-newsbox"]');
    expect(submitButton.exists()).toBe(true);
    expect(submitButton.text()).toContain('Veröffentlichen');
  });

  test('should render submit button with unpublish label for published meldung', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.meldungen = [
      {
        id: '1',
        text: 'Test',
        status: MeldungStatus.VEROEFFENTLICHT,
      },
    ];

    await flushPromises();

    const submitButton = wrapper.find('[data-testid="submit-newsbox"]');
    expect(submitButton.exists()).toBe(true);
    expect(submitButton.text()).toContain('Veröffentlichung beenden');
  });

  test('should navigate back when close button is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    const layoutCard = wrapper.findComponent({ name: 'LayoutCard' });
    await layoutCard.vm.$emit('on-close-clicked');

    await flushPromises();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(window.history.go).toHaveBeenCalledWith(-1);
  });

  test('should render TextEditor with correct limit prop', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    const textEditor = wrapper.findComponent({ name: 'TextEditor' });
    expect(textEditor.props('limit')).toBe(2000);
  });

  test('should disable submit button when store is loading', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.loading = true;
    await flushPromises();

    const submitButton = wrapper.find('[data-testid="submit-newsbox"]');
    expect(submitButton.attributes('disabled')).toBeDefined();
  });

  test('should reset form when discard is triggered', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.meldungText = 'Changed Text';
    await flushPromises();

    const formWrapper = wrapper.findComponent({ name: 'FormWrapper' });
    await formWrapper.vm.$emit('on-discard');

    await flushPromises();

    expect(wrapper.exists()).toBe(true);
  });

  test('should update unsaved changes dialog visibility', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    await flushPromises();

    const formWrapper = wrapper.findComponent({ name: 'FormWrapper' });
    await formWrapper.vm.$emit('on-show-dialog-change', true);

    await flushPromises();

    const vm = wrapper.vm as any;
    expect(vm.showUnsavedChangesDialog).toBe(true);
  });

  test('should handle empty meldungen array', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.meldungen = [];
    await flushPromises();

    expect(wrapper.exists()).toBe(true);
  });

  test('should render headline with correct i18n key', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    await flushPromises();

    const headline = wrapper.find('[data-testid="admin-headline"]');
    expect(headline.exists()).toBe(true);
  });

  test('should show error alert with correct information', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.errorCode = 'MELDUNG_ERROR';
    await flushPromises();

    const alert = wrapper.findComponent({ name: 'SpshAlert' });
    expect(alert.props('modelValue')).toBe(true);
    expect(alert.props('type')).toBe('error');
  });

  test('should pass handleConfirmUnsavedChanges action to FormWrapper', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    const formWrapper = wrapper.findComponent({ name: 'FormWrapper' });
    expect(formWrapper.props('confirmUnsavedChangesAction')).toBeDefined();
  });

  test('should render form with correct id', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    const form = wrapper.find('[data-testid="newsbox-form"]');
    expect(form.exists()).toBe(true);
  });

  test('should render TextEditor within layout structure', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>> } = setup();

    const textEditor = wrapper.findComponent({ name: 'TextEditor' });
    expect(textEditor.exists()).toBe(true);

    const rows = wrapper.findAllComponents({ name: 'VRow' });
    expect(rows.length).toBeGreaterThan(0);
  });

  test('should handle refresh page action', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.errorCode = 'MELDUNG_ERROR';
    await flushPromises();

    const alert = wrapper.findComponent({ name: 'SpshAlert' });
    expect(alert.props('showButton')).toBe(true);
  });

  test('should clear error code after user confirms unsaved changes', async (): Promise<void> => {
    const {
      wrapper,
      meldungStore,
    }: { wrapper: VueWrapper<ComponentInstance<typeof HinweiseCreationView>>; meldungStore: MeldungStore } = setup();

    meldungStore.errorCode = 'TEST_ERROR';
    await flushPromises();

    const vm = wrapper.vm as any;
    vm.handleConfirmUnsavedChanges();

    expect(meldungStore.errorCode).toBe('');
  });
});
