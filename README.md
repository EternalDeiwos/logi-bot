# Foxhole Logistics Bot

> TODO Banner

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![docker-unstable](https://github.com/EternalDeiwos/logi-bot/actions/workflows/unstable.yaml/badge.svg)](https://github.com/EternalDeiwos/logi-bot/actions/workflows/unstable.yaml)
[![docker-release](https://github.com/EternalDeiwos/logi-bot/actions/workflows/release.yaml/badge.svg)](https://github.com/EternalDeiwos/logi-bot/actions/workflows/release.yaml)

> A Foxhole logistics assistant for Discord

This is a discord bot to assist large regiments in managing distributed resources, some features include:

- Tracking available stockpiles and contents
- ...
- WIP

> [!CAUTION]
> This application is WIP. If you need assistance please open an issue but be aware that at any point this might not be under active development.

## Table of Contents

- [Documentation](./docs)
- [Install](#install)
- [Usage](#usage)
  - [Configuration for Development](#configuration-for-development)
  - [Linting](#linting)
  - [Tests](#tests)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

[NodeJS](https://nodejs.org/en/) and the [YARN](https://yarnpkg.com/) package manager are required to run the project. Use only the latest LTS releases.

To install project dependencies run:

```bash
yarn
```

## Usage

### Configuration for Development

Configuration options for both Docker Compose and the application are set by editing [`.env`](./.env). The file is tracked in the repository so do not use it to store secrets; instead set secret values using `.env.local` which accepts the same values and will override those provided elsewhere. Note that this only works for `docker-compose.yml` if you use multiple `--env-file` flags, or use the helper script provided (`yarn docker-compose ...`).

#### Start Docker Containers

If you want to start the containers run:

```bash
yarn docker-compose up -d
```

If you want to stop those containers and recover their resources run:

```bash
yarn docker-compose down
```

#### Running in Development

You can start the server for development by running:

```bash
yarn start:dev
```

### Linting

Before committing your changes to the repository, you should first lint the code:

```bash
yarn lint
```

All errors and warnings need to be addressed. No code will be merged without tests passing.

### Tests

If you want to run the test suite:

```bash
yarn test
```

You can run integration tests by using:

```bash
yarn test:e2e
```

## Maintainers

[EternalDeiwos](https://github.com/EternalDeiwos)

## Contributing

PRs are welcome. All contributions must pass all linters, style requirements, and static code analysis to be considered.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

All source code in this repository is licensed under the [MIT License](./LICENSE.md).
