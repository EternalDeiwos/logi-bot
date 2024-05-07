export type OperationStatus<T = any> = {
  success: boolean;
  message: string;
  data?: T;
};
