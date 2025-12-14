// Session & Evidence types (设计规范 Section 7)

export interface ISessionEvidence {
  diffs: { file: string; additions: number; deletions: number; lang: string }[];
  windowEvents: { app: string; duration: number }[];
  urls: { domain: string; count: number }[];
}

export interface ISession {
  id: number;
  startTime: string; // ISO 8601
  endTime: string;
  duration: string; // "1h 15m"
  title: string;
  summary: string;
  type: 'ai' | 'rule';
  evidenceStrength: 'strong' | 'weak';
  tags?: string[];
  evidence?: ISessionEvidence;
}

// 后端 DTO 映射（snake_case -> camelCase 转换在 API 层处理）
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

export interface SessionDetailDTO extends SessionDTO {
  tags: string[];
  rag_refs: Record<string, unknown>[];
  app_usage: { app_name: string; total_duration: number }[];
  diffs: {
    id: number;
    file_name: string;
    language: string;
    insight: string;
    skills: string[];
    lines_added: number;
    lines_deleted: number;
    timestamp: number;
  }[];
  browser: {
    id: number;
    timestamp: number;
    domain: string;
    title: string;
    url: string;
  }[];
}

// DTO -> ISession 转换
export function toISession(dto: SessionDTO): ISession {
  return {
    id: dto.id,
    startTime: new Date(dto.start_time).toISOString(),
    endTime: new Date(dto.end_time).toISOString(),
    duration: dto.time_range,
    title: dto.summary.slice(0, 50) || dto.category || 'Session',
    summary: dto.summary,
    type: dto.summary ? 'ai' : 'rule',
    evidenceStrength: dto.diff_count > 0 ? 'strong' : 'weak',
    tags: dto.skills_involved,
  };
}
