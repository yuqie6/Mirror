// Skill Tree types (设计规范 Section 7)

export type SkillNodeType = 'domain' | 'skill' | 'topic';
export type SkillTrend = 'up' | 'flat' | 'down';

export interface ISkillNode {
    id: string;
    parentId?: string;
    name: string;
    type: SkillNodeType; // Root -> Branch -> Leaf
    level: number;
    xp: number;
    maxXp: number;
    trend: SkillTrend;
    lastActive: string; // "Today", "3 days ago"
    children?: ISkillNode[];
    // 详情页专用
    recentSessions?: number[];
    contextualEvidence?: { sessionId: number; fileHint: string }[];
}

// 后端 DTO (扁平结构)
export interface SkillNodeDTO {
    key: string;
    name: string;
    category: string;
    parent_key: string;
    level: number;
    experience: number;
    progress: number;
    status: string; // "up" | "flat" | "down"
    last_active: number; // Unix timestamp
}

// 把扁平 DTO 转换为嵌套树结构
export function buildSkillTree(dtos: SkillNodeDTO[]): ISkillNode[] {
    const nodeMap = new Map<string, ISkillNode>();
    const roots: ISkillNode[] = [];

    // 第一遍：创建所有节点
    for (const dto of dtos) {
        const lastActiveDate = new Date(dto.last_active);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

        let lastActiveStr = 'Unknown';
        if (daysDiff === 0) lastActiveStr = 'Today';
        else if (daysDiff === 1) lastActiveStr = 'Yesterday';
        else if (daysDiff < 7) lastActiveStr = `${daysDiff} days ago`;
        else lastActiveStr = `${Math.floor(daysDiff / 7)} weeks ago`;

        const node: ISkillNode = {
            id: dto.key,
            parentId: dto.parent_key || undefined,
            name: dto.name,
            type: dto.parent_key ? (dto.category ? 'skill' : 'topic') : 'domain',
            level: dto.level,
            xp: dto.experience,
            maxXp: dto.experience + Math.max(100, dto.experience * 0.2), // 估算
            trend: (dto.status as SkillTrend) || 'flat',
            lastActive: lastActiveStr,
            children: [],
        };
        nodeMap.set(dto.key, node);
    }

    // 第二遍：构建树结构
    for (const node of nodeMap.values()) {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    }

    // 更新父节点类型
    function updateTypes(nodes: ISkillNode[], depth: number) {
        for (const node of nodes) {
            if (depth === 0) node.type = 'domain';
            else if (node.children && node.children.length > 0) node.type = 'skill';
            else node.type = 'topic';

            if (node.children) updateTypes(node.children, depth + 1);
        }
    }
    updateTypes(roots, 0);

    return roots;
}
