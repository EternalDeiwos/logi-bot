# Logi Bot

> TODO Banner

[![discord](https://img.shields.io/discord/711362115570761739?style=plastic&logo=discord&labelColor=424549)](https://discord.gg/winterlegion) [![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> A logistics assistant for Foxhole

Foxhole is a persistent warfare MMO where all materials used on the front lines are produced, transported, and protected by the players; this is broadly referred to as _logistics_ within the game, or shortened to _logi_. This application is an out-of-game assistant to track and organize logistics efforts for groups. Some features include:

- Crew Channels and Roles
- Tickets in Discord Forums
- Stockpile contents tracking from [FIR](https://github.com/GICodeWarrior/fir) reports
- Discord bot

Logi-bot was initially developed for use by Winter Legion Logistics (WLL), and is in active use by High Velocity Logistics (HvL) and several other groups.

> [!CAUTION]
> This application is WIP. If you need assistance please open an issue but be aware that at any point this might not be under active development.

## Table of Contents

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

A full list of application configuration options can be found [here](./src/app.config.ts).

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

PRs accepted. All contributions must pass all linters, style requirements, and static code analysis to be considered.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

Copyright (C) 2024- Greg Linklater

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
