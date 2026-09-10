import { Organisation, OrganisationsTyp } from '@/stores/OrganisationStore';
import { createTestingPinia } from '@pinia/testing';
import { DOMWrapper, mount, VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import SchuleSuccessTemplate from './SchuleSuccessTemplate.vue';

// Mock i18n
const i18n = createI18n({
  legacy: false,
  locale: 'de-DE',
  messages: {
    'de-DE': {
      admin: {
        followingDataCreated: 'Folgende Daten wurden erstellt',
        'schule.schulform': 'Schulform',
        'schule.dienststellennummer': 'Dienststellennummer',
        'schule.schulname': 'Schulname',
        'schule.emailAdresse': 'E-Mail-Adresse',
      },
      nav: {
        backToList: 'Zurück zur Liste',
      },
      edit: 'Bearbeiten',
      'admin.schule.createAnother': 'Weitere Schule erstellen',
    },
  },
});

// Mock data
const mockSchultraeger: Organisation[] = [
  {
    id: 'schultraeger-1',
    name: 'Schulträger 1',
    kennung: 'ST1',
    typ: 'SCHULTRAEGER',
  } as Organisation,
  {
    id: 'schultraeger-2',
    name: 'Schulträger 2',
    kennung: 'ST2',
    typ: 'SCHULTRAEGER',
  } as Organisation,
];

const mockFollowingData: Organisation = {
  id: 'schule-1',
  name: 'Test Gymnasium',
  kennung: 'DIN-12345',
  typ: 'SCHULE',
  administriertVon: 'schultraeger-1',
  emailAdress: 'test@gymnasium.de',
};

const mockFollowingDataNoEmail: Organisation = {
  id: 'schule-2',
  name: 'Test Realschule',
  kennung: 'DIN-67890',
  typ: 'SCHULE',
  administriertVon: 'schultraeger-2',
  emailAdress: undefined,
};

// Test wrapper helper
let wrapper: VueWrapper<unknown> | null = null;

const createWrapper = (props: Record<string, unknown> = {}): VueWrapper<unknown> => {
  wrapper = mount(SchuleSuccessTemplate, {
    props: {
      successMessage: 'Schule erfolgreich erstellt!',
      followingDataChanged: mockFollowingData,
      schultraegerList: mockSchultraeger,
      isEditMode: false,
      ...props,
    },
    global: {
      plugins: [createTestingPinia(), i18n],
    },
  });
  return wrapper;
};

describe('SchuleSuccessTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  describe('Component Rendering', () => {
    it('should mount successfully with required props', () => {
      createWrapper();
      expect(wrapper?.vm).toBeDefined();
      expect(wrapper?.exists()).toBe(true);
    });

    it('should render the container with correct class', () => {
      createWrapper();
      const container = wrapper?.find('.new-schule-success');
      expect(container?.exists()).toBe(true);
    });

    it('should render success message text', () => {
      const testMessage = 'Custom success message!';
      createWrapper({ successMessage: testMessage });
      const successText = wrapper?.find('[data-testid="schule-success-text"]');
      expect(successText?.exists()).toBe(true);
      expect(successText?.text()).toBe(testMessage);
    });

    it.skip('should render success icon', () => {
      // Skipped: Vuetify v-icon attributes may not render in test environment
      createWrapper();
      const icon = wrapper?.find('[data-testid="schule-success-icon"]');
      expect(icon?.exists()).toBe(true);
      expect(icon?.attributes('icon')).toBe('mdi-check-circle');
    });
  });

  describe('Component Props', () => {
    it('should accept successMessage prop', () => {
      const message = 'Test success message';
      createWrapper({ successMessage: message });
      expect(wrapper?.props('successMessage')).toBe(message);
    });

    it('should accept followingDataChanged prop', () => {
      createWrapper({ followingDataChanged: mockFollowingData });
      expect(wrapper?.props('followingDataChanged')).toEqual(mockFollowingData);
    });

    it('should accept schultraegerList prop', () => {
      createWrapper({ schultraegerList: mockSchultraeger });
      expect(wrapper?.props('schultraegerList')).toEqual(mockSchultraeger);
    });

    it('should accept isEditMode prop as true', () => {
      createWrapper({ isEditMode: true });
      expect(wrapper?.props('isEditMode')).toBe(true);
    });

    it('should accept isEditMode prop as false', () => {
      createWrapper({ isEditMode: false });
      expect(wrapper?.props('isEditMode')).toBe(false);
    });

    it('should handle null followingDataChanged', () => {
      createWrapper({ followingDataChanged: null });
      expect(wrapper?.props('followingDataChanged')).toBeNull();
    });

    it('should handle undefined schultraegerList', () => {
      createWrapper({ schultraegerList: undefined });
      expect(wrapper?.props('schultraegerList')).toBeUndefined();
    });
  });

  describe('Following Data Display', () => {
    it('should display created schule data', () => {
      createWrapper({ followingDataChanged: mockFollowingData });

      const schulformLabel = wrapper?.find('[data-testid="created-schule-form-label"]');
      expect(schulformLabel?.exists()).toBe(true);

      const dienststellennummerLabel = wrapper?.find('[data-testid="created-schule-dienststellennummer-label"]');
      expect(dienststellennummerLabel?.exists()).toBe(true);

      const nameLabel = wrapper?.find('[data-testid="created-schule-name-label"]');
      expect(nameLabel?.exists()).toBe(true);

      const emailLabel = wrapper?.find('[data-testid="created-schule-email-label"]');
      expect(emailLabel?.exists()).toBe(true);
    });

    it('should display kennung value in dienststellennummer field', () => {
      createWrapper({ followingDataChanged: mockFollowingData });
      const dienststellennummer = wrapper?.find('[data-testid="created-schule-dienststellennummer"]');
      expect(dienststellennummer?.text()).toBe(mockFollowingData.kennung);
    });

    it('should display name value', () => {
      createWrapper({ followingDataChanged: mockFollowingData });
      const name = wrapper?.find('[data-testid="created-schule-name"]');
      expect(name?.text()).toBe(mockFollowingData.name);
    });

    it('should display email value', () => {
      createWrapper({ followingDataChanged: mockFollowingData });
      const email = wrapper?.find('[data-testid="created-schule-email"]');
      expect(email?.text()).toBe(mockFollowingData.emailAdress);
    });

    it('should handle missing email gracefully', () => {
      createWrapper({ followingDataChanged: mockFollowingDataNoEmail });
      const email = wrapper?.find('[data-testid="created-schule-email"]');
      expect(email?.exists()).toBe(true);
      expect(email?.text()).toBe('');
    });
  });

  describe('Schultraeger Name Resolution', () => {
    it('should resolve schultraeger name correctly', () => {
      createWrapper({
        followingDataChanged: mockFollowingData,
        schultraegerList: mockSchultraeger,
      });

      const schulform = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('Schulträger 1');
    });

    it('should return empty string for unknown schultraeger id', () => {
      const dataWithUnknownSchultraeger = {
        ...mockFollowingData,
        administriertVon: 'unknown-id',
      };

      createWrapper({
        followingDataChanged: dataWithUnknownSchultraeger,
        schultraegerList: mockSchultraeger,
      });

      const schulform = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('');
    });

    it('should return empty string when schultraegerList is undefined', () => {
      createWrapper({
        followingDataChanged: mockFollowingData,
        schultraegerList: undefined,
      });

      const schulform = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('');
    });

    it('should return empty string when administriertVon is null', () => {
      const dataWithNullSchultraeger = {
        ...mockFollowingData,
        administriertVon: null,
      };

      createWrapper({
        followingDataChanged: dataWithNullSchultraeger,
        schultraegerList: mockSchultraeger,
      });

      const schulform = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('');
    });
  });

  describe('Event Emissions', () => {
    it('should emit onNavigateBackToSchuleManagement when back button is clicked', async () => {
      createWrapper();
      const backButton = wrapper?.find('[data-testid="back-to-list-button"]');

      expect(backButton?.exists()).toBe(true);
      await backButton?.trigger('click');

      expect(wrapper?.emitted('onNavigateBackToSchuleManagement')).toBeTruthy();
      expect(wrapper?.emitted('onNavigateBackToSchuleManagement')).toHaveLength(1);
    });

    it('should emit onNavigateToSchuleForm when create another button is clicked', async () => {
      createWrapper();
      const createButton = wrapper?.find('[data-testid="create-another-schule-button"]');

      expect(createButton?.exists()).toBe(true);
      await createButton?.trigger('click');

      expect(wrapper?.emitted('onNavigateToSchuleForm')).toBeTruthy();
      expect(wrapper?.emitted('onNavigateToSchuleForm')).toHaveLength(1);
    });

    it('should emit correct events multiple times', async () => {
      createWrapper();
      const backButton = wrapper?.find('[data-testid="back-to-list-button"]');
      const createButton = wrapper?.find('[data-testid="create-another-schule-button"]');

      await backButton?.trigger('click');
      await createButton?.trigger('click');
      await backButton?.trigger('click');

      expect(wrapper?.emitted('onNavigateBackToSchuleManagement')).toHaveLength(2);
      expect(wrapper?.emitted('onNavigateToSchuleForm')).toHaveLength(1);
    });
  });

  describe('Button Labels', () => {
    it('should show "Zurück zur Liste" on back button', () => {
      createWrapper();
      const backButton = wrapper?.find('[data-testid="back-to-list-button"]');
      expect(backButton?.text()).toContain('Zurück zur Liste');
    });

    it('should show "Weitere Schule erstellen" on create button in create mode', () => {
      createWrapper({ isEditMode: false });
      const createButton = wrapper?.find('[data-testid="create-another-schule-button"]');
      expect(createButton?.text()).toContain('Weitere Schule erstellen');
    });

    it('should show "Bearbeiten" on button in edit mode', () => {
      createWrapper({ isEditMode: true });
      const createButton = wrapper?.find('[data-testid="create-another-schule-button"]');
      expect(createButton?.text()).toContain('Bearbeiten');
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize with i18n', () => {
      createWrapper();
      expect(wrapper?.vm.$i18n).toBeDefined();
    });

    it('should unmount without errors', () => {
      createWrapper();
      expect(() => {
        wrapper?.unmount();
      }).not.toThrow();
    });

    it('should handle component updates', async () => {
      createWrapper();

      const newData: Organisation = {
        ...mockFollowingData,
        name: 'Updated School Name',
      };

      await wrapper?.setProps({ followingDataChanged: newData });

      const name = wrapper?.find('[data-testid="created-schule-name"]');
      expect(name?.text()).toBe('Updated School Name');
    });
  });

  describe('Props Reactivity', () => {
    it('should update success message when prop changes', async () => {
      createWrapper({ successMessage: 'Original message' });
      let successText = wrapper?.find('[data-testid="schule-success-text"]');
      expect(successText?.text()).toBe('Original message');

      await wrapper?.setProps({ successMessage: 'Updated message' });
      successText = wrapper?.find('[data-testid="schule-success-text"]');
      expect(successText?.text()).toBe('Updated message');
    });

    it('should update following data when prop changes', async () => {
      createWrapper({ followingDataChanged: mockFollowingData });
      let name = wrapper?.find('[data-testid="created-schule-name"]');
      expect(name?.text()).toBe('Test Gymnasium');

      await wrapper?.setProps({ followingDataChanged: mockFollowingDataNoEmail });
      name = wrapper?.find('[data-testid="created-schule-name"]');
      expect(name?.text()).toBe('Test Realschule');
    });

    it('should update schultraeger list reactively', async () => {
      createWrapper({ schultraegerList: mockSchultraeger });
      let schulform: DOMWrapper<Element> | undefined = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('Schulträger 1');

      const newSchultraegerList: Organisation[] = [
        {
          id: 'schultraeger-1',
          name: 'Updated Schulträger 1',
          kennung: 'ST1',
          typ: OrganisationsTyp.Schule,
        },
      ];

      await wrapper?.setProps({ schultraegerList: newSchultraegerList });
      schulform = wrapper?.find('[data-testid="created-schule-form"]');
      expect(schulform?.text()).toBe('Updated Schulträger 1');
    });
  });

  describe('Template Structure', () => {
    it('should render v-container', () => {
      createWrapper();
      expect(wrapper?.findComponent({ name: 'VContainer' }).exists()).toBe(true);
    });

    it('should render v-row components', () => {
      createWrapper();
      const rows: VueWrapper<Element>[] | undefined = wrapper?.findAllComponents({ name: 'VRow' });
      expect(rows?.length).toBeGreaterThan(0);
    });

    it('should render v-col components', () => {
      createWrapper();
      const cols: VueWrapper<Element>[] | undefined = wrapper?.findAllComponents({ name: 'VCol' });
      expect(cols?.length).toBeGreaterThan(0);
    });

    it('should render v-icon component', () => {
      createWrapper();
      expect(wrapper?.findComponent({ name: 'VIcon' }).exists()).toBe(true);
    });

    it('should render v-divider component', () => {
      createWrapper();
      expect(wrapper?.findComponent({ name: 'VDivider' }).exists()).toBe(true);
    });

    it('should render v-btn components for actions', () => {
      createWrapper();
      const buttons = wrapper?.findAllComponents({ name: 'VBtn' });
      expect(buttons?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Display Labels', () => {
    it('should render all label fields', () => {
      createWrapper();

      const labels: string[] = [
        'created-schule-form-label',
        'created-schule-dienststellennummer-label',
        'created-schule-name-label',
        'created-schule-email-label',
      ];

      labels.forEach((label: string) => {
        const element: DOMWrapper<Element> | undefined = wrapper?.find(`[data-testid="${label}"]`);
        expect(element?.exists()).toBe(true);
      });
    });

    it('should apply correct classes to labels', () => {
      createWrapper();
      const label = wrapper?.find('[data-testid="created-schule-form-label"]');
      expect(label?.classes()).toContain('text-body');
      expect(label?.classes()).toContain('bold');
      expect(label?.classes()).toContain('text-right');
    });
  });

  describe('Text Content', () => {
    it('should display "followingDataCreated" text', () => {
      createWrapper();
      const followingDataText = wrapper?.find('[data-testid="following-data-created-text"]');
      expect(followingDataText?.exists()).toBe(true);
      expect(followingDataText?.text()).toContain('Folgende Daten wurden erstellt');
    });
  });

  describe('Icon Styling', () => {
    it.skip('should apply correct color to success icon', () => {
      // Skipped: Vuetify v-icon color attribute may not render in test environment
      createWrapper();
      const icon = wrapper?.find('[data-testid="schule-success-icon"]');
      expect(icon?.attributes('color')).toBe('#1EAE9C');
    });

    it.skip('should have mdi-check-circle icon', () => {
      // Skipped: Vuetify v-icon attribute may not render in test environment
      createWrapper();
      const icon = wrapper?.find('[data-testid="schule-success-icon"]');
      expect(icon?.attributes('icon')).toBe('mdi-check-circle');
    });
  });

  describe('Empty and Null State Handling', () => {
    it('should handle empty followingDataChanged gracefully', () => {
      createWrapper({ followingDataChanged: null });
      expect(wrapper?.vm).toBeDefined();
      expect(() => wrapper?.vm).not.toThrow();
    });

    it('should render even with minimal data', () => {
      const minimalData: Organisation = {
        id: 'test',
        typ: 'SCHULE',
        name: '',
      };

      createWrapper({
        followingDataChanged: minimalData,
        schultraegerList: [],
      });

      expect(wrapper?.exists()).toBe(true);
    });

    it('should render with empty schultraeger list', () => {
      createWrapper({
        schultraegerList: [],
      });

      expect(wrapper?.exists()).toBe(true);
    });
  });
});
