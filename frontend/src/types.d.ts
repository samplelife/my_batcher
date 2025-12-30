/// <reference types="react" />
/// <reference types="react-dom" />

declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

// ComfyUI 全局对象类型声明
interface ComfyApp {
  graph: any;
  graphToPrompt: () => Promise<{ output: any; workflow: any }>;
  queuePrompt: (number: number, batchCount: number) => Promise<void>;
}

interface ComfyApi {
  queuePrompt: (number: number, data: any) => Promise<any>;
  addEventListener: (event: string, callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    comfyApp?: ComfyApp;
    comfyApi?: ComfyApi;
  }
}
