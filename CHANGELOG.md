# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-07-02

### Added

- Create a GitHub release automatically after a successful npm publish.

### Fixed

- Stop pinning the CLI version in the version-payload snapshot so a version
  bump no longer breaks the release build.
- Run the PR gate on pushes to `master`.

## [0.3.1] - 2026-07-02

### Changed

- Update CI workflows to the latest `actions/checkout`, `actions/setup-node`,
  and Node.js 24.

## [0.3.0] - 2026-07-02

### Added

- Publish the CLI to npm as a public package, installable with
  `npm install -g @zhuk/singularity-cli`.

### Changed

- Rename the package from `@victorzhuk/singularity-cli` to `@zhuk/singularity-cli`.

## [0.2.0] - 2026-06-30

### Added

- Projects, tasks, task groups, tags, and search commands.
- Notes, notebooks, and habits commands.
- Shell completion command and a programmatic SDK entry point.

[Unreleased]: https://github.com/victorzhuk/singularity-cli/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/victorzhuk/singularity-cli/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/victorzhuk/singularity-cli/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/victorzhuk/singularity-cli/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/victorzhuk/singularity-cli/releases/tag/v0.2.0
