import * as fileUtils from '@/utils/file';
import { mount, VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { nextTick, type Component } from 'vue';
import RollenerweiterungAssignErrorDialog from './RollenerweiterungAssignErrorDialog.vue';
import type { MappedRollenerweiterungAssignError, RollenerweiterungAssignErrorDialogProps } from './types';

let wrapper: VueWrapper | null = null;

const errorsMock: MappedRollenerweiterungAssignError[] = [
  { rolle: 'Admin', message: 'Fehlende Berechtigung' },
  { rolle: 'User', message: 'Unbekannter Fehler' },
];

const defaultProps: RollenerweiterungAssignErrorDialogProps = {
  isDialogVisible: true,
  filename: undefined,
  dstNr: '1234567',
  serviceProviderName: 'Test-Anbieter',
  errors: errorsMock,
};

beforeEach(() => {
  document.body.innerHTML = `
    <div>
      <div id="app"></div>
    </div>
  `;

  wrapper = mount(RollenerweiterungAssignErrorDialog, {
    attachTo: document.getElementById('app') || undefined,
    props: { ...defaultProps },
    global: {
      components: {
        RollenerweiterungAssignErrorDialog: RollenerweiterungAssignErrorDialog as Component,
      },
    },
  });
});

afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

describe('RollenerweiterungAssignErrorDialog.vue', () => {
  it('renders the error list correctly', async () => {
    await nextTick();

    const errorItems: NodeListOf<HTMLLIElement> = document.querySelectorAll('ol > li');
    expect(errorItems.length).toBe(errorsMock.length);

    expect(document.body.textContent).toContain('Fehlende Berechtigung');
    expect(document.body.textContent).toContain('Unbekannter Fehler');
  });

  it('closes the dialog when close button is clicked', async () => {
    await nextTick();

    const closeButton: HTMLElement = document.querySelector(
      '[data-testid="rollenerweiterung-error-discard-button"]',
    ) as HTMLElement;
    closeButton.click();
    await nextTick();

    const confirmationCloseButton: HTMLElement = document.querySelector(
      '[data-testid="confirm-close-bulk-error-dialog-button"]',
    ) as HTMLElement;
    confirmationCloseButton.click();
    await nextTick();

    expect(wrapper?.emitted('update:isDialogVisible')).toBeTruthy();
    expect(wrapper?.emitted('update:isDialogVisible')?.[0]).toEqual([false]);
  });

  it('downloads CSV when save button is clicked', async () => {
    const downloadSpy: MockInstance = vi.spyOn(fileUtils, 'download').mockImplementation(() => undefined);

    await nextTick();

    const saveButton: HTMLElement = document.querySelector(
      '[data-testid="rollenerweiterung-error-save-button"]',
    ) as HTMLElement;
    saveButton.click();
    await nextTick();

    expect(downloadSpy).toHaveBeenCalledTimes(1);
  });
});
