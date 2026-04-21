# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLRA 工具分发平台是一个现代化的静态工具分发平台，能够自动从配置文件读取域名列表，动态拉取并展示各个工具的详细信息，提供下载和项目链接功能。平台采用缓存机制提高性能，支持泛域名解析和双清单文件格式。

## Code Architecture

### File Structure
- `index.html` - 主应用文件，包含HTML结构和JavaScript逻辑
- `styles.css` - 分离的CSS样式文件，包含所有样式定义
- `clra_urls.txt` - 配置文件，包含域名列表
- `.github/workflows/sync-manifests.yml` - GitHub Actions工作流配置
- `sync-manifests.js` - 缓存同步脚本（Node.js）
- `manifest-cache/` - 缓存目录，存储manifest文件和元数据

### Key Components

1. **HTML Structure**
   - 响应式布局设计
   - 深色/浅色主题切换
   - 工具卡片网格布局
   - 缓存状态指示器

2. **CSS Features**
   - CSS变量主题系统
   - 现代化卡片设计
   - 水波纹点击效果
   - 响应式设计
   - 错误状态和缓存状态的视觉反馈

3. **JavaScript Modules**
   - 泛域名处理 (`processWildcardDomain`)
   - 配置文件读取 (`loadConfig`)
   - 缓存manifest加载 (`loadCachedManifests`)
   - 工具卡片渲染 (`createToolCard`, `renderTools`)
   - 主题管理 (`toggleTheme`, `initTheme`)
   - 调试日志系统 (`log`)
   - 缓存状态管理 (`updateCacheStatus`)

4. **GitHub Actions Integration**
   - 定时缓存同步工作流
   - 泛域名缓存避免重复生成
   - 双清单文件名支持
   - 错误处理和重试机制

## Configuration Files

### clra_urls.txt Format
```
# 域名列表，每行一个
clib.cc.cd
*.jfglss.icu
maxlhy0424.is-a.dev
*.pp1p.cfd
```

### Manifest Files Format
支持两种文件名格式：

**clra_manifest.json:**
```json
{
  "name": "工具名称",
  "developer": "开发者",
  "version": "版本号",
  "update_content": "更新内容",
  "description": "描述",
  "url": "官网地址",
  "download_url": ["按钮文字:下载地址", "按钮文字2:下载地址2"],
  "icon_url": "图标地址"
}
```

**jfkl_manifest.json:**
```json
{
  "name": "工具名称",
  "developer": "开发者",
  "version": "版本号",
  "update_content": "更新内容",
  "description": "描述",
  "url": "官网地址",
  "download_url": ["按钮文字:下载地址", "按钮文字2:下载地址2"],
  "icon_url": "图标地址"
}
```

### GitHub Actions Workflow (.github/workflows/sync-manifests.yml)
```yaml
name: Sync Manifests
on:
  schedule:
    - cron: '0 6-16/1 * * *'  # 北京时间6-16点每小时执行
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Sync manifests
        run: node sync-manifests.js
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add manifest-cache/
          git commit -m "Update manifest cache" || exit 0
          git push
```

## Development Commands

### File Management
```bash
# 查看当前目录文件
ls

# 创建配置文件
echo "*.example.com" > clra_urls.txt

# 创建示例清单文件
cat > clra_manifest.json << 'EOF'
{
  "name": "示例工具",
  "developer": "开发者",
  "version": "1.0.0",
  "update_content": "修复了若干bug",
  "description": "这是一个示例工具\\n支持多行描述",
  "url": "example.com",
  "download_url": ["下载:example.com/download", "备用下载:example.com/alt"],
  "icon_url": "example.com/icon.png"
}
EOF

# 创建缓存目录
mkdir -p manifest-cache/domains
```

### Testing
```bash
# 启动本地服务器测试（需要Python）
python -m http.server 8000

# 或使用Node.js的http-server
npx http-server

# 手动运行缓存同步
node sync-manifests.js
```

### GitHub Actions
```bash
# 手动触发工作流
gh workflow run sync-manifests.yml

# 查看工作流运行状态
gh run list --workflow=sync-manifests.yml
```

## Key Features

1. **泛域名支持**：自动将 `*` 替换为16位随机字符串，并缓存结果避免重复生成
2. **双清单文件名**：支持 `clra_manifest.json` 和 `jfkl_manifest.json` 两种文件名
3. **缓存机制**：使用GitHub Actions定时同步manifest文件，提高性能和可靠性
4. **错误处理**：CORS错误处理、HTTPS到HTTP自动降级、详细的错误提示
5. **调试系统**：完整的调试日志系统，便于问题排查
6. **主题切换**：支持深色/浅色主题，状态持久化
7. **响应式设计**：适配移动端和桌面端
8. **安全特性**：XSS防护、安全外部链接属性、HTML转义
9. **并行处理**：所有清单文件并行请求，提高加载性能
10. **去重机制**：基于工具名称自动去重，避免重复显示

## Development Guidelines

1. **代码组织**：
   - HTML结构和JavaScript逻辑在index.html中
   - 所有CSS样式已分离到styles.css文件
   - 缓存相关逻辑在GitHub Actions工作流中

2. **样式调整**：
   - 通过CSS变量系统调整主题色彩
   - 使用styles.css文件进行样式修改
   - 保持响应式设计原则

3. **功能扩展**：
   - 在现有JavaScript模块基础上添加新功能
   - 确保与缓存系统兼容
   - 添加适当的调试日志

4. **缓存系统**：
   - 前端现在从manifest-cache/目录加载缓存文件
   - 缓存包含metadata.json用于状态管理
   - 支持缓存失效时的降级机制

5. **测试验证**：
   - 确保泛域名生成和缓存机制正常工作
   - 验证双清单文件名支持
   - 测试CORS错误处理和降级机制

## Deployment

1. **部署准备**：
   - 将 `index.html` 和 `styles.css` 部署到静态网站服务器
   - 确保 `clra_urls.txt` 配置文件存在
   - 配置GitHub Actions工作流（如果需要缓存功能）

2. **缓存部署**：
   - 在GitHub仓库中设置Actions secrets（如果需要）
   - 确保manifest-cache/目录被正确提交和同步
   - 验证缓存状态指示器正常工作

3. **服务器要求**：
   - 支持静态文件服务
   - 支持跨域请求（CORS）或配置代理
   - 推荐使用HTTPS

4. **监控和维护**：
   - 定期检查GitHub Actions工作流运行状态
   - 监控缓存更新频率和成功率
   - 验证manifest文件的有效性

## Troubleshooting

### CORS Issues
- 错误：跨域请求被阻止
- 解决方案：平台已内置HTTP回退机制和详细错误提示
- 检查：确保目标域名支持CORS或提供HTTP访问

### Cache Issues
- 错误：缓存状态显示异常
- 解决方案：检查manifest-cache/目录结构和metadata.json文件
- 验证：手动运行sync-manifests.js脚本测试缓存同步

### Wildcard Domain Issues
- 错误：泛域名解析失败
- 解决方案：检查缓存目录中是否生成了正确的域名文件
- 验证：查看manifest-cache/domains/目录下的文件列表

## Performance Optimization

1. **缓存策略**：使用GitHub Actions定时同步，减少实时请求
2. **并行加载**：所有manifest文件并行请求处理
3. **CDN优化**：使用优化的Font Awesome CDN
4. **CSS分离**：外部CSS文件支持浏览器缓存
5. **错误隔离**：单个域名失败不影响整体加载