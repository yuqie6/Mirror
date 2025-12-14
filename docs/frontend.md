Project Mirror v0.2 UI/UX Design Specification (Final)

1. 设计哲学：工程师驾驶舱 (The Engineer's Cockpit)

Project Mirror 不是一个用来“展示”的 Marketing 页面，而是一个用来“诊断”和“回顾”的生产力仪表盘。

核心隐喻：IDE (VS Code) + 服务器监控 (Grafana)。

第一原则：

Evidence First (证据优先)：任何漂亮的图表或 AI 结论，必须能在一秒内点击展开看到“原始数据”（Diff/Logs/Events）。

No Silent Failures (拒绝沉默失败)：系统的健康状态（采集器死活）必须像服务器报警一样显眼。

Hierarchy is Key (层级至上)：技能不是孤立的点，而是树状生长的结构。

2. 视觉系统 (Visual System)

2.1 配色策略 (Dark Mode Optimized)

基于 Tailwind CSS zinc 色系，打造沉浸式、高对比度的专业感。

Canvas (背景): bg-zinc-950 (深邃黑)

Surface (卡片): bg-zinc-900 + border-zinc-800 (微弱边框，避免视觉噪音)

Semantic Colors (语义色):

🟢 Emerald (Healthy/Growth): 采集正常、技能增长、强证据。

🟡 Amber (Warning/Offline): 离线模式、规则降级、弱证据、采集器警告。

🟣 Indigo (Intelligence/AI): AI 生成的洞察、关键成就。

🔴 Rose (Error/Stop): 采集器挂掉、关键路径缺失。

2.2 字体 (Typography)

UI Text: Inter 或系统默认 Sans-serif (清晰、现代)。

Data/Code: JetBrains Mono 或 Fira Code (用于 Diff、路径、Log、Hash ID)。

3. 核心视图详细设计

3.1 全局导航与状态 (Shell & Health)

侧边栏: 收缩式设计，留出最大屏幕空间给数据。

P0 级状态栏 (System Health):

位置：侧边栏底部常驻。

样式：红绿灯圆点指示器 (Win, Diff, AI)。

交互：点击直接跳转 /status 诊断页。

3.2 仪表盘 (Dashboard)

采用 Bento Grid (便当盒) 布局，强调信息密度。

今日投入 (Focus): 进度条展示 Coding vs Reading vs Meeting。

会话计数: 巨大的数字展示今日产出。

热力图 (Heatmap): 类似 GitHub 的绿色格子，展示“连续性”。

快速入口: 如果当天日报已生成，显示一个横幅卡片，点击直达 Reports。

3.3 会话流 (Sessions - Timeline Feed)

卡片设计:

左侧时间轴，右侧内容。

区分 AI vs 规则:

✨ AI 生成：Indigo 色微光/图标。

⚙️ 规则生成：灰色/机械图标。

证据链交互 (Drill-down):

动作: 点击卡片，右侧滑出 Drawer (抽屉)。

内容:

Diff View: 代码高亮展示 (只读)。

App Timeline: 类似甘特图的 App 切换条。

Browser: 脱敏后的域名列表。

4. 技能树交互设计 (Skill Tree Logic) - 重点强化

针对现有后端逻辑，技能树必须体现 父子继承 (Parent-Child Inheritance) 和 经验值聚合 (XP Aggregation)。

4.1 结构定义

技能树不再是扁平列表，而是类似文件资源管理器（File Explorer）的多级折叠结构。

Root (Domain): 领域 (e.g., Backend, Frontend)

Branch (Skill): 具体技能 (e.g., Golang, React)

Leaf (Topic/Lib): 细分知识点 (e.g., Goroutines, React Hooks)

4.2 视觉表现 (UI Components)

A. 折叠树组件 (The Tree Explorer)

左侧导航栏使用树状折叠菜单，所有节点均可点击：

▼ 📂 Backend Engineering (Lvl 12) <-- 点击查看领域汇总
│
├─▼ 🔷 Golang (Lvl 8) <-- 点击查看技能综合看板
│ │
│ ├─ • Concurrency (XP: 550) <-- 点击查看“并发编程”专项证据
│ └─ • Gin Framework (XP: 300)
│
└─▶ 🔷 Docker (Lvl 4) <-- 折叠状态

父级状态: 父级的 XP 进度条 = 所有子级 XP 的总和。

热度衰减:

高亮白色：最近 3 天有 Session 贡献。

暗灰色：超过 7 天未活跃。

选中态: 选中的节点（无论是父还是子）需要有明显的背景色 (bg-indigo-500/10) 和左侧高亮条，保持导航上下文清晰。

B. 详情面板 (The Detail View)

右侧面板根据选中的节点类型，展示不同维度的信息：

情况 1：选中 Branch 节点 (e.g., "Golang")

聚合概览: 总等级、总 XP、下属子技能的雷达图或占比条（例如：并发 60%, 框架 40%）。

子技能列表: 列出所有子节点及其趋势，点击可下钻。

Recent Activity: 聚合了所有子节点的最近 Session。

情况 2：选中 Leaf 节点 (e.g., "Concurrency")

专项聚焦:

显示该特定知识点的 XP 增长曲线。

"Contextual Evidence" (语境证据): 这里不只是列出 Session，更要高亮 Session 中具体相关的文件。

例如：展示 "Session #101 (Refactoring)"，并在下方小字标注 "Modified worker_pool.go (+50 lines)"。

学习建议: 如果开启了 AI，针对该细分点给出具体的进阶建议（例如：“你最近频繁使用 Mutex，建议复习一下 Channel 模式”）。

5. 诊断与维护 (Diagnostics - P0)

这是区别于玩具项目的关键。

仪表盘风格: 每一行都是一个采集器 (Collector)。

心跳检测: 显示 Last Heartbeat: 2s ago。

自愈操作 (Actionable):

如果 AI 挂了 -> 显示 "Switch to Rule Mode" 或 "Check API Key" 按钮。

如果数据乱了 -> 显示 "Rebuild Sessions for

$$Date$$

" 按钮。

6. 实现建议 (Implementation Notes)

数据结构映射:
前端接收到的 JSON 应该包含 parentId 字段，或者已经是嵌套好的 children: [] 结构。使用递归组件 (RecursiveTreeItem) 来渲染左侧菜单。

路由设计:

/dashboard: 概览

/sessions: 流

/sessions/:id: 详情（虽然用 Drawer，但保持 URL 同步便于分享/刷新）

/skills: 树根

/skills/:skillId: 选中特定节点 (Branch 或 Leaf 统一 ID 空间)

样式隔离:
确保 Markdown 渲染（用于 AI 周报）和 Code Diff 渲染的样式不污染全局 UI。

7. 关键数据结构定义 (TypeScript Interfaces) - Agent 指导核心

为了确保 Agent 生成的前端代码与后端逻辑一致，必须严格遵守以下类型定义：

// 1. Session & Evidence
interface ISession {
id: number;
startTime: string; // ISO 8601
endTime: string;
duration: string; // "1h 15m"
title: string;
summary: string;
type: 'ai' | 'rule';
evidenceStrength: 'strong' | 'weak';

// 证据负载 (按需加载)
evidence?: {
diffs: { file: string; additions: number; deletions: number; lang: string }[];
windowEvents: { app: string; duration: number }[];
urls: { domain: string; count: number }[];
};
}

// 2. Skill Tree (Recursive)
interface ISkillNode {
id: string;
parentId?: string; // 允许扁平结构转树
name: string;
type: 'domain' | 'skill' | 'topic'; // 对应 Root -> Branch -> Leaf
level: number;
xp: number;
maxXp: number;
trend: 'up' | 'flat' | 'down';
lastActive: string; // "Today", "3 days ago"

// 聚合数据 (仅父级需要)
children?: ISkillNode[];

// 详情页专用 (不包含在列表 API 中)
recentSessions?: number[]; // Session IDs
contextualEvidence?: { sessionId: number; fileHint: string }[]; // Leaf 节点专用
}

8. 组件架构与技术栈细节 (Tech Stack Specs)
   Agent 在生成代码时必须强制使用以下库和组件映射：

8.1 基础技术栈
Framework: React 18 + Vite

Styling: Tailwind CSS (使用 zinc 作为 gray 别名)

Icons: Lucide React

Charts: Recharts (用于 XP 增长曲线和分布图)

Utils: clsx, tailwind-merge (用于样式合并)

8.2 Shadcn UI 组件映射表
Agent 禁止手写复杂交互组件，必须复用以下 Shadcn 原语：

UI 模块 推荐 Shadcn 组件 备注
技能树导航 Collapsible / Accordion 必须支持递归渲染
会话详情 Sheet (Side Drawer) 从右侧滑出，保留上下文
状态标签 Badge 配合 variant (default, secondary, destructive)
XP 进度条 Progress 自定义颜色 class
诊断卡片 Card + Alert 区分正常显示和报警信息
日期选择 Calendar + Popover 用于选择重建 Session 的日期
操作菜单 DropdownMenu 用于 Session 卡片右上角的更多操作
