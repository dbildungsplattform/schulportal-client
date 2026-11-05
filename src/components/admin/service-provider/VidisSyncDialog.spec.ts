import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import VidisSyncDialog from './VidisSyncDialog.vue';

type Wrapper = VueWrapper<InstanceType<typeof VidisSyncDialog>>;

interface DefaultProps {
  modelValue: boolean;
  errorCode: string;
  isLoading: boolean;
  schuleName: string;
}

const defaultProps: DefaultProps = {
  modelValue: true,
  errorCode: '',
  isLoading: false,
  schuleName: 'Testschule',
};

function mountDialog(props: Partial<DefaultProps> = {}): Wrapper {
  return mount(VidisSyncDialog, {
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

describe('VidisSyncDialog.vue', () => {
  describe('CONFIRM state', () => {
    it('renders confirmation text including the school name', () => {
      const wrapper: Wrapper = mountDialog();

      expect(wrapper.find('[data-testid="vidis-sync-confirmation-text"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="vidis-sync-confirmation-text"]').text()).toContain('Testschule');
    });

    it('shows the cancel and sync buttons', () => {
      const wrapper: Wrapper = mountDialog();

      expect(wrapper.find('[data-testid="cancel-vidis-sync-dialog-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="vidis-sync-button"]').exists()).toBe(true);
    });

    it('does not show success, error, or loading content', () => {
      const wrapper: Wrapper = mountDialog();

      expect(wrapper.find('[data-testid="vidis-sync-success-text"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="vidis-sync-error-text"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="vidis-sync-loading-text"]').exists()).toBe(false);
    });

    it('emits onSyncVidis when the sync button is clicked', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');

      expect(wrapper.emitted('onSyncVidis')).toBeTruthy();
    });

    it('emits onClose with false when cancel is clicked', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="cancel-vidis-sync-dialog-button"]').trigger('click');

      expect(wrapper.emitted('onClose')).toBeTruthy();
      expect(wrapper.emitted('onClose')?.[0]).toEqual([false]);
    });
  });

  describe('LOADING state', () => {
    it('shows the spinner and loading text', () => {
      const wrapper: Wrapper = mountDialog({ isLoading: true });

      expect(wrapper.find('[data-testid="vidis-sync-loading-text"]').exists()).toBe(true);
    });

    it('hides confirmation, success, and error content', () => {
      const wrapper: Wrapper = mountDialog({ isLoading: true });

      expect(wrapper.find('[data-testid="vidis-sync-confirmation-text"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="vidis-sync-success-text"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="vidis-sync-error-text"]').exists()).toBe(false);
    });

    it('disables the sync button while loading', () => {
      const wrapper: Wrapper = mountDialog({ isLoading: true });

      const btn: DOMWrapper<Element> = wrapper.find('[data-testid="vidis-sync-button"]');

      expect(btn.exists()).toBe(true);
      expect(btn.attributes('disabled')).toBeDefined();
    });

    it('hides the cancel button while loading', () => {
      const wrapper: Wrapper = mountDialog({ isLoading: true });

      expect(wrapper.find('[data-testid="cancel-vidis-sync-dialog-button"]').exists()).toBe(false);
    });
  });

  describe('SUCCESS state', () => {
    it('shows success text after sync completes without error', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="vidis-sync-success-text"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="vidis-sync-confirmation-text"]').exists()).toBe(false);
    });

    it('shows the close button in success state', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="close-vidis-sync-success-dialog-button"]').exists()).toBe(true);
    });

    it('hides the cancel button in success state', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await nextTick();

      expect(wrapper.find('[data-testid="cancel-vidis-sync-dialog-button"]').exists()).toBe(false);
    });
  });

  describe('ERROR state', () => {
    it('shows error text when errorCode is set after the action was triggered', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await wrapper.setProps({ errorCode: 'VIDIS_API_ERROR' });
      await nextTick();

      expect(wrapper.find('[data-testid="vidis-sync-error-text"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="vidis-sync-confirmation-text"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="vidis-sync-success-text"]').exists()).toBe(false);
    });

    it('shows the close button in error state', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await wrapper.setProps({ errorCode: 'VIDIS_API_ERROR' });
      await nextTick();

      expect(wrapper.find('[data-testid="close-vidis-sync-error-dialog-button"]').exists()).toBe(true);
    });

    it('emits onClose with false when close is clicked in error state', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await wrapper.setProps({ errorCode: 'VIDIS_API_ERROR' });
      await nextTick();

      await wrapper.find('[data-testid="close-vidis-sync-error-dialog-button"]').trigger('click');

      expect(wrapper.emitted('onClose')).toBeTruthy();
      expect(wrapper.emitted('onClose')?.[0]).toEqual([false]);
    });

    it('hides the cancel button in error state', async () => {
      const wrapper: Wrapper = mountDialog();

      await wrapper.find('[data-testid="vidis-sync-button"]').trigger('click');
      await wrapper.setProps({ errorCode: 'VIDIS_API_ERROR' });
      await nextTick();

      expect(wrapper.find('[data-testid="cancel-vidis-sync-dialog-button"]').exists()).toBe(false);
    });
  });
});
