import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import SPSHDivider from '@/components/layout/SpshDivider.vue';
import { VueWrapper, enableAutoUnmount, mount, type DOMWrapper } from '@vue/test-utils';
import { expect, test } from 'vitest';
import type { ComponentInstance } from 'vue';
import { createVuetify } from 'vuetify';
import BehoerdeSuccessTemplate from './BehoerdeSuccessTemplate.vue';

enableAutoUnmount(afterEach);

const setup = (): { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } => {
  const wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> = mount(BehoerdeSuccessTemplate, {
    global: { plugins: [createVuetify()] },
    props: {
      changedData: [{ label: 'Behördenname', value: 'Test Behörde', testId: 'created-behoerde-name' }],
    },
  });

  return { wrapper };
};

describe('BehoerdeSuccessTemplate', () => {
  test('it displays the success message and data correctly', () => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    expect(wrapper.get('[data-testid="behoerde-success-text"]').text()).toBe(
      'Die Behörde wurde erfolgreich hinzugefügt.',
    );
    expect(wrapper.get('[data-testid="created-behoerde-name"]').text()).toBe('Test Behörde');
    expect(wrapper.findComponent(SuccessIcon).exists()).toBe(true);
    expect(wrapper.findComponent(SPSHDivider).exists()).toBe(true);
  });

  test('it emits onCreateAnotherBehoerde when the create another button is clicked', async () => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    expect(wrapper.get('[data-testid="success-template-primary-button"]').text()).toBe('Weitere Behörde anlegen');
    await wrapper.get('[data-testid="success-template-primary-button"]').trigger('click');
    expect(wrapper.emitted('onCreateAnotherBehoerde')).toHaveLength(1);
  });

  test('should return to the results list when the back button is clicked', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    await wrapper.get('[data-testid="success-template-secondary-button"]').trigger('click');
    expect(wrapper.emitted('onNavigateBackToBehoerdeList')).toHaveLength(1);
  });

  test('should render multiple data rows and their labels', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    await wrapper.setProps({
      changedData: [
        { label: 'Name', value: 'First value', testId: 'first-value' },
        { label: 'Description', value: 'Second value', testId: 'second-value' },
      ],
    });

    expect(wrapper.findAll('.text-body.bold.text-right').map((row: DOMWrapper<Element>): string => row.text())).toEqual(
      ['Name:', 'Description:'],
    );
    expect(wrapper.findAll('.text-body:not(.bold)').map((row: DOMWrapper<Element>): string => row.text())).toEqual([
      'First value',
      'Second value',
    ]);
  });
});
