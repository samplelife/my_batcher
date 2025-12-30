/**
 * 创建任务组件
 * 
 * 支持配置多个参数的批量组合：
 * - Seed：随机种子
 * - Steps：采样步数
 * - CFG：引导系数
 * 
 * 会生成所有参数的笛卡尔积组合
 */
import React, { useState, useCallback, useMemo } from "react";
import { createTask, CreateTaskParams } from "../api";

interface Props {
  onSuccess?: () => void;
}

// 参数配置类型
interface ParamConfig {
  enabled: boolean;
  values: string; // 逗号分隔的值，如 "1,2,3" 或 "1-5"
}

const CreateTask: React.FC<Props> = ({ onSuccess }) => {
  // 任务名称
  const [name, setName] = useState("");
  // 节点 ID（KSampler 节点）
  const [nodeId, setNodeId] = useState("3");
  // 提交中状态
  const [submitting, setSubmitting] = useState(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);

  // 参数配置
  const [seedConfig, setSeedConfig] = useState<ParamConfig>({ enabled: true, values: "1-5" });
  const [stepsConfig, setStepsConfig] = useState<ParamConfig>({ enabled: false, values: "20,30,40" });
  const [cfgConfig, setCfgConfig] = useState<ParamConfig>({ enabled: false, values: "7,8,9" });

  /**
   * 解析参数值字符串
   * 支持格式：
   * - "1,2,3" => [1, 2, 3]
   * - "1-5" => [1, 2, 3, 4, 5]
   * - "1-10:2" => [1, 3, 5, 7, 9] (步长为2)
   */
  const parseValues = useCallback((input: string): number[] => {
    const result: number[] = [];
    const parts = input.split(",").map(s => s.trim());
    
    for (const part of parts) {
      if (part.includes("-")) {
        // 范围格式: "1-5" 或 "1-10:2"
        const [range, stepStr] = part.split(":");
        const [startStr, endStr] = range.split("-");
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        const step = stepStr ? parseInt(stepStr) : 1;
        
        if (!isNaN(start) && !isNaN(end) && !isNaN(step) && step > 0) {
          for (let i = start; i <= end; i += step) {
            result.push(i);
          }
        }
      } else {
        // 单个值
        const val = parseFloat(part);
        if (!isNaN(val)) {
          result.push(val);
        }
      }
    }
    
    return result;
  }, []);

  /**
   * 计算笛卡尔积
   * 例如：[[1,2], [a,b]] => [[1,a], [1,b], [2,a], [2,b]]
   */
  const cartesianProduct = useCallback(<T,>(arrays: T[][]): T[][] => {
    if (arrays.length === 0) return [[]];
    
    return arrays.reduce<T[][]>(
      (acc, arr) => acc.flatMap(x => arr.map(y => [...x, y])),
      [[]]
    );
  }, []);

  /**
   * 生成参数组合列表
   */
  const generateParams = useCallback((): CreateTaskParams["params"][][] => {
    const paramArrays: { field: string; values: number[] }[] = [];
    
    if (seedConfig.enabled) {
      const values = parseValues(seedConfig.values);
      if (values.length > 0) {
        paramArrays.push({ field: "seed", values });
      }
    }
    
    if (stepsConfig.enabled) {
      const values = parseValues(stepsConfig.values);
      if (values.length > 0) {
        paramArrays.push({ field: "steps", values });
      }
    }
    
    if (cfgConfig.enabled) {
      const values = parseValues(cfgConfig.values);
      if (values.length > 0) {
        paramArrays.push({ field: "cfg", values });
      }
    }
    
    if (paramArrays.length === 0) {
      return [];
    }
    
    // 生成笛卡尔积
    const valueArrays = paramArrays.map(p => p.values);
    const combinations = cartesianProduct(valueArrays);
    
    // 转换为参数格式
    return combinations.map(combo => {
      const params: CreateTaskParams["params"] = [];
      combo.forEach((value, index) => {
        params.push({
          node_id: nodeId,
          field: paramArrays[index].field,
          value: value,
        });
      });
      return params;
    });
  }, [nodeId, seedConfig, stepsConfig, cfgConfig, parseValues, cartesianProduct]);

  // 计算任务数量
  const taskCount = useMemo(() => {
    return generateParams().length;
  }, [generateParams]);

  // 获取当前工作流
  const getWorkflow = useCallback(async (): Promise<any> => {
    try {
      // @ts-ignore
      const app = window.comfyApp;
      
      if (!app) {
        alert("无法访问 ComfyUI，请刷新页面重试");
        return null;
      }
      
      if (!app.graph) {
        alert("请先加载一个工作流");
        return null;
      }
      
      const prompt = await app.graphToPrompt();
      
      if (!prompt?.output || Object.keys(prompt.output).length === 0) {
        alert("工作流为空，请确保画布上有节点");
        return null;
      }
      
      return prompt.output;
    } catch (e) {
      alert("获取工作流失败: " + e);
      return null;
    }
  }, []);

  // 提交任务
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("请输入任务名称");
      return;
    }
    
    const paramsList = generateParams();
    if (paramsList.length === 0) {
      setError("请至少启用一个参数并设置有效值");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const workflow = await getWorkflow();
      
      if (!workflow || Object.keys(workflow).length === 0) {
        setError("无法获取当前工作流");
        setSubmitting(false);
        return;
      }
      
      console.log("📋 准备提交的参数组合:", paramsList);
      
      // 调用 API 创建任务
      const result = await createTask({
        name: name.trim(),
        workflow,
        params: paramsList as any, // 现在是数组的数组
      });

      if (result.success) {
        alert(`✅ 任务创建成功！共 ${paramsList.length} 个子任务`);
        setName("");
        onSuccess?.();
      } else {
        setError(result.error || "创建失败");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setSubmitting(false);
    }
  }, [name, generateParams, getWorkflow, onSuccess]);

  // 渲染参数配置行
  const renderParamRow = (
    label: string,
    config: ParamConfig,
    setConfig: (c: ParamConfig) => void,
    placeholder: string,
    hint: string
  ) => (
    <div className="mb-form-group" style={{ 
      padding: 12, 
      background: config.enabled ? "var(--mb-bg-secondary)" : "transparent",
      borderRadius: 8,
      border: `1px solid ${config.enabled ? "var(--mb-primary)" : "var(--mb-border)"}`,
      transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: config.enabled ? 8 : 0 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontWeight: 500 }}>{label}</span>
        </label>
        {config.enabled && (
          <span style={{ color: "var(--mb-primary)", fontSize: 12 }}>
            共 {parseValues(config.values).length} 个值
          </span>
        )}
      </div>
      {config.enabled && (
        <>
          <input
            type="text"
            className="mb-input"
            placeholder={placeholder}
            value={config.values}
            onChange={(e) => setConfig({ ...config, values: e.target.value })}
          />
          <small style={{ color: "var(--mb-text-secondary)", display: "block", marginTop: 4 }}>
            {hint}
          </small>
        </>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>📝 创建批量任务</h3>
      
      <p style={{ color: "var(--mb-text-secondary)", fontSize: 14 }}>
        支持 Seed、Steps、CFG 参数的组合批量。启用多个参数时，会生成所有可能的组合（笛卡尔积）。
      </p>

      {/* 任务名称 */}
      <div className="mb-form-group">
        <label className="mb-form-label">任务名称</label>
        <input
          type="text"
          className="mb-input"
          placeholder="例如：测试不同参数的效果"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 节点 ID */}
      <div className="mb-form-group">
        <label className="mb-form-label">KSampler 节点 ID</label>
        <input
          type="text"
          className="mb-input"
          placeholder="通常是 3"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
        />
        <small style={{ color: "var(--mb-text-secondary)" }}>
          提示：在 ComfyUI 中右键节点 → Properties 查看 ID
        </small>
      </div>

      {/* 参数配置区域 */}
      <div style={{ marginBottom: 16 }}>
        <label className="mb-form-label">参数配置</label>
        
        {renderParamRow(
          "🎲 Seed（随机种子）",
          seedConfig,
          setSeedConfig,
          "1-5 或 1,2,3,4,5",
          "格式：1-5 表示1到5，1,3,5 表示具体值，1-10:2 表示步长为2"
        )}
        
        {renderParamRow(
          "👟 Steps（采样步数）",
          stepsConfig,
          setStepsConfig,
          "20,30,40 或 20-40:10",
          "常用范围：20-50，值越大细节越多但速度越慢"
        )}
        
        {renderParamRow(
          "🎯 CFG（引导系数）",
          cfgConfig,
          setCfgConfig,
          "7,8,9 或 5-10",
          "常用范围：5-15，值越大越贴近提示词但可能过度饱和"
        )}
      </div>

      {/* 任务预览 */}
      <div style={{ 
        padding: 12, 
        background: "var(--mb-bg-secondary)", 
        borderRadius: 8,
        marginBottom: 16 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📊 将生成任务数量：</span>
          <span style={{ 
            fontSize: 24, 
            fontWeight: "bold", 
            color: taskCount > 50 ? "var(--mb-warning)" : "var(--mb-primary)" 
          }}>
            {taskCount}
          </span>
        </div>
        {taskCount > 50 && (
          <small style={{ color: "var(--mb-warning)" }}>
            ⚠️ 任务数量较多，执行可能需要较长时间
          </small>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{ 
          padding: "12px 16px", 
          background: "var(--mb-error)", 
          borderRadius: 8,
          marginBottom: 16 
        }}>
          {error}
        </div>
      )}

      {/* 提交按钮 */}
      <button 
        type="submit" 
        className="mb-button mb-button-primary"
        disabled={submitting || taskCount === 0}
        style={{ width: "100%" }}
      >
        {submitting ? "⏳ 创建中..." : `🚀 创建任务（${taskCount} 个子任务）`}
      </button>
    </form>
  );
};

export default CreateTask;
