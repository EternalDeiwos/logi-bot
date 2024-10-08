import Joi from 'joi';

const schema = {
  NODE_ENV: Joi.string().valid('development', 'production').default('production'),

  // Postgres config
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().port().default(5432),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().default('logi'),
  POSTGRES_SCHEMA: Joi.string().default('app'),
  POSTGRES_MIGRATE: Joi.boolean().default(false),

  // RabbitMQ config
  RABBITMQ_HOST: Joi.string().default('localhost'),
  RABBITMQ_PORT: Joi.number().port().default(5672),
  RABBITMQ_DEFAULT_USER: Joi.string().required(),
  RABBITMQ_DEFAULT_PASS: Joi.string().required(),

  // Bot config
  DISCORD_BOT_TOKEN: Joi.string().required(),
  DISCORD_BOT_CLIENT_ID: Joi.string().required(),
  DISCORD_BOT_PERMISSIONS: Joi.string().default('19097840626768'),
  DISCORD_BOT_SCOPE: Joi.string().default('bot applications.commands'),

  // War API
  CLAPFOOT_API_URI: Joi.string().uri().default('https://war-service-live.foxholeservices.com/api'),

  // Application config
  APP_GUILD_ID: Joi.string().required(),
  APP_PORT: Joi.number().port().default(8080),
  APP_FOXHOLE_VERSION: Joi.string()
    .regex(/\w+-\d+/)
    .default('naval-57'),
  APP_CATALOG_VERSION: Joi.string().regex(/v\d+/).default('v1'),
  APP_QUEUE_RETRY_BACKOFF_BASE: Joi.number().default(2),
  APP_QUEUE_RETRY_BACKOFF_MULTIPLIER: Joi.number().default(1000),
  APP_QUEUE_MAX_RETRY_COUNT: Joi.number().default(3),
  APP_QUEUE_RPC_EXPIRE: Joi.number().default(1000),
};

export type ConfigKey = keyof typeof schema;
export const validationSchema = Joi.object(schema);
