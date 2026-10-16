import LabeledField from '@/components/admin/LabeledField.vue';
import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import SPSHDivider from '@/components/layout/SpshDivider.vue';
import { VueWrapper, enableAutoUnmount, mount } from '@vue/test-utils';
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
    expect(wrapper.getComponent(LabeledField).get('.text-body').text()).toBe('Test Behörde');
    expect(wrapper.findComponent(SuccessIcon).exists()).toBe(true);
    expect(wrapper.findComponent(SPSHDivider).exists()).toBe(true);
  });

  test('it emits onCreateAnotherBehoerde when the create another button is clicked', async () => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    expect(wrapper.get('[data-testid="success-template-primary-button"]').text()).toBe('Weitere Behörde anlegen');
    await wrapper.get('[data-testid="success-template-primary-button"]').trigger('click');
    expect(wrapper.emitted('onCreateAnotherBehoerde')).toHaveLength(1);
  });

  test('should keep the back button hidden', (): void => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    expect(wrapper.find('[data-testid="success-template-secondary-button"]').exists()).toBe(false);
  });

  test('should render multiple data rows and their labels', async (): Promise<void> => {
    const { wrapper }: { wrapper: VueWrapper<ComponentInstance<typeof BehoerdeSuccessTemplate>> } = setup();

    await wrapper.setProps({
      changedData: [
        { label: 'Name', value: 'First value', testId: 'first-value' },
        { label: 'Description', value: 'Second value', testId: 'second-value' },
      ],
    });

    expect(
      wrapper
        .findAllComponents(LabeledField)
        .map((row: VueWrapper<ComponentInstance<typeof LabeledField>>): string => row.get('.subtitle-2').text()),
    ).toEqual(['Name:', 'Description:']);
    expect(
      wrapper
        .findAllComponents(LabeledField)
        .map((row: VueWrapper<ComponentInstance<typeof LabeledField>>): string => row.get('.text-body').text()),
    ).toEqual(['First value', 'Second value']);
  });
});
