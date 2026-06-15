# Helpline104Next

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.28.

## Environment setup (required before first run)

This repo follows the AMRIT convention: the build-time environment file
`src/environments/environment.ts` is **git-ignored** and generated locally.
A fresh checkout has no `environment.ts`, so `ng serve` / `ng build` will fail
until you create one. Copy the environment that matches your backend:

```bash
# Local backend services on localhost (default for development)
cp src/environments/environment.local.ts src/environments/environment.ts
```

The committed `environment.<env>.ts` files (`local`, `dev`, `test`, `prod`)
are swapped in per build configuration via `angular.json` `fileReplacements`,
e.g. `ng build --configuration dev`. The `ci` configuration uses
`environment.ci.ts`, which CI generates from `environment.ci.ts.template`
(also git-ignored) — do not create it by hand.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
