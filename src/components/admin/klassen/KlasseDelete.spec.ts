import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import KlasseDelete from './KlasseDelete.vue';

type Wrapper = VueWrapper<InstanceType<typeof KlasseDelete>>;

interface DefaultProps {
  modelValue: boolean;
  errorCode: string;
  klassenId: string;
  klassenname: string;
  schulname: string;
  isLoading: boolean;
}

const defaultProps: DefaultProps = {
  modelValue: true,
  errorCode: '',
  klassenId: '1',
  klassenname: '1A',
  schulname: 'schule',
  isLoading: false,
};

function mountDialog(props: Partial<DefaultProps> = {}): Wrapper {
  return mount(KlasseDelete, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        transition: false,
        'v-dialog': {
          name: 'v-dialog',
          template: `
            <div>
              <slot name="activator" :props="{}" />
              <slot name="default" :isActive="{ value: true }" />
            </div>
          `,
        },
      },
    },
  });
}

describe('KlasseDelete.vue', () => {
  it('renders confirmation state by default', () => {
    const wrapper: Wrapper = mountDialog();

    expect(wrapper.html()).toContain('klasse-delete-confirmation-text');
    expect(wrapper.html()).toContain('1A');
  });

  it('emits onDeleteKlasse when delete button is clicked', async () => {
    const wrapper: Wrapper = mountDialog();

    const btn: DOMWrapper<Element> = wrapper.find('[data-testid="klasse-delete-button"]');

    expect(btn.exists()).toBe(true);

    await btn.trigger('click');

    expect(wrapper.emitted('onDeleteKlasse')).toBeTruthy();
    expect(wrapper.emitted('onDeleteKlasse')?.[0]).toEqual(['1']);
  });

  it('shows success state after delete and emits onClose', async () => {
    const wrapper: Wrapper = mountDialog();

    // trigger delete
    await wrapper.find('[data-testid="klasse-delete-button"]').trigger('click');
    await nextTick();

    const closeBtn: DOMWrapper<Element> = wrapper.find('[data-testid="close-klasse-delete-success-dialog-button"]');

    expect(closeBtn.exists()).toBe(true);

    await closeBtn.trigger('click');

    expect(wrapper.emitted('onClose')).toBeTruthy();
  });

  it('disables delete button when loading', () => {
    const wrapper: Wrapper = mountDialog({ isLoading: true });

    const btn: DOMWrapper<Element> = wrapper.find('[data-testid="klasse-delete-button"]');

    expect(btn.exists()).toBe(true);
    expect(btn.attributes('disabled')).toBeDefined();
  });
});
