export {
  createSingularityAdapter,
  type SingularityAdapter,
  type SingularityAdapterConfig,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type CompleteTaskRequest,
  type MoveTaskRequest,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type CreateHabitRequest,
  type UpdateHabitRequest,
  type CompleteHabitRequest,
  type CreateTagRequest,
  type UpdateTagRequest,
  type CreateTaskGroupRequest,
  type UpdateTaskGroupRequest,
} from '../adapters/singularity/index.js';

export {
  allSchemas,
  ConfigV1Schema,
  ErrorEnvelopeSchema,
  NormalizedProjectSchema,
  NormalizedTaskSchema,
  ProjectListSchema,
  TaskListSchema,
  type CommandMeta,
  type ConfigV1,
  type ProfileConfig,
  type ProjectAliasConfig,
  type ErrorEnvelope,
  type NormalizedProject,
  type ProjectList,
  type NormalizedTask,
  type TaskList,
} from '../schemas/index.js';

export {
  CliError,
  AdapterUnavailableError,
  UpstreamBreakingChangeError,
  UpstreamSchemaMismatchError,
  NetworkTimeoutError,
  UsageError,
  InternalError,
  NotImplementedError,
  AuthTokenMissingError,
  AuthTokenInvalidError,
  AuthTokenExpiredError,
  AuthFailedError,
  AuthScopeDeniedError,
  ConfigInvalidError,
  ProfileUnknownError,
  ProjectBindingMissingError,
  ProjectAliasUnknownError,
  BaseTaskGroupMissingError,
  ValidationFailedError,
  DeltaInvalidError,
  UnsupportedDryRunError,
  ConfirmationRequiredError,
  GeneratedFileCollisionError,
  formatErrorEnvelope,
  type ErrorCode,
} from '../core/errors.js';

export {
  loadResolvedConfig,
  resolveProfile,
  resolveProjectId,
  requireProjectId,
  resolveBaseTaskGroupId,
  type ResolvedConfigs,
} from '../config/index.js';

export {
  resolveToken,
  resolveApiUrl,
} from '../auth/index.js';

export {
  validateApiUrl,
  validateEmoji,
  buildNotifyMinutes,
  validateDelta,
} from '../core/validators.js';
