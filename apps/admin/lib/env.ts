import 'server-only';
import {
  composeEnv,
  coreSchema,
  databaseSchema,
  emailSchema,
  loadEnv,
  redisSchema,
  staffAuthSchema,
} from '@dex/env';

const schema = composeEnv(coreSchema, databaseSchema, redisSchema, staffAuthSchema, emailSchema);
let cached: ReturnType<typeof loadEnv<typeof schema>> | null = null;
export function env() {
  cached ??= loadEnv(schema);
  return cached;
}
