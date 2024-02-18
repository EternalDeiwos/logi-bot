# Forum Kanban for Discord

> TODO Banner

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> A simple project management tool for Discord guilds

This application is WIP. If you need assistance please open an issue but be aware this might not be under active development.

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
yarn install
```

## Usage

### Configuration for Development

Configuration options for both Docker Compose and the application are set by editing [`.env`](./.env). The file is tracked in the repository so do not use it to store secrets; instead set secret values using `.env.local` which accepts the same values and will override those provided elsewhere.

#### Start Docker Containers

If you want to start the containers run:

```bash
docker-compose up -d
```

If you want to stop those containers and recover their resources run:

```bash
docker-compose down
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

[Greg Linklater](https://github.com/EternalDeiwos)

## Contributing

PRs accepted. All contributions must pass all linters, style requirements, and static code analysis to be considered.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT License

Copyright (c) 2024 Greg Linklater

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
