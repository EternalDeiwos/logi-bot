import { ErrorBase } from './base';

type DatabaseErrorName = 'QUERY_FAILED';
export class DatabaseError extends ErrorBase<DatabaseErrorName> {}
