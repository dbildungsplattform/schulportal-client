import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import SpshDivider from '@/components/layout/SpshDivider.vue';
import { VueWrapper, enableAutoUnmount, mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import type { ComponentInstance } from 'vue';
import BehoerdeSuccessTemplate from './BehoerdeSuccessTemplate.vue';

enableAutoUnmount(afterEach);

const setup = (): { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } => {
  const wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> = mount(BehoerdeSuccessTemplate, {
    props: {
      successMessage: 'Die Behörde wurde erfolgreich hinzugefügt.',
      changedData: [{ label: 'Behördenname', value: 'Test Behörde', testId: 'created-behoerde-name' }],
      backButtonText: 'Zurück zur Ergebnisliste',
      createAnotherButtonText: 'Weitere Behörde anlegen',
      backButtonTestId: 'back-to-behoerde-list-button',
      createAnotherButtonTestId: 'create-another-behoerde-button',
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
    expect(wrapper.findComponent(SpshDivider).exists()).toBe(true);
  });

  test('it emits onCreateAnotherBehoerde when the create another button is clicked', async () => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    await wrapper.get('[data-testid="create-another-behoerde-button"]').trigger('click');
    expect(wrapper.emitted('onCreateAnotherBehoerde')).toBeTruthy();
  });

  test('it emits onNavigateBackToBehoerdeList when the back button is clicked', async () => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    await wrapper.get('[data-testid="back-to-behoerde-list-button"]').trigger('click');
    expect(wrapper.emitted('onNavigateBackToBehoerdeList')).toBeTruthy();
  });
});
