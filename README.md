# AI智能笔记App

## 项目简介
AI智能笔记App 是一个集成了人工智能能力的全栈Web应用，支持用户高效记录、管理和智能检索笔记。项目涵盖前端（React）、后端（FastAPI）、数据库（SQLite+SQLAlchemy）、AI模型（文本摘要、关键词提取、语音识别）。

---

## 主要功能
- **用户注册/登录/密码修改**
- **笔记管理**：创建、编辑、删除、分文件夹管理
- **标签管理**：自定义标签、自动标签生成
- **文件夹管理**：支持嵌套、颜色自定义
- **AI能力**：
  - 文本智能摘要（transformers）
  - 关键词提取（KeyBERT）
  - 语音转文字（ASR）
- **智能搜索**：自然语言检索、相关度排序
- **美观UI**：响应式设计、动画、拖拽分栏

---

## 技术栈
- **前端**：React + Vite + CSS
- **后端**：Python、FastAPI、SQLAlchemy、passlib
- **数据库**：SQLite
- **AI/NLP**：transformers、keybert、sentence-transformers、librosa、soundfile
- **其他**：ESLint、Vite、现代前端工程化

---

## 目录结构
```
ai-notes-app/
├── backend/           # 后端FastAPI服务
│   ├── main.py        # 主API入口，AI能力集成
│   ├── models.py      # ORM数据模型
│   └── test.db        # SQLite数据库
├── frontend/          # 前端React项目
│   ├── src/
│   │   ├── App.jsx    # 主页面组件
│   │   ├── main.jsx   # 入口文件
│   │   └── ...
│   ├── public/        # 静态资源
│   ├── package.json   # 前端依赖
│   └── ...
├── README.md          # 项目说明（当前文件）
└── ...
```

---

## 安装与运行

### 1. 后端（FastAPI）
1. 进入 backend 目录：
   ```bash
   cd ai-notes-app/backend
   ```
2. 安装依赖（需提前安装Python 3.10+，建议虚拟环境）：
   ```bash
   pip install fastapi uvicorn sqlalchemy passlib[bcrypt] transformers torch keybert sentence-transformers librosa soundfile
   ```
3. 启动后端服务：
   ```bash
   uvicorn main:app --reload
   ```
   默认接口地址：http://127.0.0.1:8000

### 2. 前端（React + Vite）
1. 进入 frontend 目录：
   ```bash
   cd ai-notes-app/frontend
   ```
2. 安装依赖（需提前安装Node.js 18+）：
   ```bash
   npm install
   ```
3. 启动前端开发服务器：
   ```bash
   npm run dev
   ```
   默认访问地址：http://localhost:5173

---

## 主要亮点
- **AI能力集成**：文本摘要、关键词提取、语音转文字，全部本地推理，无需外部API。
- **全栈开发**：前后端分离，接口联调，数据库建模，工程化实践。
- **用户体验**：美观UI、响应式设计、拖拽分栏、动画细节。
- **工程规范**：代码结构清晰，接口设计合理，易于维护和扩展。
- **可扩展性强**：支持后续增加更多AI能力、协作、云同步等。

---

## 简历推荐描述（示例）
> 独立开发“AI智能笔记”全栈应用，基于React+FastAPI+SQLAlchemy，集成transformers等AI能力，实现文本摘要、关键词提取、语音转文字等功能。支持多用户、多标签、多文件夹管理，具备智能搜索、自动标签等亮点。前后端分离，接口设计规范，UI美观，体验流畅。项目涵盖全栈开发、AI应用、数据库建模、工程化实践等能力。

---

## 致谢与参考
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [HuggingFace Transformers](https://huggingface.co/transformers/)
- [KeyBERT](https://github.com/MaartenGr/KeyBERT)
- [Vite](https://vitejs.dev/)

---