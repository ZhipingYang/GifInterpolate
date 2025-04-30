# GIF 插帧处理器 (GIF Frame Interpolator)

一个基于 React 和 Material UI 构建的 GIF 插帧工具，通过先进的图像插值算法使 GIF 动画更加流畅。

![GIF插帧处理器](screenshots/app-preview.png)

## 功能特点

- 🖼️ 上传和处理任何 GIF 文件
- 🧠 支持多种插帧算法：
  - 线性插值 (快速)
  - 加权插值 (平衡)
  - 双线性插值 (平滑)
  - 运动估计插值 (较好)
  - 光流插值 (高级)
- ⚙️ 可调节插入帧数（1-10帧）
- 📊 显示原始和处理后 GIF 的详细信息
- 🔄 实时处理预览
- 📱 响应式设计，支持移动设备

## 在线演示

访问 [Gif Interpolate](https://Zhipingyang.github.io/GifInterpolate) 体验在线版本。

## 安装与运行

### 前提条件

- Node.js (v14.0 或更高版本)
- npm 或 yarn

### 克隆仓库

```bash
git clone https://github.com/yourusername/GifInterpolate.git
cd GifInterpolate
```

### 安装依赖

使用 npm:

```bash
npm install
```

或使用 yarn:

```bash
yarn
```

### 主要依赖项

项目使用以下关键依赖：

- React 和 React DOM
- TypeScript
- Material UI (@mui/material, @mui/icons-material)
- gif.js (GIF 编码库)
- gifuct-js (GIF 解析库)

### 运行开发服务器

```bash
# 本地运行（推荐）
npm run start:local
# 或
yarn start:local

# 标准启动
npm start
# 或
yarn start
```

应用将在开发模式下运行，访问 [http://localhost:3000](http://localhost:3000) 查看。

## 部署到 GitHub Pages

### 安装 gh-pages 包

```bash
npm install --save-dev gh-pages cross-env
# 或
yarn add --dev gh-pages cross-env
```

### package.json 配置说明

本项目已配置以下脚本用于不同场景：

- `start:local`: 使用空的 PUBLIC_URL 在本地开发（推荐）
- `start`: 标准启动脚本 
- `deploy`: 自动构建并部署到 GitHub Pages

注意：开发时使用 `homepage: "."`，部署时使用 `homepage: "https://ZhipingYang.github.io/GifInterpolate"`。

### 部署应用

```bash
npm run deploy
# 或
yarn deploy
```

这将构建应用并将其部署到 GitHub Pages。

## 使用说明

1. 点击或拖拽上传 GIF 文件
2. 选择插帧算法和要插入的帧数
3. 点击"开始生成插帧GIF"按钮
4. 处理完成后，可以查看和下载插帧后的 GIF

## 注意事项

- 大型 GIF 或使用高级算法（如光流插值）可能需要较长处理时间
- 处理过程中会消耗较多内存，特别是对于大尺寸 GIF
- 对于复杂 GIF，建议使用运动估计插值或光流插值以获得更好效果

## 许可

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！
