<script setup lang="ts">
  import { useAuthStore, type AuthStore } from '@/stores/AuthStore';
  import { useConfigStore, type ConfigStore } from '@/stores/ConfigStore';
  import { onMounted, ref, type ComputedRef, type Ref } from 'vue';
  import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';
  import { useDisplay } from 'vuetify';

  const router: Router = useRouter();
  const route: RouteLocationNormalizedLoaded = useRoute();

  const authStore: AuthStore = useAuthStore();
  const configStore: ConfigStore = useConfigStore();

  const menuDrawer: Ref<boolean> = ref(true);
  const { mobile }: { mobile: ComputedRef<boolean> } = useDisplay();

  function closeMenuOnMobile(): void {
    if (mobile.value) {
      menuDrawer.value = false;
    }
  }

  function handleMenuItemClick(nextRoute: string): void {
    if (route.path === nextRoute) {
      // If current route is the same as the route we're navigating to,
      // force a refresh by pushing the same route again
      router.push(nextRoute).then(() => {
        router.go(0);
      });
    } else {
      router.push(nextRoute);
    }
    closeMenuOnMobile();
  }

  onMounted(() => {
    menuDrawer.value = !mobile.value;
  });
</script>

<template>
  <v-btn
    :aria-label="$t('nav.openMobileMenu')"
    class="hidden-lg-and-up"
    data-testid="open-mobile-menu-button"
    density="compact"
    icon
    variant="text"
    @click.stop="menuDrawer = !menuDrawer"
  >
    <v-icon
      icon="mdi-menu"
      size="x-large"
    />
  </v-btn>
  <v-btn
    :aria-label="$t('nav.backToStart')"
    class="hidden-lg-and-up"
    data-testid="mobile-back-to-start-link"
    density="compact"
    icon
    to="/start"
    variant="text"
  >
    <v-icon
      class="hidden lg-and-up"
      icon="mdi-home"
      size="x-large"
    />
  </v-btn>

  <v-navigation-drawer
    v-model="menuDrawer"
    class="menu-bar"
    floating
    order="1"
    width="320"
  >
    <v-btn
      v-if="menuDrawer"
      :aria-label="$t('nav.closeMobileMenu')"
      class="hidden-lg-and-up primary menu-bar-close-button"
      data-testid="close-mobile-menu-button"
      density="compact"
      icon
      position="absolute"
      rounded="sm e-lg"
      variant="text"
      @click.stop="menuDrawer = !menuDrawer"
    >
      <v-icon
        icon="mdi-menu-open"
        size="x-large"
      />
    </v-btn>

    <!-- Title -->
    <v-list-item
      class="menu-bar-title"
      data-testid="menu-bar-title"
      :title="$t('nav.navigation')"
    />
    <v-divider />

    <!-- Back to start page -->
    <v-list-item
      class="menu-bar-back caption menu-bar-nav-item"
      data-testid="back-to-start-link"
      :title="$t('nav.backToStart')"
      to="/start"
    >
      <template #prepend>
        <v-icon
          icon="mdi-home"
          size="x-large"
        />
      </template>
    </v-list-item>

    <v-list-item
      class="menu-bar-faq caption menu-bar-nav-item"
      data-testid="faq-link"
      :title="$t('nav.faq')"
      href="https://medienberatung.iqsh.de/faq-administration-schulportal-sh.html"
      rel="noopener noreferrer"
      target="_blank"
    >
      <template #prepend>
        <v-icon
          icon="mdi-help-circle-outline"
          size="x-large"
        />
      </template>
    </v-list-item>
    <v-divider />

    <!-- Benutzerverwaltung -->
    <div v-if="authStore.hasPersonenverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="person-management-title"
        :title="$t('admin.person.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="person-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.person.showAll')"
        to="/admin/personen"
        @click="handleMenuItemClick('/admin/personen')"
      />
      <v-list-item
        v-if="authStore.hasPersonenAnlegenPermission"
        class="menu-bar-sub-item caption"
        data-testid="person-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.person.createNew')"
        to="/admin/personen/new"
        @click="closeMenuOnMobile"
      />
      <v-list-item
        v-if="authStore.hasImportPermission"
        class="menu-bar-sub-item caption"
        data-testid="person-import-menu-item"
        prepend-icon="mdi-file-upload-outline"
        :title="$t('admin.person.import')"
        to="/admin/personen/import"
        @click="handleMenuItemClick('/admin/personen/import')"
      />
    </div>

    <!-- Person Hinzufügen -->
    <div
      v-if="
        authStore.hasLandesbediensteteSuchenUndHinzufügenPermission ||
        authStore.hasEingeschränktNeueBenutzerErstellenPermission
      "
    >
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="person-add-title"
        :title="$t('admin.person.stateEmployeeSearch.addPerson')"
      />
      <v-list-item
        v-if="authStore.hasLandesbediensteteSuchenUndHinzufügenPermission"
        class="menu-bar-sub-item caption"
        data-testid="person-search-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.person.stateEmployeeSearch.searchAndAdd')"
        to="/admin/limited/personen/search"
        @click="closeMenuOnMobile"
      />
      <v-list-item
        v-if="authStore.hasEingeschränktNeueBenutzerErstellenPermission"
        class="menu-bar-sub-item caption"
        data-testid="person-add-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.person.stateEmployeeSearch.anotherPerson')"
        to="/admin/limited/personen/new"
        @click="closeMenuOnMobile"
      />
    </div>

    <!-- Klassenverwaltung -->
    <div v-if="authStore.hasKlassenverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="klasse-management-title"
        :title="$t('admin.klasse.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="klasse-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.klasse.showAll')"
        to="/admin/klassen"
        @click="handleMenuItemClick('/admin/klassen')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="klasse-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.klasse.createNew')"
        to="/admin/klassen/new"
        @click="closeMenuOnMobile"
      />
    </div>

    <!-- Rollenverwaltung -->
    <div v-if="authStore.hasRollenverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="rolle-management-title"
        :title="$t('admin.rolle.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="rolle-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.rolle.showAll')"
        to="/admin/rollen"
        @click="handleMenuItemClick('/admin/rollen')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="rolle-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.rolle.createNew')"
        to="/admin/rollen/new"
        @click="closeMenuOnMobile"
      />
      <v-list-item
        v-if="authStore.hasMptRollenVerwaltenPermission"
        class="menu-bar-sub-item caption"
        data-testid="mpt-rolle-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.rolle.mptManagement.menuItem')"
        to="/admin/rollen/mpt"
        @click="handleMenuItemClick('/admin/rollen/mpt')"
      />
    </div>

    <!-- Angebotsverwaltung -->
    <div
      v-if="
        authStore.hasAngeboteVerwaltenPermission ||
        authStore.hasRollenerweiternPermission ||
        authStore.hasEingeschränktAngeboteVerwaltenPermission
      "
    >
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="angebot-management-title"
        :title="$t('admin.angebot.management.title')"
      ></v-list-item>
      <v-list-item
        v-if="authStore.hasAngeboteVerwaltenPermission"
        class="menu-bar-sub-item caption"
        @click="handleMenuItemClick('/admin/angebote')"
        data-testid="angebot-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.angebot.showAll')"
        to="/admin/angebote"
      ></v-list-item>
      <v-list-item
        v-if="authStore.hasRollenerweiternPermission"
        class="menu-bar-sub-item caption"
        @click="handleMenuItemClick('/admin/angebote/schulspezifisch')"
        data-testid="angebot-display-schulspezifisch-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.angebot.showSchoolSpecific')"
        to="/admin/angebote/schulspezifisch"
      ></v-list-item>
      <v-list-item
        v-if="
          (authStore.hasAngeboteVerwaltenPermission || authStore.hasEingeschränktAngeboteVerwaltenPermission) &&
          configStore.configData?.schulischeAngeboteErstellen
        "
        class="menu-bar-sub-item caption"
        data-testid="angebot-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('angebot.createNew')"
        to="/admin/angebote/new"
        @click="closeMenuOnMobile"
      ></v-list-item>
    </div>

    <!-- Rollenverwaltung (MPT only) -->
    <div v-if="authStore.hasMptRollenVerwaltenPermission && !authStore.hasRollenverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="mpt-rolle-section-title"
        :title="$t('admin.rolle.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="mpt-rolle-management-only-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.rolle.mptManagement.menuItem')"
        to="/admin/rollen/mpt"
        @click="handleMenuItemClick('/admin/rollen/mpt')"
      />
    </div>

    <!-- Schulverwaltung -->
    <div v-if="authStore.hasSchulverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="schule-management-title"
        :title="$t('admin.schule.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="schule-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.schule.showAll')"
        to="/admin/schulen"
        @click="handleMenuItemClick('/admin/schulen')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="schule-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.schule.createNew')"
        to="/admin/schulen/new"
        @click="closeMenuOnMobile"
      />
    </div>
    <!-- Schulträgerverwaltung -->
    <div v-if="authStore.hasSchultraegerverwaltungPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="schultraeger-management-title"
        :title="$t('admin.schultraeger.management')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="schultraeger-management-menu-item"
        prepend-icon="mdi-format-list-bulleted"
        :title="$t('admin.schultraeger.showAll')"
        to="/admin/schultraeger"
        @click="handleMenuItemClick('/admin/schultraeger')"
      />
      <v-list-item
        class="menu-bar-sub-item caption"
        data-testid="schultraeger-creation-menu-item"
        prepend-icon="mdi-plus-circle-outline"
        :title="$t('admin.schultraeger.createNew')"
        to="/admin/schultraeger/new"
        @click="closeMenuOnMobile"
      />
    </div>
    <!-- Portalverwaltung -->
    <div v-if="authStore.hasPortalVerwaltungPermission && authStore.hasHinweiseBearbeitenPermission">
      <v-list-item
        class="menu-bar-main-item headline-2"
        data-testid="portal-management-title"
        :title="$t('admin.portal.management')"
      />
      <v-list-item
        v-if="authStore.hasHinweiseBearbeitenPermission"
        class="menu-bar-sub-item caption"
        data-testid="hinweise-edit-menu-item"
        prepend-icon="mdi-pencil"
        :title="$t('admin.portal.editHinweise')"
        to="/admin/hinweise/new"
        @click="closeMenuOnMobile"
      />
    </div>
  </v-navigation-drawer>
</template>

<style></style>
