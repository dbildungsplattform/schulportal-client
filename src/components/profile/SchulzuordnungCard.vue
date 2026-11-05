<script setup lang="ts">
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import { OrganisationsTyp } from '@/stores/OrganisationStore';
  import type { Zuordnung } from '@/stores/types/Zuordnung';
  import type { Option } from '@/types';
  import { adjustDateForTimezoneAndFormat } from '@/utils/date';
  import { computed, type ComputedRef } from 'vue';
  import { type Composer, useI18n } from 'vue-i18n';

  type Props = {
    // expected to be a single org or a schule with klassen
    zuordnungen: Zuordnung[];
    showNumber: boolean;
    // used to generate test ids
    index: number;
  };
  const props: Props = defineProps<Props>();

  const { t }: Composer = useI18n({ useScope: 'global' });

  const parentZuordnung: ComputedRef<Option<Zuordnung>> = computed(() => {
    if (props.zuordnungen.length === 1) {
      return props.zuordnungen[0];
    }
    return props.zuordnungen.find((z: Zuordnung) => z.typ === OrganisationsTyp.Schule);
  });

  const sskName: ComputedRef<Option<string>> = computed(() => parentZuordnung.value?.sskName);

  const klassen: ComputedRef<string> = computed(() => {
    return props.zuordnungen
      .filter((z: Zuordnung) => z.typ === OrganisationsTyp.Klasse)
      .map((z: Zuordnung) => z.sskName)
      .join(', ');
  });

  const rollen: ComputedRef<string> = computed(() => {
    const uniqueRollen: Set<string> = new Set(props.zuordnungen.map((z: Zuordnung) => z.rolle));
    return Array.from(uniqueRollen).join(', ');
  });

  const befristung: ComputedRef<string> = computed(() =>
    adjustDateForTimezoneAndFormat(props.zuordnungen.find((z: Zuordnung) => z.befristung)?.befristung ?? ''),
  );

  const sskDstNr: ComputedRef<Option<string>> = computed(() => parentZuordnung.value?.sskDstNr);

  const admins: ComputedRef<Option<string>> = computed(() => parentZuordnung.value?.admins.join(', '));

  const oneBasedIndex: ComputedRef<number> = computed(() => props.index + 1);

  const header: ComputedRef<string> = computed(() => {
    let text: string = t('person.zuordnung');
    if (props.showNumber) {
      text += ` ${oneBasedIndex.value}`;
    }
    return text;
  });
</script>

<template>
  <LayoutCard
    :header="header"
    :data-testid="`zuordnung-card-${oneBasedIndex}`"
    :headline-test-id="`zuordnung-card-${oneBasedIndex}-headline`"
  >
    <v-row class="ma-3 p-4">
      <v-col cols="12">
        <v-table class="text-body-large">
          <template #default>
            <tbody>
              <!-- schule -->
              <tr>
                <td>
                  <strong :data-testid="`schule-label-${oneBasedIndex}`"> {{ t('profile.schule') }}: </strong>
                </td>
                <td :data-testid="`schule-value-${oneBasedIndex}`">
                  {{ sskName }}
                </td>
              </tr>
              <!-- klasse -->
              <tr v-if="klassen">
                <td>
                  <strong :data-testid="`klasse-label-${oneBasedIndex}`"> {{ t('profile.klasse') }}: </strong>
                </td>
                <td :data-testid="`klasse-value-${oneBasedIndex}`">
                  {{ klassen }}
                </td>
              </tr>
              <!-- rolle -->
              <tr>
                <td>
                  <strong :data-testid="`rolle-label-${oneBasedIndex}`"> {{ t('admin.rolle.rolle') }}: </strong>
                </td>
                <td :data-testid="`rolle-value-${oneBasedIndex}`">
                  {{ rollen }}
                </td>
              </tr>
              <!-- dienstStellenNummer -->
              <tr v-if="sskDstNr">
                <td>
                  <span>
                    <abbr :title="t('profile.dienstStellenNummer')">
                      <strong :data-testid="`dienststellennummer-label-${oneBasedIndex}`">
                        {{ t('profile.dienstStellenNummerAbbr') }}:
                      </strong>
                    </abbr>
                  </span>
                </td>
                <td :data-testid="`dienststellennummer-value-${oneBasedIndex}`">
                  {{ sskDstNr }}
                </td>
              </tr>
              <!-- befristung -->
              <tr v-if="befristung">
                <td>
                  <strong :data-testid="`befristung-label-${oneBasedIndex}`"> {{ t('profile.limitedUntil') }}: </strong>
                </td>
                <td :data-testid="`befristung-value-${oneBasedIndex}`">
                  {{ befristung }}
                </td>
              </tr>
            </tbody>
          </template>
        </v-table>
        <p
          v-if="admins"
          class="pt-4 text-center text-body-large text-medium-emphasis"
          data-testid="schuladmins-info-text-with-icon"
          style="white-space: normal"
        >
          <v-icon
            class="mr-2"
            icon="mdi-information-slab-circle-outline"
            data-testid="schuladmins-info-icon"
          />
          <span data-testid="schulAdmins-info-text">
            {{ `${t('profile.yourSchuladminsAre')} ${admins}` }}
          </span>
        </p>
      </v-col>
    </v-row>
  </LayoutCard>
</template>
