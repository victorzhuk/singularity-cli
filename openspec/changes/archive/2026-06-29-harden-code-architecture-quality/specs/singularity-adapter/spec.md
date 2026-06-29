## ADDED Requirements

### Requirement: Adapter uses verified upstream runtime

The adapter SHALL load official MCPB files only from a runtime path returned by the shared verified upstream runtime loader. It SHALL NOT extract archives, choose cache paths, or require package-local `upstream/extracted` files directly.

#### Scenario: Adapter loads from verified runtime

- **WHEN** an adapter method is invoked and the upstream runtime is not already loaded
- **THEN** the adapter obtains a verified runtime path from the shared loader before requiring `client.js`

#### Scenario: Adapter does not write package-local extraction output

- **WHEN** an adapter method is invoked in a package install where `upstream/extracted/` is absent
- **THEN** the adapter completes without creating `upstream/extracted/` under the package directory

### Requirement: Adapter calls are timeout-bound

Each official API call made through the adapter SHALL have a configured timeout. When the timeout expires, the adapter SHALL fail with code `NETWORK_TIMEOUT` and details containing `timeoutMs` and the adapter operation name.

#### Scenario: Timed-out task list call

- **WHEN** `listTasks` exceeds the configured timeout
- **THEN** the call rejects with code `NETWORK_TIMEOUT`
- **AND** details include `timeoutMs` and operation `listTasks`

#### Scenario: Timeout is configurable through adapter config

- **WHEN** the adapter is created with a timeout override
- **THEN** official API calls use that timeout instead of the default

### Requirement: Official API errors are normalized and redacted

The adapter SHALL convert official client and HTTP failures into `CliError` instances at the adapter boundary. Error details SHALL include safe fields such as operation, HTTP status, and upstream message, and SHALL NOT include access tokens, Authorization headers, or raw request config.

#### Scenario: HTTP error is normalized

- **WHEN** the official client rejects an adapter call with an HTTP response error
- **THEN** the adapter rejects with a `CliError` whose details include the adapter operation and HTTP status
- **AND** the error does not expose raw upstream client internals

#### Scenario: Token is not leaked from failed request

- **WHEN** an official client error contains an Authorization header or access token in its raw object
- **THEN** the adapter error message and details contain `[REDACTED]` instead of the token value

### Requirement: Adapter contract tests cover failure paths

The adapter contract-test harness SHALL cover successful responses, missing official modules, official HTTP failures, token redaction, and timeout behavior for the adapter methods currently exposed.

#### Scenario: Failure contract tests run

- **WHEN** `npm run test:adapter` is executed
- **THEN** contract tests assert normalized output for successful calls and normalized errors for missing module, HTTP failure, token redaction, and timeout cases
