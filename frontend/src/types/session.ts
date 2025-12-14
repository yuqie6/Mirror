// Session types (基于后端 dto/httpapi.go)

export interface SessionDTO {
  id: number;
  date: string;
  start_time: number;
  end_time: number;
  time_range: string;
  primary_app: string;
  category: string;
  summary: string;
  skills_involved: string[];
  diff_count: number;
  browser_count: number;
}

export interface SessionAppUsageDTO {
  app_name: string;
  total_duration: number;
}

export interface SessionDiffDTO {
  id: number;
  file_name: string;
  language: string;
  insight: string;
  skills: string[];
  lines_added: number;
  lines_deleted: number;
  timestamp: number;
}

export interface SessionBrowserEventDTO {
  id: number;
  timestamp: number;
  domain: string;
  title: string;
  url: string;
}

export interface SessionWindowEventDTO {
  timestamp: number;
  app_name: string;
  title: string;
  duration: number;
}

export interface SessionDetailDTO extends SessionDTO {
  tags: string[];
  rag_refs: Record<string, unknown>[];
  app_usage: SessionAppUsageDTO[];
  diffs: SessionDiffDTO[];
  browser: SessionBrowserEventDTO[];
}

// 前端使用的 Session 接口（保持向后兼容）
export interface ISession {
  id: number;
  date: string;
  title: string;
  summary: string;
  duration: string;
  type: 'ai' | 'rule';
  tags: string[];
  evidenceStrength: 'strong' | 'medium' | 'weak';
}

// 从后端 DTO 转换为前端 ISession
export function toISession(dto: SessionDTO): ISession {
  // 类型判断：有 skills_involved 且有 category 通常是 AI 推断
  // 注意：这只是启发式判断，后端应该明确提供 source_type 字段
  const hasSemanticData = dto.skills_involved && dto.skills_involved.length > 0 && dto.category;

  // 证据强度：基于 diff 和 browser 同时存在
  let evidenceStrength: 'strong' | 'medium' | 'weak' = 'weak';
  if (dto.diff_count > 0 && dto.browser_count > 0) {
    evidenceStrength = 'strong';
  } else if (dto.diff_count > 0 || dto.browser_count > 0) {
    evidenceStrength = 'medium';
  }

  return {
    id: dto.id,
    date: dto.date,
    title: dto.category || dto.primary_app || '未分类会话',
    summary: dto.summary || `${dto.primary_app} 相关活动`,
    duration: dto.time_range,
    type: hasSemanticData ? 'ai' : 'rule',
    tags: dto.skills_involved || [],
    evidenceStrength,
  };
}
