import PersonenkontextItem from '@/components/admin/personen/details/PersonenkontextItem.vue';
import { adjustDateForTimezoneAndFormat } from '@/utils/date';
import { mount, type VueWrapper } from '@vue/test-utils';
import { DoFactory } from 'test/DoFactory';
import { PendingState, type Props } from './PersonenkontextItem.types';
import type { Zuordnung } from '@/stores/types/Zuordnung';
import type { Component } from 'vue';

function mountComponent(props: Props): VueWrapper<InstanceType<typeof PersonenkontextItem>> {
  return mount(PersonenkontextItem, {
    attachTo: document.getElementById('app') || '',
    props,
    global: {
      components: {
        PersonenkontextItem: PersonenkontextItem as Component,
      },
    },
  });
}
beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;
});

describe('PersonenkontextItem', () => {
  describe.each([[true], [false]])('when zuordnung hasDstNr=%s', (hasDstNr: boolean) => {
    it('renders correctly', () => {
      const zuordnung: Zuordnung = DoFactory.getZuordnung();
      if (hasDstNr === false) {
        zuordnung.sskDstNr = null;
      }
      const klasse: string = DoFactory.getKlasse().name;
      const props: Props = {
        zuordnung: Object.assign(zuordnung, { klasse }),
        pendingState: undefined,
      };
      const wrapper: VueWrapper = mountComponent(props) as VueWrapper;
      expect(wrapper.text()).toContain(zuordnung.sskName.substring(0, 30));
      if (zuordnung.sskDstNr) {
        expect(wrapper.text()).toContain(zuordnung.sskDstNr);
      }
      expect(wrapper.text()).toContain(zuordnung.rolle);
      expect(wrapper.text()).toContain(klasse);
    });
  });

  it('truncates long sskName', () => {
    const zuordnung: Zuordnung = DoFactory.getZuordnung();
    zuordnung.sskName = 'A'.repeat(31); // 31 characters long
    const props: Props = {
      zuordnung,
      pendingState: undefined,
    };
    const wrapper: VueWrapper = mountComponent(props) as VueWrapper;
    expect(wrapper.text()).toContain('A'.repeat(30));
    expect(wrapper.text()).toContain('...');
    expect(wrapper.text()).not.toContain('A'.repeat(31)); // Should not show the 31st character
  });

  describe.each([[PendingState.CREATED], [PendingState.DELETED], [undefined]])(
    'when pendingState is %s',
    (pendingState: PendingState | undefined) => {
      describe.each([[true], [false]])('when zuordnung hasBefristung=%s', (hasBefristung: boolean) => {
        it('correctly shows conditional text', () => {
          const zuordnung: Zuordnung = DoFactory.getZuordnung();
          if (hasBefristung === false) {
            zuordnung.befristung = null;
          }
          const props: Props = {
            zuordnung,
            pendingState,
          };
          const wrapper: VueWrapper = mountComponent(props) as VueWrapper;
          if (hasBefristung) {
            expect(wrapper.text()).toContain(adjustDateForTimezoneAndFormat(zuordnung.befristung!));
          } else {
            if (pendingState === PendingState.CREATED) {
              expect(wrapper.text()).toContain('wird hinzugefügt');
            }
            if (pendingState === PendingState.DELETED) {
              expect(wrapper.text()).toContain('wird entfernt');
            }
          }
        });
      });

      it('correctly applies classes', () => {
        const zuordnung: Zuordnung = DoFactory.getZuordnung();
        const props: Props = {
          zuordnung,
          pendingState,
        };
        const wrapper: VueWrapper = mountComponent(props) as VueWrapper;

        if (pendingState === PendingState.CREATED) {
          expect(wrapper.classes()).toContain('text-green');
        }
        if (pendingState === PendingState.DELETED) {
          expect(wrapper.classes()).toContain('text-red');
        }
        if (pendingState === undefined) {
          expect(wrapper.classes()).not.toEqual(expect.arrayContaining(['text-green', 'text-red']));
        }
      });
    },
  );

  describe.each([[true], [false]])('when showUnlimitedBefristung is %s', (showUnlimitedBefristung: boolean) => {
    it('correctly shows text', () => {
      const zuordnung: Zuordnung = DoFactory.getZuordnung();
      zuordnung.befristung = null;
      const props: Props = {
        zuordnung,
        pendingState: undefined,
        showUnlimitedBefristung,
      };
      const wrapper: VueWrapper = mountComponent(props) as VueWrapper;

      if (showUnlimitedBefristung) {
        expect(wrapper.text()).toContain('Unbefristet');
      } else {
        expect(wrapper.text()).not.toContain('Unbefristet');
      }
    });
  });

  describe.each([[true], [false]])('when noMargin is %s', (noMargin: boolean) => {
    it('correctly applies classes', () => {
      const zuordnung: Zuordnung = DoFactory.getZuordnung();
      const props: Props = {
        zuordnung,
        pendingState: undefined,
        noMargin,
      };
      const wrapper: VueWrapper = mountComponent(props) as VueWrapper;

      if (noMargin) {
        expect(wrapper.classes()).not.toEqual(expect.arrayContaining(['my-3', 'ml-5']));
      } else {
        expect(wrapper.classes()).toEqual(expect.arrayContaining(['my-3', 'ml-5']));
      }
    });
  });
});
