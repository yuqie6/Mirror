// Skill Tree types (设计规范 Section 7)

export type SkillNodeType = 'domain' | 'skill' | 'topic';
export type SkillTrend = 'up' | 'flat' | 'down';

export interface ISkillNode {
    id: string;
    parentId?: string;
    name: string;
    type: SkillNodeType; // Root -> Branch -> Leaf
    level: number;
    xp: number; // 后端 experience
    progress: number; // 后端提供的 0-100 进度
    trend: SkillTrend;
    lastActiveAt: number; // Unix timestamp (ms)
    children?: ISkillNode[];
}

// 后端 DTO (扁平结构) - 匹配 internal/dto/httpapi.go:41
export interface SkillNodeDTO {
    key: string;
    name: string;
    category: string;
    parent_key: string;
    level: number;
    experience: number;
    progress: number; // 0-100，后端已计算
    status: string; // "up" | "flat" | "down"
    last_active: number; // Unix timestamp (ms)
}

// 把扁平 DTO 转换为嵌套树结构
export function buildSkillTree(dtos: SkillNodeDTO[]): ISkillNode[] {
    const nodeMap = new Map<string, ISkillNode>();
    const roots: ISkillNode[] = [];

    // 第一遍：创建所有节点
    for (const dto of dtos) {
        const node: ISkillNode = {
            id: dto.key,
            parentId: dto.parent_key || undefined,
            name: dto.name,
            type: 'topic',
            level: dto.level,
            xp: dto.experience,
            progress: dto.progress, // 使用后端提供的进度
            trend: (dto.status as SkillTrend) || 'flat',
            lastActiveAt: dto.last_active,
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
