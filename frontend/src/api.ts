/**
 * API 请求封装
 * 
 * 这个模块封装了与后端的所有 HTTP 通信。
 * 使用原生 fetch API，不依赖第三方库。
 */

// API 基础路径
const API_BASE = "/mini-batcher/api";

// 通用响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 任务类型定义
export interface Task {
  id: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  config?: {
    workflow?: any;
    params?: any[];
  };
  created_at: string;
  updated_at: string;
  total_count: number;
  completed_count: number;
}

// 创建任务的参数
export interface CreateTaskParams {
  name: string;
  workflow: any;
  params: Array<{
    node_id: string;
    field: string;
    value: any;
  }>;
}

/**
 * 通用请求方法
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API 请求失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取所有任务列表
 */
export async function getTasks(): Promise<ApiResponse<Task[]>> {
  return request<Task[]>("/tasks");
}

/**
 * 获取单个任务详情
 */
export async function getTask(taskId: number): Promise<ApiResponse<Task>> {
  return request<Task>(`/tasks/${taskId}`);
}

/**
 * 创建新任务
 */
export async function createTask(
  params: CreateTaskParams
): Promise<ApiResponse<{ id: number }>> {
  return request<{ id: number }>("/tasks", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: number): Promise<ApiResponse<void>> {
  return request<void>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

/**
 * 运行任务
 */
export async function runTask(taskId: number): Promise<ApiResponse<void>> {
  return request<void>(`/tasks/${taskId}/run`, {
    method: "POST",
  });
}
