<script setup lang="ts">
  import { ImportDataItemStatus, RollenSystemRechtEnum } from '@/api-client/generated';
  import SpshAlert from '@/components/alert/SpshAlert.vue';
  import LayoutCard from '@/components/cards/LayoutCard.vue';
  import SchulenFilter from '@/components/filter/SchulenFilter.vue';
  import FormRow from '@/components/form/FormRow.vue';
  import FormWrapper from '@/components/form/FormWrapper.vue';
  import { useImportStore, type ImportedUserResponse, type ImportStore } from '@/stores/ImportStore';
  import { RollenArt, useRolleStore, type RolleResponse, type RolleStore } from '@/stores/RolleStore';
  import type { TranslatedObject } from '@/types';
  import { toTypedSchema } from '@vee-validate/yup';
  import { useForm, type BaseFieldProps, type FormContext, type TypedSchema } from 'vee-validate';
  import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';
  import {
    onBeforeRouteLeave,
    useRouter,
    type NavigationGuardNext,
    type RouteLocationNormalized,
    type Router,
  } from 'vue-router';
  import { useDisplay } from 'vuetify';
  import { mixed, object, string } from 'yup';

  const importStore: ImportStore = useImportStore();
  const rolleStore: RolleStore = useRolleStore();

  const router: Router = useRouter();
  const { t }: Composer = useI18n({ useScope: 'global' });
  const { smAndDown }: { smAndDown: Ref<boolean> } = useDisplay();

  const confirmationDialogVisible: Ref<boolean> = ref(false);

  const isDownloadingFile: Ref<boolean> = ref(false);

  const validationSchema: TypedSchema = toTypedSchema(
    object({
      selectedSchule: string().required(t('admin.import.rules.schule.required')),
      selectedRolle: string().required(t('admin.import.rules.rolle.required')),
      selectedFiles: mixed().required(t('admin.import.rules.files.required')),
    }),
  );

  const vuetifyConfig = (state: {
    errors: Array<string>;
  }): { props: { error: boolean; 'error-messages': Array<string> } } => ({
    props: {
      error: !!state.errors.length,
      'error-messages': state.errors,
    },
  });

  type PersonImportForm = {
    selectedSchule: string | undefined;
    selectedRolle: string;
    selectedFiles: Array<File>;
  };

  const formContext: FormContext<PersonImportForm, PersonImportForm> = useForm<PersonImportForm>({
    validationSchema,
  });

  const [selectedSchule, selectedSchuleProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedSchule', vuetifyConfig);

  const [selectedRolle, selectedRolleProps]: [
    Ref<string | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedRolle', vuetifyConfig);

  const [selectedFile, selectedFilesProps]: [
    Ref<File | undefined>,
    Ref<BaseFieldProps & { error: boolean; 'error-messages': Array<string> }>,
  ] = formContext.defineField('selectedFiles', vuetifyConfig);

  const lernRollen: ComputedRef<TranslatedObject[] | undefined> = computed(() => {
    return rolleStore.allRollen
      .map((rolle: RolleResponse) => ({
        value: rolle.id,
        title: rolle.name,
      }))
      .sort((a: TranslatedObject, b: TranslatedObject) => a.title.localeCompare(b.title));
  });

  watch(selectedSchule, async (newValue: string | undefined, oldValue: string | undefined) => {
    if (newValue && newValue !== oldValue) {
      // Fetch rollen after selecting the organization
      await rolleStore.getAllRollen({
        organisationContextForOperation: newValue,
        systemrechte: [RollenSystemRechtEnum.ImportDurchfuehren],
        rollenarten: [RollenArt.Lern],
      });

      // Reset the selectedRolle field only if oldValue was not undefined
      if (oldValue !== undefined) {
        selectedRolle.value = undefined;
      }
    } else if (!newValue) {
      // If the organization is cleared, reset selectedRolle
      selectedRolle.value = undefined;
    }

    importStore.uploadResponse = null;
  });

  watch(selectedFile, (newValue: File | undefined, oldValue: File | undefined) => {
    if (newValue && newValue !== oldValue) {
      importStore.uploadResponse = null;
    }
  });

  const showUploadSuccessTemplate: ComputedRef<boolean> = computed(() => {
    return (
      (importStore.uploadResponse?.isValid as boolean) &&
      !importStore.importResponse &&
      !importStore.uploadIsLoading &&
      !importStore.importIsLoading &&
      !importStore.errorCode &&
      importStore.importProgress === 0
    );
  });

  const totalImportItems: ComputedRef<number> = computed(() => {
    return importStore.uploadResponse?.totalImportDataItems as number;
  });

  function clearSelectedRolle(): void {
    selectedRolle.value = undefined;
  }

  function navigateToPersonTable(): void {
    formContext.resetForm();
    importStore.errorCode = null;
    importStore.uploadResponse = null;
    importStore.importResponse = null;
    importStore.importProgress = 0;
    router.push({ name: 'person-management' });
  }

  function convertToUTF8(buffer: ArrayBuffer): string {
    // Try decoding as UTF-8 first
    const utf8Decoder: TextDecoder = new TextDecoder('utf-8', { fatal: false });
    const utf8Text: string = utf8Decoder.decode(buffer);

    // If decoding as UTF-8 doesn't result in invalid characters
    if (utf8Text && !utf8Text.includes('�')) {
      return utf8Text;
    }

    // Try other encodings (Windows-1252, ISO-8859-1, etc.)
    const encodingsToTry: string[] = ['windows-1252', 'iso-8859-1', 'utf-16', 'utf-16le', 'utf-16be'];

    for (const encoding of encodingsToTry) {
      try {
        const decoder: TextDecoder = new TextDecoder(encoding, { fatal: true });
        const decodedText: string = decoder.decode(buffer);
        // If it successfully decodes without errors, return the decoded text
        return decodedText;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If the decoding fails, continue with the next encoding
        continue;
      }
    }

    // If all decoding attempts fail, return a fallback (perhaps empty string or an error message)
    throw new Error('Unable to decode file using known encodings.');
  }

  // Reads the file and converts it to UTF-8
  function readFileAsUTF8(file: File): Promise<string> {
    return new Promise((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void) => {
      const reader: FileReader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>): void => {
        try {
          // Convert from unknown encoding to UTF-8
          const utf8Text: string = convertToUTF8(event.target?.result as ArrayBuffer);
          resolve(utf8Text);
        } catch (error) {
          if (error instanceof Error) {
            reject(error);
          } else {
            reject(new Error('An unknown error occurred during file reading.'));
          }
        }
      };

      reader.onerror = (): void => reject(new Error(`File reading error`));

      // Read the file as ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  }

  async function uploadFile(): Promise<void> {
    if (selectedSchule.value === undefined || selectedRolle.value === undefined || selectedFile.value === undefined) {
      return;
    }

    const originalFile: File = selectedFile.value;

    // Read the file content and convert to UTF-8
    const fileText: string = await readFileAsUTF8(originalFile);

    // Create a new File object with UTF-8 encoded content
    const utf8Blob: Blob = new Blob(['\uFEFF' + fileText], { type: 'text/csv;charset=utf-8' });
    const utf8File: File = new File([utf8Blob], originalFile.name, { type: 'text/csv;charset=utf-8' });

    // Update selected files with the UTF-8 version
    selectedFile.value = utf8File;
    // Perform the upload with the UTF-8 encoded file
    await importStore.uploadPersonenImportFile(selectedSchule.value, selectedRolle.value, utf8File);
  }

  function anotherImport(): void {
    importStore.errorCode = '';
    importStore.uploadResponse = null;
    importStore.importResponse = null;
    importStore.importProgress = 0;
    formContext.resetForm();
  }

  function backToUpload(): void {
    importStore.errorCode = null;
    importStore.uploadResponse = null;
    importStore.importResponse = null;
  }

  function cancelImport(): void {
    backToUpload();
    confirmationDialogVisible.value = false;
  }

  function openConfirmationDialog(): void {
    confirmationDialogVisible.value = true;
  }

  async function executeImport(): Promise<void> {
    confirmationDialogVisible.value = false;
    const importvorgangId: string = importStore.uploadResponse?.importvorgangId as string;

    await importStore.executePersonenImport(importvorgangId);

    // Only start polling if the execution was successful (no error)
    if (!importStore.errorCode) {
      importStore.startImportStatusPolling(importvorgangId);
    }
  }

  function downloadFileContent(fileContent: string): void {
    const blob: Blob = new Blob([fileContent], { type: 'text/txt' });
    const url: string = window.URL.createObjectURL(blob);

    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${t('admin.import.fileName.person')}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  }

  function createFileContentFromUsers(users: ImportedUserResponse[]): string {
    const successfulUsers: ImportedUserResponse[] = users.filter(
      (user: ImportedUserResponse) => user.status === ImportDataItemStatus.Success,
    );
    const failedUsers: ImportedUserResponse[] = users.filter(
      (user: ImportedUserResponse) => user.status === ImportDataItemStatus.Failed,
    );

    /**
     * make sure every (non-empty) line contains the correct amount of semicolons, otherwise the excel-data-import will not recognize the format
     */

    let fileContent: string = `Schule:;${importStore.importResponse?.organisationsname};Rolle:;${importStore.importResponse?.rollenname};`;
    fileContent += `\n\n${t('admin.import.successfullyImportedUsersNotice')};;;;\n\n`;
    fileContent += 'Klasse;Vorname;Nachname;Benutzername;Passwort\n';

    successfulUsers.forEach((user: ImportedUserResponse) => {
      fileContent += `${user.klasse};${user.vorname};${user.nachname};${user.benutzername};${user.startpasswort}\n`;
    });

    if (failedUsers.length > 0) {
      fileContent += `\n\n${t('admin.import.failedToImportUsersNotice')};;;;\n\n`;
      fileContent += 'Klasse;Vorname;Nachname;Benutzername;\n';

      failedUsers.forEach((user: ImportedUserResponse) => {
        fileContent += `${user.klasse};${user.vorname};${user.nachname};${user.benutzername};\n`;
      });
    }

    return fileContent;
  }

  async function downloadFile(): Promise<void> {
    isDownloadingFile.value = true;
    try {
      const totalUsers: number = importStore.importResponse?.total as number;
      const itemsPerPage: number = importStore.importedUsersPerPage;
      const totalPagesNumber: number = Math.ceil(totalUsers / itemsPerPage);

      let allImportedUsers: ImportedUserResponse[] = [];

      for (let pageIndex: number = 0; pageIndex < totalPagesNumber; pageIndex++) {
        const offset: number = pageIndex * itemsPerPage;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve: (value: unknown) => void) => {
          setTimeout(resolve, pageIndex * 600);
        });

        // eslint-disable-next-line no-await-in-loop
        await importStore.getImportedPersons(
          importStore.uploadResponse?.importvorgangId as string,
          offset,
          itemsPerPage,
        );

        allImportedUsers = allImportedUsers.concat(importStore.importResponse?.importedUsers || []);
      }

      const fileContent: string = createFileContentFromUsers(allImportedUsers);
      downloadFileContent(fileContent);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // While downloading the file, it could happen that some users can't be downloaded even though they were imported successfully...
      // In that case it makes sense to ignore errors and just go forward with the other users for better usability.
      importStore.errorCode = '';
    } finally {
      isDownloadingFile.value = false;
    }
  }

  const onSubmit: (e?: Event) => Promise<void | undefined> = formContext.handleSubmit(() => {
    uploadFile();
  });

  function isFormDirty(): boolean {
    // Form dirtiness check only if the import was not executed yet
    if (importStore.importProgress === 0) {
      return (
        formContext.isFieldDirty('selectedSchule') ||
        formContext.isFieldDirty('selectedRolle') ||
        formContext.isFieldDirty('selectedFiles')
      );
    }
    return false;
  }
  const showUnsavedChangesDialog: Ref<boolean> = ref(false);
  let blockedNext: () => void = () => {
    /* empty */
  };

  function handleConfirmUnsavedChanges(): void {
    blockedNext();
    importStore.errorCode = '';
  }

  function preventNavigation(event: BeforeUnloadEvent): void {
    if (!isFormDirty()) {
      return;
    }
    event.preventDefault();
    /* Chrome requires returnValue to be set. */
    event.returnValue = '';
  }

  function updateSelectedSchule(id: string | undefined): void {
    formContext.setFieldValue('selectedSchule', id);
  }

  onBeforeRouteLeave((_to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    if (isFormDirty()) {
      showUnsavedChangesDialog.value = true;
      blockedNext = next;
    } else {
      // Delete the Imported items once the user leaves the page
      if (importStore.importResponse) {
        const importvorgangId: string = importStore.uploadResponse?.importvorgangId as string;
        importStore.deleteImportVorgangById(importvorgangId);
      }
      importStore.uploadResponse = null;
      importStore.importResponse = null;
      next();
    }
  });

  onMounted(async () => {
    await rolleStore.getAllRollen({
      systemrechte: [RollenSystemRechtEnum.ImportDurchfuehren],
      rollenarten: [RollenArt.Lern],
    });
    importStore.uploadResponse = null;
    importStore.importResponse = null;
    importStore.importProgress = 0;
    /* listen for browser changes and prevent them when form is dirty */
    window.addEventListener('beforeunload', preventNavigation);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', preventNavigation);
  });
</script>

<template>
  <div class="admin">
    <h1
      class="text-center headline"
      data-testid="admin-headline"
    >
      {{ $t('admin.headline') }}
    </h1>
    <LayoutCard
      :closable="true"
      :header="$t('admin.person.import')"
      headlineTestId="person-import-headline"
      @onCloseClicked="navigateToPersonTable"
      :padded="true"
      :showCloseText="true"
    >
      <!-- Import success template -->
      <template v-if="importStore.importProgress === 100 && !importStore.importIsLoading && !isDownloadingFile">
        <v-container>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                color="#1EAE9C"
                icon="mdi-check-circle"
                small
              />
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col
              class="subtitle-1"
              cols="auto"
            >
              <span data-testid="person-import-success-text">
                {{ $t('admin.import.importedSuccessfully') }}
              </span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-btn
                class="secondary"
                data-testid="another-import-button"
                @click="anotherImport"
              >
                {{ $t('admin.import.anotherImport') }}
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn
                class="primary"
                data-testid="download-all-data-button"
                :disabled="importStore.importIsLoading || importStore.retrievalIsLoading"
                @click="downloadFile"
              >
                {{ $t('admin.import.downloadUserdata') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </template>

      <template v-else-if="isDownloadingFile">
        <v-container>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                class="mr-2"
                icon="mdi-alert-circle-outline"
                size="small"
              />
              <span class="subtitle-2">
                {{ $t('admin.import.doNotCloseNoticeDownload') }}
              </span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-progress-circular
                data-testid="loading-spinner"
                indeterminate
              />
            </v-col>
          </v-row>
        </v-container>
      </template>

      <!-- Import loading template -->
      <template v-if="importStore.importProgress > 0 && !importStore.errorCode">
        <v-container>
          <v-row
            v-if="importStore.importProgress > 0 && importStore.importProgress !== 100"
            class="justify-center"
          >
            <v-col cols="auto">
              <v-icon
                aria-hidden="true"
                class="mr-2"
                icon="mdi-alert-circle-outline"
                size="small"
              />
              <span class="subtitle-2">
                {{ $t('admin.import.doNotCloseNoticeImport') }}
              </span>
            </v-col>
          </v-row>
          <v-row class="justify-center">
            <v-col cols="12">
              <v-progress-linear
                data-testid="import-progress-bar"
                :model-value="importStore.importProgress"
                color="primary"
                height="25"
              >
                <template #default="{ value }">
                  <strong class="text-white">{{ Math.ceil(value) }}%</strong>
                </template>
              </v-progress-linear>
            </v-col>
          </v-row>
        </v-container>
      </template>

      <!-- Upload form -->
      <FormWrapper
        v-if="importStore.importProgress === 0"
        id="person-import-form"
        :confirm-unsaved-changes-action="handleConfirmUnsavedChanges"
        :create-button-label="$t('admin.import.uploadFile')"
        :discard-button-label="$t('nav.backToList')"
        :hide-actions="
          showUploadSuccessTemplate ||
          !!importStore.importResponse ||
          importStore.importIsLoading ||
          !!importStore.errorCode
        "
        :is-loading="importStore.uploadIsLoading"
        :on-discard="navigateToPersonTable"
        :on-submit="onSubmit"
        :show-unsaved-changes-dialog="showUnsavedChangesDialog"
        @on-show-dialog-change="(value?: boolean) => (showUnsavedChangesDialog = value || false)"
      >
        <!-- Error Message Display for error messages from the ImportStore -->
        <SpshAlert
          :model-value="!!importStore.errorCode"
          :title="$t('admin.import.uploadErrorTitle')"
          :type="'error'"
          :closable="false"
          :show-button="true"
          :button-text="$t('admin.import.backToUpload')"
          :button-action="backToUpload"
          :text="$t(`admin.import.errors.${importStore.errorCode}`)"
        />
        <!-- Upload success template -->
        <template v-if="showUploadSuccessTemplate">
          <v-container>
            <v-row class="justify-center">
              <v-col cols="auto">
                <v-icon
                  aria-hidden="true"
                  color="#1EAE9C"
                  icon="mdi-check-circle"
                  small
                />
              </v-col>
            </v-row>
            <v-row class="justify-center">
              <v-col
                class="subtitle-1"
                cols="auto"
              >
                <span data-testid="person-upload-success-text">
                  {{ $t('admin.import.uploadedSuccessfully') }}
                  {{ $t('admin.import.recordsReadyForImport', { count: totalImportItems }) }}
                </span>
              </v-col>
            </v-row>
            <v-row class="justify-center">
              <v-col cols="auto">
                <v-btn
                  class="secondary"
                  data-testid="back-to-upload-button"
                  @click="backToUpload"
                >
                  {{ $t('admin.import.backToUpload') }}
                </v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn
                  class="primary"
                  data-testid="open-confirmation-dialog-button"
                  @click="openConfirmationDialog"
                >
                  {{ $t('admin.import.executeImport') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </template>

        <!-- Actual form -->
        <template
          v-if="
            !showUploadSuccessTemplate &&
            !importStore.importResponse &&
            !importStore.importIsLoading &&
            !importStore.errorCode
          "
        >
          <!-- Schulauswahl -->
          <FormRow
            :error-label="selectedSchuleProps['error']"
            :is-required="true"
            label-for-id="schule-select"
            :label="$t('admin.schule.schule')"
          >
            <SchulenFilter
              :multiple="false"
              parent-id="person-import"
              :placeholder-text="t('admin.schule.selectSchule')"
              :selected-schule-props="selectedSchuleProps"
              :selected-schulen="selectedSchule"
              @update:selected-schulen="updateSelectedSchule"
              ref="schulFilter"
            />
          </FormRow>

          <!-- Rollenauswahl (currently limited to SuS) -->
          <FormRow
            :error-label="selectedRolleProps['error']"
            label-for-id="rolle-select"
            :is-required="true"
            :label="$t('admin.rolle.rolle')"
          >
            <v-autocomplete
              id="rolle-select"
              ref="rolle-select"
              v-bind="selectedRolleProps"
              v-model="selectedRolle"
              autocomplete="off"
              clearable
              data-testid="rolle-select"
              density="compact"
              :items="lernRollen"
              item-value="value"
              item-text="title"
              :no-data-text="$t('noDataFound')"
              :placeholder="$t('admin.rolle.selectRolle')"
              required="true"
              variant="outlined"
              @click:clear="clearSelectedRolle"
            />
          </FormRow>

          <!-- File Upload -->
          <FormRow
            :error-label="selectedFilesProps['error']"
            :is-required="true"
            label-for-id="file-upload"
            :label="$t('admin.import.uploadFile')"
          >
            <v-file-input
              v-model="selectedFile"
              accept=".csv"
              data-testid="file-input"
              :label="$t('admin.import.selectOrDropFile')"
              prepend-icon=""
              prepend-inner-icon="mdi-paperclip"
              variant="outlined"
              v-bind="selectedFilesProps"
            />
          </FormRow>
        </template>

        <!-- Invalid data template -->
        <template v-if="importStore.uploadResponse?.totalInvalidImportDataItems">
          <v-alert
            class="border-md mt-4"
            data-testid="invalid-import-data-alert"
            type="error"
            variant="outlined"
          >
            <v-row>
              <v-col
                class="primary-text-color"
                cols="auto"
              >
                <strong data-testid="import-errors-title">{{ $t('admin.import.errors.followingDataInvalid') }}</strong>
              </v-col>
            </v-row>
            <v-row
              v-for="(invalidItem, index) in importStore.uploadResponse.invalidImportDataItems"
              :key="index"
              class="invalid-items"
              :data-testid="`invalid-item-row-${index + 1}`"
              density="compact"
            >
              <v-col
                class="primary-text-color"
                cols="3"
              >
                <span data-testid="invalid-item-nachname">{{ invalidItem.nachname }}</span>
              </v-col>
              <v-col
                class="primary-text-color"
                cols="3"
              >
                <span data-testid="invalid-item-vorname">{{ invalidItem.vorname }}</span>
              </v-col>
              <v-col
                class="primary-text-color"
                cols="1"
              >
                <span data-testid="invalid-item-klasse">{{ invalidItem.klasse }}</span>
              </v-col>
              <v-col
                class="primary-text-color"
                cols="5"
              >
                <span
                  v-for="(error, index) in invalidItem.validationErrors"
                  :key="index"
                  data-testid="invalid-item-errors"
                >
                  {{ $t(`admin.import.errors.${error}`)
                  }}{{ index < invalidItem.validationErrors.length - 1 ? ', ' : '' }}
                </span>
              </v-col>
            </v-row>
          </v-alert>
        </template>
      </FormWrapper>
    </LayoutCard>
  </div>
  <v-dialog
    v-model="confirmationDialogVisible"
    persistent
  >
    <LayoutCard
      v-if="confirmationDialogVisible"
      :closable="false"
      :header="$t('admin.person.import')"
    >
      <v-card-text>
        <v-container>
          <v-row class="text-body bold ml-2">
            <v-col class="text-center">
              <span data-testid="person-import-confirmation-text">
                {{ $t('admin.import.confirmationText') }}
              </span>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-row class="justify-center">
          <v-col
            cols="12"
            sm="6"
            md="4"
          >
            <v-btn
              :block="smAndDown"
              class="secondary"
              data-testid="cancel-import-button"
              @click="cancelImport()"
            >
              {{ $t('cancel') }}
            </v-btn>
          </v-col>
          <v-col
            cols="12"
            sm="6"
            md="4"
          >
            <v-btn
              :block="smAndDown"
              class="primary"
              data-testid="execute-import-button"
              :disabled="importStore.importIsLoading"
              @click="executeImport()"
            >
              {{ $t('admin.import.executeImport') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </LayoutCard>
  </v-dialog>
</template>

<style lang="scss" scoped>
  .invalid-items {
    font-size: 16px;
  }
</style>
