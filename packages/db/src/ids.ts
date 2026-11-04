import { v7 as uuidv7 } from 'uuid';

/** Time-ordered UUID (v7) for domain primary keys. */
export function newId(): string {
  return uuidv7();
}
