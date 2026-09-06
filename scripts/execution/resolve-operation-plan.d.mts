export type OperationPlanRequest = {
  toolId: string;
  operationId: string;
  inputPaths: string[];
  outputPath: string;
  options?: Record<string, string | number>;
};

export type OperationPlan = { executable: string; args: string[] };

export declare function resolveOperationPlan(request: OperationPlanRequest): OperationPlan;
