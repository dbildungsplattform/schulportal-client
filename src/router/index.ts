import type { FeatureFlagResponse } from '@/api-client/generated/api';
import { StepUpLevel, useAuthStore, type AuthStore } from '@/stores/AuthStore';
import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
import { useMasterDataStore, type MasterDataStore } from '@/stores/MasterDataStore';
import {
  useTwoFactorAuthentificationStore,
  type TwoFactorAuthentificationStore,
} from '@/stores/TwoFactorAuthentificationStore';
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import routes from './routes';

type Permission =
  | 'klassenverwaltung'
  | 'personenanlegen'
  | 'personenimport'
  | 'personenverwaltung'
  | 'rollenverwaltung'
  | 'mptrollenverwaltung'
  | 'angebotsverwaltung'
  | 'eingeschränktangebotsverwaltung'
  | 'schulspezifischeangebotsverwaltung'
  | 'schulverwaltung'
  | 'schultraegerverwaltung'
  | 'portalverwaltung'
  | 'hinweisebearbeiten'
  | 'landesbedienstetesuchenundhinzufügen'
  | 'limitedpersonenanlegen';

export type AppRoute = Omit<RouteRecordRaw, 'meta'> & {
  meta?: AppRouteMeta;
};
export type AppRouteMeta = {
  layout?: 'DefaultLayout' | 'AdminLayout';
  requiresAuth?: boolean;
  requiresOrga?: boolean;
  missingOrgaRedirect?: string | { name: string };
  requiredStepUpLevel?: StepUpLevel;
  requiresPermission?: Permission | Permission[];
  permissionMode?: 'any' | 'all';
  requiresFeatureFlag?: keyof FeatureFlagResponse;
  createType?: 'limited' | 'add-person-to-own-schule';
};

const router: Router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(
    _from: RouteLocationNormalized,
    _to: RouteLocationNormalized,
    savedPosition: { left?: number; top?: number } | null,
  ) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

function handleGoToPreviousPage(): void {
  const previousUrl: string | null = sessionStorage.getItem('previousUrl');
  router.push(previousUrl ?? '/start');
}

router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
  const meta: AppRouteMeta | undefined = to.meta as AppRouteMeta | undefined;
  const authStore: AuthStore = useAuthStore();
  const masterDataStore: MasterDataStore = useMasterDataStore();
  if (!authStore.isAuthenticated && !masterDataStore.isInitialized()) {
    await Promise.all([authStore.initializeAuthStatus(), masterDataStore.initialise()]);
  }
  if (!masterDataStore.isInitialized()) {
    await masterDataStore.initialise();
  }
  if (!authStore.isAuthenticated) {
    await authStore.initializeAuthStatus();
  }
  if (to.path !== '/profile' && to.path !== '/no-second-factor') {
    sessionStorage.setItem('previousUrl', to.path);
  }

  if (to.path === '/no-second-factor') {
    const personId: string | null | undefined = authStore.currentUser?.personId;
    if (!personId) {
      return false;
    }
    const twoFactorAuthentificationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
    await twoFactorAuthentificationStore.get2FAState(personId);
    if (twoFactorAuthentificationStore.hasToken) {
      handleGoToPreviousPage();
      return false;
    }
  }

  // Redirect authenticated users trying to access the login page to the start page
  if (to.path === '/' && authStore.isAuthenticated) {
    return { path: '/start' };
  }

  if (meta?.requiresAuth && !authStore.isAuthenticated) {
    window.location.href = `/api/auth/login?redirectUrl=${to.fullPath}`;
    return false;
  }

  // Redirect if orga query is missing on routes that require it
  if (meta?.requiresOrga && (!to.query['orga'] || typeof to.query['orga'] !== 'string')) {
    return meta?.missingOrgaRedirect ?? { name: 'angebot-management-schulspezifisch' };
  }

  if (meta?.requiredStepUpLevel === StepUpLevel.GOLD && authStore.acr !== StepUpLevel.GOLD) {
    const personId: string | null | undefined = authStore.currentUser?.personId;
    if (!personId) {
      return false;
    }
    const twoFactorAuthentificationStore: TwoFactorAuthentificationStore = useTwoFactorAuthentificationStore();
    await twoFactorAuthentificationStore.get2FAState(personId);
    if (!twoFactorAuthentificationStore.hasToken) {
      router.push(`/no-second-factor`);
      return false;
    }

    window.location.href = `/api/auth/login?redirectUrl=${to.fullPath}&requiredStepUpLevel=${StepUpLevel.GOLD}`;
    return false;
  }

  if (meta?.requiresPermission) {
    const requiredPermissions: Permission[] = Array.isArray(meta.requiresPermission)
      ? meta.requiresPermission
      : [meta.requiresPermission];

    const checkPermission = (permission: Permission): boolean => {
      switch (permission) {
        case 'personenverwaltung':
          return authStore.hasPersonenverwaltungPermission;
        case 'personenanlegen':
          return authStore.hasPersonenAnlegenPermission;
        case 'personenimport':
          return authStore.hasImportPermission;
        case 'klassenverwaltung':
          return authStore.hasKlassenverwaltungPermission;
        case 'rollenverwaltung':
          return authStore.hasRollenverwaltungPermission;
        case 'mptrollenverwaltung':
          return authStore.hasMptRollenVerwaltenPermission;
        case 'angebotsverwaltung':
          return authStore.hasAngeboteVerwaltenPermission;
        case 'eingeschränktangebotsverwaltung':
          return authStore.hasEingeschränktAngeboteVerwaltenPermission;
        case 'schulspezifischeangebotsverwaltung':
          return authStore.hasRollenerweiternPermission;
        case 'schulverwaltung':
          return authStore.hasSchulverwaltungPermission;
        case 'schultraegerverwaltung':
          return authStore.hasSchultraegerverwaltungPermission;
        case 'portalverwaltung':
          return authStore.hasPortalVerwaltungPermission;
        case 'hinweisebearbeiten':
          return authStore.hasHinweiseBearbeitenPermission;
        case 'landesbedienstetesuchenundhinzufügen':
          return authStore.hasLandesbediensteteSuchenUndHinzufügenPermission;
        case 'limitedpersonenanlegen':
          return authStore.hasEingeschränktNeueBenutzerErstellenPermission;
        default:
          return false;
      }
    };

    // 'any' = user needs at least one of the permissions (OR). Necessary for the create-angebot route, where admins with either 'angebotsverwaltung' or
    // 'eingeschränktangebotsverwaltung' should have access
    // default = user needs all of the permissions (AND)
    const hasPermission: boolean =
      meta?.permissionMode === 'any'
        ? requiredPermissions.some(checkPermission)
        : requiredPermissions.every(checkPermission);

    if (typeof meta?.requiresFeatureFlag === 'string') {
      const configStore: ConfigStore = useConfigStore();
      const flag: keyof FeatureFlagResponse = meta.requiresFeatureFlag;
      if (!configStore.configData?.[flag]) {
        return { path: '/not-found' };
      }
    }

    if (hasPermission) {
      return true;
    }

    return { path: '/not-found' };
  }

  return true;
});

export default router;
