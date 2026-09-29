# schulportal-client

## Install dependencies

```sh
npm install
```

### Compile for dev with hot reload

```sh
npm run dev
```

### Compile for prod

```sh
npm run build
```

### Run ESLint

```sh
npm run lint
```

### Run Prettier

```sh
npm run format
```

### Run Tests with Istanbul Coverage

```sh
npm run coverage
```

## AI Agents and MCP

### Copilot Instructions

The file `.github/copilot-instructions.md` in this repository is just a **placeholder**.
A Symlink has been created to use AGENTS.md as routing entry point and should work on every other computer after cloning the repo.

If the symlink should not work, re-create it with this command:
```bash
cd .github
rm copilot-instructions.md
ln -s ../AGENTS.md copilot-instructions.md
```

> **Why Symlink?** GitHub Copilot reads `.github/copilot-instructions.md` automatically.
> `AGENTS.md` is used by the Copilot Coding Agent and CLI as entry point.
> The Symlink ensures that both use the same file.

### Agent routing
`AGENTS.md` is the mandatory entry point for every AI coding session. It routes requests to specialized instruction files under `.github/.instructions/`:

| Topic | Instruction file |
|---|---|
| Frontend / Vue / Vuetify / Pinia | `frontend_agent.md` |
| Tests / Vitest / DoFactory | `testing_agent.md` |
| Code review / refactoring | `review_agent.md` |
| DevOps / CI / Docker / Helm | `devops_agent.md` |


### Jira MCP server
A Jira MCP server is configured in `.vscode/mcp.json` using [mcp-atlassian](https://github.com/sooperset/mcp-atlassian). It runs in read-only mode and gives Copilot direct access to ticket data without leaving the editor.

Since the .vscode folder is ignored by Git, an example for the MCP config lies in `mcp.json.example`

**Setup:**
1. Create `.env.mcp` in the workspace root (ignored by Git as well).
2. Populate it with Jira URL and your Jira PAT (Personal Access Token):
  ```
  JIRA_URL=https://jira.example.com
  JIRA_PAT=your_personal_access_token_here
  ```
3. Install `uvx` locally on your system, if not present.
4. Start the MCP server

**Usage:** In Agent mode only, reference a ticket by key (e.g. `SPSH-1234`) and Copilot will fetch the current ticket data via the MCP tool.

## Start backend locally

## Locally generate API
1. Java Runtime Environment lokal installieren
2. `npm run generate-client` ausführen
3. api.ts wird generiert und beinhaltet alle Controller für die spezifizierten Endpunkte


### Package (Create Docker Image )
If you push a tag upstream a container will be created for you. (Check Github under Packages)

ghcr.io/dbildungsplattform/schulportal-client:*tag*


## Checking for CSP issues

Using `npm run dev` is quite different from the productive deployment. Locally no restrictive CSP can be applied, because it would block any convenient feature for development. <br>
Thus to figure out CSP issues you need to run `npm run build` and `npm run preview`. Vite will start a local file server that serves files very similar to a prod environment.

Note: Even with the vite preview the nonce placeholder will not be replaced by an actual nonce.
To be even more similar to prod you need to create and run a docker image with the provided Dockerfile. Than the client will be served by nginx and the nonce will be generated.

### Package (Docker-Image)
Wenn ihr einen Tag pusht wird von GitHub für euch ein Docker-Image generiert. Schaut dazu im GitHub unter "packages"
nach. Wichtig ist, dass euer Branch dafür mit einer JIRA-Issue ID beginnt. 

ghcr.io/dbildungsplattform/schulportal-client:*tag*

### Docker images für das Backend und BFF
Wenn ihr nur den Client testen wollt und dafür ein Docker-Image braucht für das Backend und BFF
liegen diese
hier: ghcr.io/dbildungsplattform/dbildungs-iam-server:*branchname oder latest für main*

Wenn man das Backend-Image ohne Parameter aufruft, bekommt man das Backend. Für BFF braucht man noch einen Aufrufparameter:
`node dist/src/backend-for-frontend/main.js`

## Beispiel
Die folgenden Beispiele gehen davon aus, dass ihr eine Docker-CLI habt. Andere OCI-Runtimes sollten funktionieren.
Ihr müsst eure Parameter entsprechend anpassen.

Ihr müsst zusätzlich noch ein Volume einhängen mit Konfigurationsdateien und Umgebungsvariablen setzen,
damit sie gezogen werden. (HINWEIS: Die Konfiguration ist WIP, das wird noch vereinfacht)
Backend: `docker run --rm -eDEPLOY_STAGE=dev -eNODE_ENV=dev --volume="$(PWD)/config:/app/config" <IMAGE-NAME>`
BFF: `docker run --rm -eDEPLOY_STAGE=dev -eNODE_ENV=dev --volume="$(PWD)/config:/app/config" <IMAGE-NAME> node dist/src/backend-for-frontend/main.js`

| Parameter                            | Erklärung                                                                    |
|--------------------------------------|------------------------------------------------------------------------------|
| run --rm                             | Container entfernen, nachdem er beendet wurde                                |
| -eDEPLOY_STAGE=dev                   | Umgebungsvariable für die Stage                                              |
| -eNODE_ENV=dev                       | Umgebungsvariable für die Nodeumgebung                                       |
| --volume="$(PWD)/config:/app/config" | Verzeichnis mit Konfigurationsdateien an die richtige Stelle im Container    |
|                                      | `$(PWD)` ist das aktuelle Verzeichnis, der Pfad muss für Docker absolut sein |
| <IMAGE-NAME>                         | Name des Images, das wir laufen lassen wollen                                |
| docker build -t <IMAGE-NAME> .       | Baut ein lokal image anhand des Dockerfile                                   |