import { useZuordnungEditMode, type ZuordnungEditMode } from './useZuordnungEditMode';

describe('useZuordnungEditMode', () => {
  let editMode: ZuordnungEditMode;

  beforeEach(() => {
    editMode = useZuordnungEditMode();
  });

  test('it starts without an active operation', () => {
    expect(editMode.isFormActive.value).toBe(false);
    expect(editMode.hasPendingChange.value).toBe(false);
    expect(editMode.pendingOperation.value).toBeUndefined();
  });

  test('it tells the form and the pending change of an operation apart', () => {
    const creation: ReturnType<ZuordnungEditMode['forOperation']> = editMode.forOperation('creation');

    creation.showForm();
    expect(creation.isFormActive.value).toBe(true);
    expect(editMode.isFormActive.value).toBe(true);
    expect(editMode.hasPendingChange.value).toBe(false);

    creation.showReview();
    expect(creation.isFormActive.value).toBe(false);
    expect(editMode.pendingOperation.value).toBe('creation');
    expect(editMode.hasPendingChange.value).toBe(true);
  });

  test('it only has one active operation at a time', () => {
    const creation: ReturnType<ZuordnungEditMode['forOperation']> = editMode.forOperation('creation');
    const deletion: ReturnType<ZuordnungEditMode['forOperation']> = editMode.forOperation('deletion');

    creation.showForm();
    deletion.showReview();

    expect(creation.isFormActive.value).toBe(false);
    expect(editMode.pendingOperation.value).toBe('deletion');
  });

  test('it only ends an operation that is active and can be reset', () => {
    const creation: ReturnType<ZuordnungEditMode['forOperation']> = editMode.forOperation('creation');
    const deletion: ReturnType<ZuordnungEditMode['forOperation']> = editMode.forOperation('deletion');

    deletion.showReview();
    creation.end();
    expect(editMode.pendingOperation.value).toBe('deletion');

    deletion.end();
    expect(editMode.hasPendingChange.value).toBe(false);

    creation.showForm();
    editMode.reset();
    expect(editMode.isFormActive.value).toBe(false);
  });
});
