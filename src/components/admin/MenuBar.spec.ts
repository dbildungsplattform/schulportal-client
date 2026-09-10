import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { VueWrapper, mount } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { expect, test, type Mock, type MockInstance } from 'vitest';
import { h, nextTick, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { VApp } from 'vuetify/components';
import MenuBar from './MenuBar.vue';

let wrapper: VueWrapper | null = null;
const authStore: AuthStore = useAuthStore();

authStore.currentUser = DoFactory.getUserinfoResponse();

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    path: '/',
  })),
  useRouter: vi.fn(() => ({
    push: (): void => {
      // intentionally empty
    },
    go: (): void => {
      // intentionally empty
    },
  })),
}));
vi.mock('vuetify', () => ({
  useDisplay: vi.fn(() => ({
    mobile: false,
  })),
}));

function mountComponent(): VueWrapper {
  return mount(VApp, {
    attachTo: document.getElementById('app') || '',
    global: {
      components: {
        MenuBar: MenuBar as Component,
      },
      stubs: ['router-link', 'router-view'],
    },
    slots: {
      default: h(MenuBar),
    },
  });
}

function setPermissions(hasPermission: boolean): void {
  authStore.hasPersonenverwaltungPermission = hasPermission;
  authStore.hasImportPermission = hasPermission;
  authStore.hasKlassenverwaltungPermission = hasPermission;
  authStore.hasRollenverwaltungPermission = hasPermission;
  authStore.hasSchulverwaltungPermission = hasPermission;
  authStore.hasSchultraegerverwaltungPermission = hasPermission;
  authStore.hasPersonenAnlegenPermission = hasPermission;
  authStore.hasSchultraegerverwaltungPermission = hasPermission;
  authStore.hasPortalVerwaltungPermission = hasPermission;
  authStore.hasHinweiseBearbeitenPermission = hasPermission;
  authStore.hasLandesbediensteteSuchenUndHinzufügenPermission = hasPermission;
  authStore.hasEingeschränktNeueBenutzerErstellenPermission = hasPermission;
  authStore.hasAngeboteVerwaltenPermission = hasPermission;
  authStore.hasRollenerweiternPermission = hasPermission;
  authStore.hasMptRollenVerwaltenPermission = hasPermission;
}

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mountComponent();
  setPermissions(true);
});

describe('MenuBar', () => {
  test('it renders the menu bar', () => {
    expect(wrapper?.find('[data-testid="menu-bar-title"]').isVisible()).toBe(true);
  });

  test.each([[true], [false]])(
    'it renders available menu links, when permissions are %s',
    async (hasPermission: boolean) => {
      setPermissions(hasPermission);
      await nextTick();
      expect(wrapper?.find('[data-testid="menu-bar-title"]').isVisible()).toBe(true);
      expect(wrapper?.find('[data-testid="back-to-start-link"]').isVisible()).toBe(true);
      expect(wrapper?.find('[data-testid="faq-link"]').isVisible()).toBe(true);

      expect(wrapper?.find('[data-testid="person-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="person-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="person-creation-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="person-import-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="klasse-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="klasse-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="klasse-creation-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="rolle-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="rolle-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="rolle-creation-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="mpt-rolle-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="mpt-rolle-section-title"]').exists()).toBe(false);
      expect(wrapper?.find('[data-testid="mpt-rolle-management-only-menu-item"]').exists()).toBe(false);

      expect(wrapper?.find('[data-testid="angebot-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="angebot-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="angebot-display-schulspezifisch-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="schule-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="schule-management-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="schule-creation-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="schultraeger-creation-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="schultraeger-management-title"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="portal-management-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="hinweise-edit-menu-item"]').exists()).toBe(hasPermission);

      expect(wrapper?.find('[data-testid="person-add-title"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="person-search-menu-item"]').exists()).toBe(hasPermission);
      expect(wrapper?.find('[data-testid="person-add-menu-item"]').exists()).toBe(hasPermission);
    },
  );

  test('hides elements when permissions are false', async () => {
    // Reset permissions to false
    authStore.hasPersonenAnlegenPermission = false;
    authStore.hasMptRollenVerwaltenPermission = false;
    await nextTick();

    expect(wrapper?.find('[data-testid="person-creation-menu-item"]').exists()).toBe(false);
    expect(wrapper?.find('[data-testid="mpt-rolle-management-menu-item"]').exists()).toBe(false);
    expect(wrapper?.find('[data-testid="mpt-rolle-management-only-menu-item"]').exists()).toBe(false);
  });

  test('renders standalone mpt role section for users without rollenverwaltung permission', async () => {
    setPermissions(false);
    authStore.hasMptRollenVerwaltenPermission = true;
    await nextTick();

    expect(wrapper?.find('[data-testid="rolle-management-title"]').exists()).toBe(false);
    expect(wrapper?.find('[data-testid="mpt-rolle-section-title"]').exists()).toBe(true);
    expect(wrapper?.find('[data-testid="mpt-rolle-management-only-menu-item"]').exists()).toBe(true);
  });

  test('it handles menu item click', async () => {
    interface Fixture {
      selector: string;
      route: string;
    }
    const push: MockInstance = vi.fn();
    (useRouter as Mock).mockImplementation(() => {
      return { push };
    });
    wrapper = mountComponent();
    const fixtures: Fixture[] = [
      { selector: '[data-testid="person-management-menu-item"]', route: '/admin/personen' },
      { selector: '[data-testid="person-import-menu-item"]', route: '/admin/personen/import' },
      { selector: '[data-testid="klasse-management-menu-item"]', route: '/admin/klassen' },
      { selector: '[data-testid="rolle-management-menu-item"]', route: '/admin/rollen' },
      { selector: '[data-testid="mpt-rolle-management-menu-item"]', route: '/admin/rollen/mpt' },
      { selector: '[data-testid="angebot-management-menu-item"]', route: '/admin/angebote' },
      {
        selector: '[data-testid="angebot-display-schulspezifisch-menu-item"]',
        route: '/admin/angebote/schulspezifisch',
      },
      { selector: '[data-testid="schule-management-menu-item"]', route: '/admin/schulen' },
    ];
    for (const fixture of fixtures) {
      // eslint-disable-next-line no-await-in-loop
      await wrapper.find(fixture.selector).trigger('click');
      expect(push).toHaveBeenLastCalledWith(fixture.route);
    }
    expect(push).toHaveBeenCalledTimes(fixtures.length);
  });

  test('it refreshes when navigating to current route', async () => {
    const push: MockInstance = vi.fn(() => Promise.resolve());
    const go: MockInstance = vi.fn();
    (useRouter as Mock).mockImplementation(() => {
      return { push, go };
    });
    (useRoute as Mock).mockImplementation(() => {
      return { path: '/admin/personen/import' };
    });
    wrapper = mountComponent();

    await wrapper.find('[data-testid="person-import-menu-item"]').trigger('click');
    await nextTick();

    expect(push).toHaveBeenCalledOnce();
    expect(go).toHaveBeenCalledOnce();
  });

  describe('on mobile', () => {
    beforeAll(() => {
      (useDisplay as Mock).mockImplementation(() => {
        return { mobile: { value: true } };
      });
    });
    afterAll(() => {
      (useDisplay as Mock).mockRestore();
    });

    test('it opens and closes', async () => {
      wrapper = mountComponent();
      expect(wrapper.find('[data-testid="open-mobile-menu-button"]').isVisible()).toBeTruthy();
      await wrapper.find('[data-testid="open-mobile-menu-button"]').trigger('click');
      await vi.waitUntil(() => wrapper!.find('[data-testid="close-mobile-menu-button"]').exists());

      await wrapper.find('[data-testid="close-mobile-menu-button"]').trigger('click');
      await vi.waitUntil(() => !wrapper!.find('[data-testid="close-mobile-menu-button"]').exists());
    });

    test('it closes on navigation', async () => {
      wrapper = mountComponent();
      await wrapper.find('[data-testid="person-management-menu-item"]').trigger('click');
      await nextTick();

      await vi.waitUntil(() => !wrapper!.find('[data-testid="close-mobile-menu-button"]').exists());

      expect(wrapper.find('[data-testid="open-mobile-menu-button"]').isVisible()).toBeTruthy();
      expect(wrapper.find('[data-testid="close-mobile-menu-button"]').exists()).toBeFalsy();
    });
  });
});
