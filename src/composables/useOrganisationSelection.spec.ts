import { useOrganisationStore, type Organisation, type OrganisationStore } from '@/stores/OrganisationStore';
import { DoFactory } from 'test/DoFactory';
import { effectScope, nextTick, ref, watch, type EffectScope, type Ref } from 'vue';
import { useOrganisationSelection } from './useOrganisationSelection';

describe('useOrganisationSelection', () => {
  let scope: EffectScope;
  let store: OrganisationStore;

  beforeEach(() => {
    scope = effectScope();
    store = useOrganisationStore();
    store.$reset();
  });

  afterEach(() => scope.stop());

  function createSelection(
    id: Ref<string | undefined>,
    initial: Ref<Organisation | undefined>,
  ): ReturnType<typeof useOrganisationSelection> {
    return scope.run(() => useOrganisationSelection(id, () => initial.value))!;
  }

  it('should display the initial object without updating the ID or requesting it', async () => {
    const organisation: Organisation = DoFactory.getSchule();
    const id: Ref<string | undefined> = ref(organisation.id);
    const onIdChange: (value: string | undefined) => void = vi.fn();
    scope.run(() => watch(id, onIdChange));
    const selection: ReturnType<typeof useOrganisationSelection> = createSelection(id, ref(organisation));
    await nextTick();

    expect(selection.value).toEqual(organisation);
    expect(onIdChange).not.toHaveBeenCalled();
    expect(store.getOrganisationById).not.toHaveBeenCalled();
    expect(store.loadOrganisationForSelection).not.toHaveBeenCalled();
  });

  it('should synchronize selection, clearing and resetting with the ID-backed field', async () => {
    const initial: Organisation = DoFactory.getSchule();
    const id: Ref<string | undefined> = ref(initial.id);
    const selection: ReturnType<typeof useOrganisationSelection> = createSelection(id, ref(initial));
    const next: Organisation = DoFactory.getSchule();

    selection.value = next;
    await nextTick();
    expect(id.value).toBe(next.id);
    expect(selection.value).toEqual(next);

    selection.value = null;
    await nextTick();
    expect(id.value).toBeUndefined();
    expect(selection.value).toBeUndefined();

    id.value = initial.id;
    await nextTick();
    expect(selection.value).toEqual(initial);
  });

  it('should invalidate a mismatched object without searching store collections', async () => {
    const initial: Organisation = DoFactory.getSchule();
    const unrelated: Organisation = DoFactory.getSchule();
    store.currentOrganisation = unrelated;
    store.allSchulen = [unrelated];
    const id: Ref<string | undefined> = ref(initial.id);
    const selection: ReturnType<typeof useOrganisationSelection> = createSelection(id, ref(initial));

    id.value = unrelated.id;
    expect(selection.value).toBeUndefined();
    await nextTick();
    expect(selection.value).toBeUndefined();
    expect(store.getOrganisationById).not.toHaveBeenCalled();

    id.value = undefined;
    await nextTick();
    expect(selection.value).toBeUndefined();
  });

  it('should accept an explicitly supplied object after its ID changes', async () => {
    const initial: Ref<Organisation | undefined> = ref();
    const organisation: Organisation = DoFactory.getSchule();
    const id: Ref<string | undefined> = ref(organisation.id);
    const selection: ReturnType<typeof useOrganisationSelection> = createSelection(id, initial);
    expect(selection.value).toBeUndefined();

    initial.value = organisation;
    await nextTick();
    expect(selection.value).toEqual(organisation);

    initial.value = DoFactory.getSchule();
    await nextTick();
    expect(selection.value).toEqual(organisation);
    expect(store.getOrganisationById).not.toHaveBeenCalled();
  });
});
