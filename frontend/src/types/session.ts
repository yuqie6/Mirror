// Session types (基于后端 dto/httpapi.go)

export interface SessionDTO {
  id: number;
  date: string;
  start_time: number;
  end_time: number;
  time_range: string;
  primary_app: string;
  session_version: number;
  category: string;
  summary: string;
  skills_involved: string[];
  diff_count: number;
  browser_count: number;

  semantic_source: 'ai' | 'rule' | string;
  semantic_version?: string;
  evidence_hint: string;
  degraded_reason?: string;
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
  duration: number;
}

export interface SessionWindowEventDTO {
  timestamp: number;
  app_name: string;
  title: string;
  duration: number;
}

export interface SessionDetailDTO extends SessionDTO {
  app_usage: SessionAppUsageDTO[];
  diffs: SessionDiffDTO[];
  browser: SessionBrowserEventDTO[];
}
