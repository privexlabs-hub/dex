import 'server-only';
import {
  composeEnv,
  coreSchema,
  customerAuthSchema,
  databaseSchema,
  emailSchema,
  loadEnv,
  storageSchema,
} from '@dex/env';

const schema = composeEnv(
  coreSchema,
  databaseSchema,
  storageSchema,
  customerAuthSchema,
  emailSchema,
);

let cached: ReturnType<typeof loadEnv<typeof schema>> | null = null;
export function env() {
  cached ??= loadEnv(schema);
  return cached;
}
