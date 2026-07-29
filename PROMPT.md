# FunnyTools — Claude Code 技能开发提示词

复制以下内容到新对话的开头：

---

我在维护一个 Claude Code 技能仓库：`D:\ALotOfProjects\FunnyTools`

这是一个 monorepo，用于存放我给团队开发的各种 Claude Code 技能（插件）。主要我开发，团队业务人员使用。

## 仓库结构

```
FunnyTools/
├── .claude-plugin/plugin.json   # 插件清单
├── skills/                      # 所有技能目录
│   └── md-to-html/              # 已完成：Markdown 转 HTML
│       ├── SKILL.md             # 技能定义（触发条件 + 工作流）
│       ├── scripts/convert.cjs  # Node.js 零依赖转换引擎
│       ├── assets/themes/       # 5个内置主题 (github/minimal/academic/report/dark)
│       └── references/          # 自定义模板指南
├── README.md
├── LICENSE
└── .gitignore
```

## 技能格式规范

每个技能是 `skills/` 下的一个目录，包含：
- `SKILL.md`（必须）：YAML frontmatter（name, description 触发词）+ 工作流指令
- `scripts/`（可选）：可执行脚本
- `assets/`（可选）：模板、样式等输出资源
- `references/`（可选）：详细文档，按需加载

触发机制：Claude 始终可见各技能的 name + description（~100词），匹配用户请求时自动加载 SKILL.md 并执行。

## 当前状态

- `md-to-html` 技能已完成并测试通过
- Git 仓库已初始化，首次提交完成

## 我的需求

当我需要新增技能或改进现有技能时，我会告诉你具体需求。请：

1. 在 `skills/` 下创建新技能目录
2. 遵循已有的技能格式规范（参考 md-to-html）
3. 确保 SKILL.md 的 description 触发词覆盖足够广
4. 脚本优先使用零依赖方案（Node.js built-in 或 Python standard library）
5. 面向非技术用户，文档和模板要简单易懂

---

**提示**：你也可以根据自己的需求修改这段提示词，比如加上团队信息、常用技能清单、风格偏好等。
