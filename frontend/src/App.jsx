import React, { useState, useEffect, useRef } from "react";

function App() {
  const [mode, setMode] = useState("login"); // "register" or "login"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState(""); // "success" | "error"
  const [currentUser, setCurrentUser] = useState(""); // 登录态
  // 笔记相关
  const [notes, setNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // 新增：AI摘要和关键词提取的状态
  const [aiSummary, setAiSummary] = useState({});
  const [aiKeywords, setAiKeywords] = useState({});

  // 新增摘要长度输入
  const [summaryLength, setSummaryLength] = useState(150);

  // 新增：当前选中的笔记
  const [selectedNote, setSelectedNote] = useState(null);

  // 新增：右侧AI能力区的状态
  const [detailSummary, setDetailSummary] = useState("");
  const [detailKeywords, setDetailKeywords] = useState("");
  const [detailMsg, setDetailMsg] = useState("");

  // 新增：编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // 新增：左侧宽度状态
  const [leftWidth, setLeftWidth] = useState(350);
  const dividerRef = useRef();

  // 新增搜索相关状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 新增标签相关状态
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#409eff");

  // 新增文件夹相关状态
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#67c23a");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);

  // 新增搜索防抖
  const searchTimeout = useRef();
  const fileInputRef = useRef();

  // 在App.jsx顶部
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdMsgType, setPwdMsgType] = useState("");

  // 登录/注册
  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg(""); setMsgType("");
    try {
      const res = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message || "注册成功");
        setMsgType("success");
        setMode("login");
      } else {
        setMsg(data.detail || "注册失败");
        setMsgType("error");
      }
    } catch {
      setMsg("网络错误，请重试");
      setMsgType("error");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg(""); setMsgType("");
    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message || "登录成功");
        setMsgType("success");
        setCurrentUser(username);
        setMsg("");
        fetchNotes(username);
        fetchFolders(username);
        fetchTags(username);
      } else {
        setMsg(data.detail || "登录失败");
        setMsgType("error");
      }
    } catch {
      setMsg("网络错误，请重试");
      setMsgType("error");
    }
  };

  // 获取笔记
  const fetchNotes = async (user) => {
    const res = await fetch(`http://127.0.0.1:8000/notes/${user}`);
    const data = await res.json();
    setNotes(data);
  };

  // 添加笔记
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/notes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          username: currentUser,
          folder_id: selectedFolder?.id || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNoteTitle("");
        setNoteContent("");
        fetchNotes(currentUser);
        setMsg("笔记添加成功"); setMsgType("success");
      } else {
        setMsg(data.detail || "笔记添加失败"); setMsgType("error");
      }
    } catch {
      setMsg("网络错误，请重试"); setMsgType("error");
    }
  };

  // 删除笔记
  const handleDeleteNote = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/notes/${id}?username=${currentUser}`, {
        method: "DELETE",
      });
      fetchNotes(currentUser);
      setMsg("笔记删除成功"); setMsgType("success");
    } catch {
      setMsg("笔记删除失败"); setMsgType("error");
    }
  };

  // AI摘要
  const handleSummarize = async (noteId, content) => {
    setAiSummary(prev => ({ ...prev, [noteId]: "正在生成摘要..." }));
    try {
      const res = await fetch("http://127.0.0.1:8000/summarize/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, max_length: summaryLength, min_length: 30 }),
      });
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();
      setAiSummary(prev => ({ ...prev, [noteId]: data.summary || "生成失败" }));
    } catch (e) {
      setAiSummary(prev => ({ ...prev, [noteId]: "生成失败" }));
    }
  };

  // 关键词提取
  const handleKeywords = async (noteId, content) => {
    setAiKeywords(prev => ({ ...prev, [noteId]: "正在提取关键词..." }));
    try {
      const res = await fetch("http://127.0.0.1:8000/extract_keywords/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("请求失败");
      const data = await res.json();
      setAiKeywords(prev => ({ ...prev, [noteId]: (data.keywords || []).join("，") || "提取失败" }));
    } catch (e) {
      setAiKeywords(prev => ({ ...prev, [noteId]: "提取失败" }));
    }
  };

  // 右侧AI摘要
  const handleDetailSummarize = async () => {
    setDetailMsg("正在生成摘要...");
    try {
      const res = await fetch("http://127.0.0.1:8000/summarize/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedNote.content, max_length: 200, min_length: 40 }),
      });
      const data = await res.json();
      setDetailSummary(data.summary || "生成失败");
      setDetailMsg("");
    } catch {
      setDetailMsg("生成失败");
    }
  };

  // 右侧关键词提取
  const handleDetailKeywords = async () => {
    setDetailMsg("正在提取关键词...");
    try {
      const res = await fetch("http://127.0.0.1:8000/extract_keywords/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: selectedNote.content }),
      });
      const data = await res.json();
      setDetailKeywords((data.keywords || []).join("，") || "提取失败");
      setDetailMsg("");
    } catch {
      setDetailMsg("提取失败");
    }
  };

  // 编辑笔记
  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
  };

  const handleSaveEdit = async () => {
    setDetailMsg("正在保存...");
    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${selectedNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          username: currentUser,
          folder_id: selectedFolder?.id || null,
        }),
      });
      const data = await res.json();
      setDetailMsg("");
      setIsEditing(false);
      // 更新本地selectedNote和notes
      const updatedNote = { 
        ...selectedNote, 
        title: editTitle, 
        content: editContent, 
        updated_at: data.updated_at,
        folder_id: selectedFolder?.id || null,
      };
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
      setMsg("笔记保存成功"); setMsgType("success");
    } catch {
      setDetailMsg("保存失败");
      setMsg("笔记保存失败"); setMsgType("error");
    }
  };

  // 自动加载笔记
  useEffect(() => {
    if (currentUser) {
      fetchNotes(currentUser);
    }
  }, [currentUser]);

  // 获取用户标签
  const fetchTags = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/tags/${currentUser}`);
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error("获取标签失败:", error);
    }
  };

  // 获取用户文件夹
  const fetchFolders = async (user) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/${user}`);
      const data = await res.json();
      setFolders(data);
    } catch (error) {
      console.error("获取文件夹失败:", error);
    }
  };

  // 创建文件夹
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setMsg("文件夹名称不能为空"); setMsgType("error"); return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/?username=${currentUser}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          color: newFolderColor,
          parent_id: null // 或选中的父文件夹id
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("文件夹创建成功"); setMsgType("success");
        setNewFolderName("");
        setNewFolderColor("#67c23a");
        setShowFolderModal(false);
        fetchFolders(currentUser);
      } else {
        setMsg(data.detail || "文件夹创建失败"); setMsgType("error");
      }
    } catch {
      setMsg("网络错误，请重试"); setMsgType("error");
    }
  };

  // 删除文件夹
  const deleteFolder = async (folderId) => {
    try {
      await fetch(`http://127.0.0.1:8000/folders/${folderId}?username=${currentUser}`, {
        method: "DELETE",
      });
      fetchFolders(currentUser);
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
      setMsg("文件夹删除成功"); setMsgType("success");
    } catch {
      setMsg("文件夹删除失败"); setMsgType("error");
    }
  };

  // 更新文件夹
  const updateFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/folders/${editingFolder.id}?username=${currentUser}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          color: newFolderColor
        }),
      });
      const data = await res.json();
      setNewFolderName("");
      setNewFolderColor("#67c23a");
      setShowFolderModal(false);
      setEditingFolder(null);
      fetchFolders(currentUser);
      setMsg("文件夹更新成功"); setMsgType("success");
    } catch {
      setMsg("文件夹更新失败"); setMsgType("error");
    }
  };

  // 为笔记添加标签
  const addTagsToNote = async (noteId, tagNames) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${noteId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_names: tagNames }),
      });
      const data = await res.json();
      fetchNotes(currentUser); // 刷新笔记列表
      setMsg("标签添加成功"); setMsgType("success");
    } catch {
      setMsg("标签添加失败"); setMsgType("error");
    }
  };

  // 自动生成标签
  const generateAutoTags = async (noteId) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/notes/${noteId}/auto_tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 不发送任何请求体
      });
      const data = await res.json();
      fetchNotes(currentUser); // 刷新笔记列表
      setDetailMsg(data.message);
      setMsg(data.message); setMsgType(data.message.includes("成功") ? "success" : "error");
    } catch (error) {
      console.error("自动标签生成失败:", error);
      setDetailMsg("自动标签生成失败");
      setMsg("自动标签生成失败"); setMsgType("error");
    }
  };

  // 在useEffect中加载标签
  useEffect(() => {
    if (currentUser) {
      fetchTags();
    }
  }, [currentUser]);

  // 登出
  const handleLogout = () => {
    setCurrentUser("");
    setUsername("");
    setPassword("");
    setNotes([]);
    setMsg("");
  };

  const handleASR = async () => {
    if (!fileInputRef.current.files[0]) return;
    const formData = new FormData();
    formData.append("file", fileInputRef.current.files[0]);
    setDetailMsg("正在识别语音...");
    try {
      const res = await fetch("http://127.0.0.1:8000/asr/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setDetailMsg("");
      // 直接填入内容输入框
      setNoteContent(data.text || "");
      setMsg("语音识别成功"); setMsgType("success");
    } catch {
      setDetailMsg("识别失败");
      setMsg("语音识别失败"); setMsgType("error");
    }
  };

  // 拖拽调整左侧宽度
  const handleMouseDown = (e) => {
    document.body.style.cursor = "col-resize";
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(220, startWidth + moveEvent.clientX - startX); // 限制最小宽度
      setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // 搜索功能
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/search/${currentUser}?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("搜索失败:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 搜索结果高亮函数
  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const highlightedText = text.replace(regex, '<mark style="background: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // UI
  if (!currentUser) {
    return (
      <div style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        {/* 主容器 - 居中显示 */}
        <div style={{
          width: "100%",
          maxWidth: "1200px",
          maxHeight: "90vh",
          display: "flex",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "32px",
          backdropFilter: "blur(25px)",
          border: "1px solid rgba(255,255,255,0.25)",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)",
          boxSizing: "border-box",
          animation: "fadeInUp 0.8s ease-out"
        }}>
          {/* 左侧产品介绍区域 */}
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            padding: "60px 40px",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* 背景装饰元素 */}
            <div style={{
              position: "absolute",
              top: "10%",
              right: "10%",
              width: "180px",
              height: "180px",
              background: "rgba(255,255,255,0.12)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
              backdropFilter: "blur(10px)"
            }} />
            <div style={{
              position: "absolute",
              bottom: "20%",
              left: "5%",
              width: "140px",
              height: "140px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "50%",
              animation: "float 8s ease-in-out infinite reverse",
              backdropFilter: "blur(8px)"
            }} />
            
            <div style={{textAlign: "center", zIndex: 1, position: "relative"}}>
              <h1 style={{
                fontSize: "3.2rem", 
                marginBottom: "1.5rem", 
                fontWeight: "200",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                letterSpacing: "2px"
              }}>
                AI智能笔记
              </h1>
              <p style={{
                fontSize: "1.2rem", 
                opacity: 0.95, 
                lineHeight: 1.8,
                marginBottom: "2.5rem",
                textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                fontWeight: "300"
              }}>
                智能摘要 • 关键词提取 • 语音转文字<br/>
                让笔记管理更高效、更智能
              </p>
              
              {/* 功能特色展示 */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "2rem",
                marginTop: "3rem",
                maxWidth: "600px",
                margin: "3rem auto 0"
              }}>
                <div style={{
                  textAlign: "center", 
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  backdropFilter: "blur(15px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-8px) scale(1.02)";
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0) scale(1)";
                  e.target.style.background = "rgba(255,255,255,0.15)";
                }}>
                  <div style={{fontSize: "2.5rem", marginBottom: "0.8rem"}}>🤖</div>
                  <div style={{fontSize: "1.1rem", fontWeight: "500"}}>AI驱动</div>
                  <div style={{fontSize: "0.9rem", opacity: 0.8, marginTop: "0.5rem"}}>智能分析内容</div>
                </div>
                <div style={{
                  textAlign: "center", 
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  backdropFilter: "blur(15px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-8px) scale(1.02)";
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0) scale(1)";
                  e.target.style.background = "rgba(255,255,255,0.15)";
                }}>
                  <div style={{fontSize: "2.5rem", marginBottom: "0.8rem"}}>⚡</div>
                  <div style={{fontSize: "1.1rem", fontWeight: "500"}}>高效管理</div>
                  <div style={{fontSize: "0.9rem", opacity: 0.8, marginTop: "0.5rem"}}>快速整理笔记</div>
                </div>
                <div style={{
                  textAlign: "center", 
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  backdropFilter: "blur(15px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-8px) scale(1.02)";
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0) scale(1)";
                  e.target.style.background = "rgba(255,255,255,0.15)";
                }}>
                  <div style={{fontSize: "2.5rem", marginBottom: "0.8rem"}}>🔒</div>
                  <div style={{fontSize: "1.1rem", fontWeight: "500"}}>安全可靠</div>
                  <div style={{fontSize: "0.9rem", opacity: 0.8, marginTop: "0.5rem"}}>数据加密保护</div>
                </div>
              </div>
              
              {/* 底部装饰文字 */}
              <div style={{
                marginTop: "3rem",
                fontSize: "1rem",
                opacity: 0.7,
                fontStyle: "italic",
                fontWeight: "300"
              }}>
                开始你的智能笔记之旅
              </div>
            </div>
          </div>
          
          {/* 右侧登录表单区域 */}
          <div style={{
            width: "480px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(25px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 50px",
            position: "relative",
            borderLeft: "1px solid rgba(255,255,255,0.2)"
          }}>
            <div style={{width: "100%"}}>
              {/* 模式切换按钮 */}
              <div style={{
                display: "flex", 
                justifyContent: "center", 
                marginBottom: "40px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "16px",
                padding: "6px",
                position: "relative",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}>
                <button
                  style={{
                    flex: 1,
                    background: mode==="register"?"linear-gradient(135deg, #667eea, #764ba2)":"transparent", 
                    color: mode==="register"?"#fff":"#fff", 
                    border: "none", 
                    padding: "12px 24px", 
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: mode==="register"?"0 4px 15px rgba(102, 126, 234, 0.3)":"none"
                  }}
                  onClick={()=>{setMode("register"); setMsg("");}}
                >
                  注册
                </button>
                <button
                  style={{
                    flex: 1,
                    background: mode==="login"?"linear-gradient(135deg, #667eea, #764ba2)":"transparent", 
                    color: mode==="login"?"#fff":"#fff", 
                    border: "none", 
                    padding: "12px 24px", 
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: mode==="login"?"0 4px 15px rgba(102, 126, 234, 0.3)":"none"
                  }}
                  onClick={()=>{setMode("login"); setMsg("");}}
                >
                  登录
                </button>
              </div>
              
              {/* 欢迎标题 */}
              <h2 style={{
                textAlign: "center", 
                marginBottom: "40px", 
                color: "#fff", 
                fontWeight: "600",
                fontSize: "1.8rem",
                letterSpacing: "1px",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)"
              }}>
                {mode==="register"?"创建新账户":"欢迎回来"}
              </h2>
              
              {/* 表单 */}
              <form onSubmit={mode==="register"?handleRegister:handleLogin}>
                <div style={{marginBottom: "20px"}}>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "500",
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }}>
                    用户名
                  </label>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                      width: "100%", 
                      padding: "14px 16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "12px",
                      fontSize: "15px",
                      outline: "none",
                      transition: "all 0.3s ease",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.2)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.3)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                
                <div style={{marginBottom: "30px"}}>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "500",
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }}>
                    密码
                  </label>
                  <input
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%", 
                      padding: "14px 16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderRadius: "12px",
                      fontSize: "15px",
                      outline: "none",
                      transition: "all 0.3s ease",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#667eea";
                      e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.2)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.3)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  style={{
                    width: "100%", 
                    padding: "16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                    letterSpacing: "1px"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-3px)";
                    e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
                  }}
                >
                  {mode==="register"?"创建账户":"立即登录"}
                </button>
              </form>
              
              {/* 消息提示 */}
              <div style={{ 
                marginTop: 20,
                textAlign: "center", 
                color: msgType === "success" ? "#67c23a" : "#f56c6c",
                background: msg ? "#fff7f7" : "transparent",
                borderRadius: 8,
                padding: msg ? "8px 0" : 0,
                minHeight: 24
              }}>
                {msg}
              </div>
              
              {/* 底部装饰 */}
              <div style={{
                marginTop: "30px",
                textAlign: "center",
                fontSize: "13px",
                color: "rgba(255,255,255,0.8)"
              }}>
                {mode==="login" ? "还没有账户？" : "已有账户？"}
                <span 
                  style={{
                    color: "#fff",
                    cursor: "pointer",
                    marginLeft: "6px",
                    fontWeight: "500",
                    transition: "all 0.3s ease",
                    textShadow: "0 1px 3px rgba(0,0,0,0.3)"
                  }}
                  onMouseEnter={(e) => e.target.style.color = "#667eea"}
                  onMouseLeave={(e) => e.target.style.color = "#fff"}
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                >
                  {mode==="login" ? "立即注册" : "立即登录"}
                </span>
              </div>
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <span
                  style={{
                    color: "#409eff",
                    cursor: "pointer",
                    fontSize: 13,
                    textDecoration: "underline"
                  }}
                  onClick={() => {
                    setShowChangePwd(true);
                    setPwdMsg("");
                    setOldPwd("");
                    setNewPwd("");
                    setConfirmPwd("");
                  }}
                >
                  忘记密码/修改密码？
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 添加CSS动画 */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        {/* 修复：未登录时也能弹出修改密码模态框 */}
        {showChangePwd && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: 32, minWidth: 320, boxShadow: "0 4px 24px rgba(0,0,0,0.12)"
            }}>
              <h3 style={{ marginBottom: 20, color: "#222" }}>修改密码</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPwdMsg(""); setPwdMsgType("");
                if (!oldPwd || !newPwd || !confirmPwd || (!currentUser && !username)) {
                  setPwdMsg("请填写所有字段"); setPwdMsgType("error"); return;
                }
                if (newPwd !== confirmPwd) {
                  setPwdMsg("两次新密码不一致"); setPwdMsgType("error"); return;
                }
                try {
                  const res = await fetch("http://127.0.0.1:8000/change_password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      username: currentUser || username,
                      old_password: oldPwd,
                      new_password: newPwd
                    })
                  });
                  const data = await res.json();
                  setPwdMsg(data.msg || "未知错误");
                  setPwdMsgType(data.msgType || "error");
                  if (data.msgType === "success") {
                    setTimeout(() => {
                      setShowChangePwd(false);
                      setCurrentUser(""); // 自动登出
                      setUsername(""); setPassword("");
                      setNotes([]); setMsg("密码修改成功，请重新登录"); setMsgType("success");
                    }, 1500);
                  }
                } catch {
                  setPwdMsg("网络错误，请重试"); setPwdMsgType("error");
                }
              }}>
                {!currentUser && (
                  <input
                    type="text"
                    placeholder="用户名"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                  />
                )}
                <input
                  type="password"
                  placeholder="旧密码"
                  value={oldPwd}
                  onChange={e => setOldPwd(e.target.value)}
                  style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                  type="password"
                  placeholder="新密码"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <input
                  type="password"
                  placeholder="确认新密码"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
                <div style={{
                  marginBottom: 12, color: pwdMsgType === "success" ? "#67c23a" : "#f56c6c", minHeight: 20, textAlign: "center"
                }}>{pwdMsg}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button type="submit" style={{
                    padding: "8px 24px", background: "#409eff", color: "#fff", border: "none", borderRadius: 8
                  }}>提交</button>
                  <button type="button" onClick={() => setShowChangePwd(false)} style={{
                    padding: "8px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 8
                  }}>取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 登录后显示双栏布局
  if (currentUser) {
  return (
    <>
        <div style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        display: "flex"
      }}>
        {/* 左侧笔记列表 */}
        <div style={{
          width: leftWidth,
          transition: "width 0.1s",
          background: "#fff",
          borderRight: "1px solid #eee",
          padding: 24,
          boxSizing: "border-box",
          color: "#222",
          minWidth: "300px", // 确保最小宽度
          maxWidth: "600px"  // 限制最大宽度
        }}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <h2 style={{margin: 0, fontSize: 22, color: "#222"}}>我的笔记</h2>
            <div style={{display: "flex", gap: 8}}>
              <button 
                onClick={() => setShowFolderModal(true)} 
                style={{padding: "6px 12px", background: "#67c23a", color: "#fff", border: "none", borderRadius: 4}}
              >
                新建文件夹
              </button>
              <button onClick={handleLogout} style={{padding: "6px 16px", background: "#409eff", color: "#fff", border: "none", borderRadius: 4}}>退出</button>
            </div>
          </div>
          {/* 左侧输入区 */}
          <form onSubmit={handleAddNote} style={{margin: "16px 0", display: "flex", gap: 8, flexDirection: "column"}}>
            <input
              type="text"
              placeholder="标题"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              required
              style={{
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                color: "#222",
                background: "#fff", // 保证白底黑字
                outline: "none"
              }}
            />
            <textarea
              placeholder="内容"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
              rows={4}
              style={{
                padding: 8,
                border: "1px solid #ddd",
                borderRadius: 4,
                resize: "vertical",
                color: "#222",
                background: "#fff", // 保证白底黑字
                outline: "none"
              }}
            />
            {/* 语音转文字入口 - 确保在左侧区域内 */}
            <div style={{
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              flexWrap: "wrap", // 允许换行
              minHeight: "40px" // 确保最小高度
            }}>
              <input 
                type="file" 
                accept=".wav" 
                ref={fileInputRef} 
                style={{
                  flex: "1",
                  minWidth: "120px",
                  maxWidth: "200px"
                }}
              />
              <button 
                type="button" 
                onClick={handleASR} 
                style={{
                  padding: "6px 12px", 
                  background: "#67c23a", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 4,
                  whiteSpace: "nowrap"
                }}
              >
                语音转文字
              </button>
              <span style={{
                color: "#aaa", 
                fontSize: 12,
                whiteSpace: "nowrap"
              }}>
                识别结果自动填入内容
              </span>
            </div>
            <button type="submit" style={{padding: "8px 16px", background: "#67c23a", color: "#fff", border: "none", borderRadius: 4}}>添加</button>
          </form>
          
          {/* 文件夹选择器 */}
          <div style={{marginBottom: 16}}>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
              <span style={{fontSize: 14, color: "#666"}}>文件夹:</span>
              <select
                value={selectedFolder?.id || ""}
                onChange={(e) => {
                  const folderId = e.target.value;
                  if (folderId) {
                    const folder = folders.find(f => f.id == folderId);
                    setSelectedFolder(folder);
                  } else {
                    setSelectedFolder(null);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "#fff",
                  color: "#222"
                }}
              >
                <option value="">所有笔记</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              {selectedFolder && (
                <button
                  onClick={() => setSelectedFolder(null)}
                  style={{
                    padding: "4px 8px",
                    background: "#f56c6c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  清除
                </button>
              )}
            </div>
            {/* 显示当前选中的文件夹 */}
            {selectedFolder && (
              <div style={{
                padding: "8px 12px",
                background: selectedFolder.color + "20",
                border: `1px solid ${selectedFolder.color}`,
                borderRadius: 4,
                fontSize: 13,
                color: selectedFolder.color,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>📁 {selectedFolder.name}</span>
                <div style={{display: "flex", gap: 4}}>
                  <button
                    onClick={() => {
                      setEditingFolder(selectedFolder);
                      setNewFolderName(selectedFolder.name);
                      setNewFolderColor(selectedFolder.color);
                      setShowFolderModal(true);
                    }}
                    style={{
                      padding: "2px 6px",
                      background: "none",
                      border: "none",
                      color: selectedFolder.color,
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => deleteFolder(selectedFolder.id)}
                    style={{
                      padding: "2px 6px",
                      background: "none",
                      border: "none",
                      color: "#f56c6c",
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 左侧搜索框 */}
          <div style={{marginBottom: 16}}>
            <div style={{display: "flex", gap: 8}}>
              <input
                type="text"
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // 实时搜索（防抖）
                  clearTimeout(searchTimeout.current);
                  searchTimeout.current = setTimeout(() => {
                    handleSearch(e.target.value);
                  }, 300);
                }}
                style={{
                  flex: 1,
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  color: "#222",
                  background: "#fff"
                }}
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                style={{
                  padding: "8px 12px",
                  background: "#409eff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                🔍
              </button>
              {isSearching && <span style={{color: "#409eff"}}>搜索中...</span>}
            </div>
            {searchResults.length > 0 && (
              <div style={{marginTop: 8, fontSize: 12, color: "#666"}}>
                找到 {searchResults.length} 条相关笔记
              </div>
            )}
          </div>
          <ul style={{listStyle: "none", padding: 0, margin: 0}}>
            {(searchQuery ? searchResults : notes)
              .filter(note => !selectedFolder || note.folder_id === selectedFolder.id)
              .map(note => (
              <li
                key={note.id}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 6,
                  background: selectedNote && selectedNote.id === note.id ? "#ecf5ff" : "#f9f9f9",
                  cursor: "pointer",
                  border: "1px solid #eee"
                }}
                onClick={() => {
                  setSelectedNote(note);
                  setDetailSummary("");
                  setDetailKeywords("");
                  setDetailMsg("");
                }}
              >
                <div style={{fontWeight: "bold", color: "#222"}}>
                  {searchQuery ? highlightText(note.title, searchQuery) : note.title}
                </div>
                {/* 显示文件夹信息 */}
                {note.folder_name && (
                  <div style={{
                    fontSize: 11,
                    color: "#67c23a",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    📁 {note.folder_name}
                  </div>
                )}
                <div style={{fontSize: 13, color: "#888", margin: "4px 0"}}>
                  {searchQuery ? highlightText(note.content.slice(0, 50), searchQuery) : note.content.slice(0, 30)}
                  {note.content.length > 30 ? "..." : ""}
                </div>
                {/* 显示标签 */}
                {note.tags && note.tags.length > 0 && (
                  <div style={{marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4}}>
                    {note.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 10,
                          background: "#409eff",
                          color: "#fff"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {searchQuery && note.score && (
                  <div style={{fontSize: 11, color: "#409eff"}}>
                    相关度: {(note.score * 100).toFixed(1)}%
                  </div>
                )}
                <div style={{marginTop: 4}}>
                  <button onClick={e => {e.stopPropagation(); handleDeleteNote(note.id);}} style={{color: "#f56c6c", border: "none", background: "none", cursor: "pointer", fontSize: 13}}>删除</button>
                  <button onClick={e => {e.stopPropagation(); generateAutoTags(note.id);}} style={{color: "#67c23a", border: "none", background: "none", cursor: "pointer", fontSize: 13, marginLeft: 8}}>自动标签</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* 拖拽分割线 */}
        <div
          ref={dividerRef}
          style={{
            width: 6,
            cursor: "col-resize",
            background: "#eee",
            zIndex: 2,
            minWidth: "6px"
          }}
          onMouseDown={handleMouseDown}
        />
        {/* 右侧AI智能区 */}
        <div style={{
          flex: 1,
          background: "#222",
          color: "#fff",
          padding: 40,
          minHeight: "100vh",
          minWidth: "400px" // 确保右侧区域最小宽度
        }}>
          {selectedNote ? (
      <div>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    style={{padding: 8, borderRadius: 4, border: "1px solid #ccc", width: "100%", marginBottom: 8}}
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    style={{padding: 8, borderRadius: 4, border: "1px solid #ccc", width: "100%", marginBottom: 8}}
                  />
                  <button onClick={handleSaveEdit} style={{marginRight: 8, padding: "6px 16px", background: "#67c23a", color: "#fff", border: "none", borderRadius: 4}}>保存</button>
                  <button onClick={() => setIsEditing(false)} style={{padding: "6px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 4}}>取消</button>
                </>
              ) : (
                <>
                  <h2 style={{color: "#fff"}}>{selectedNote.title}</h2>
                  <div style={{margin: "16px 0", color: "#eee"}}>{selectedNote.content}</div>
                  <div style={{color: "#aaa", fontSize: 13, marginBottom: 8}}>最后修改时间：{selectedNote.updated_at ? new Date(selectedNote.updated_at).toLocaleString() : "无"}</div>
                  <button onClick={handleEdit} style={{marginBottom: 16, padding: "6px 16px", background: "#409eff", color: "#fff", border: "none", borderRadius: 4}}>编辑</button>
                </>
              )}
              <div style={{marginBottom: 16}}>
                <button onClick={handleDetailSummarize} style={{marginRight: 12, padding: "6px 16px", background: "#409eff", color: "#fff", border: "none", borderRadius: 4}}>AI摘要</button>
                <button onClick={handleDetailKeywords} style={{padding: "6px 16px", background: "#e6a23c", color: "#fff", border: "none", borderRadius: 4}}>关键词提取</button>
              </div>
              {detailMsg && <div style={{marginBottom: 8, color: "#ffd04b"}}>{detailMsg}</div>}
              {detailSummary && <div style={{marginBottom: 8, color: "#b3e19d"}}>摘要：{detailSummary}</div>}
              {detailKeywords && <div style={{marginBottom: 8, color: "#f7ba2a"}}>关键词：{detailKeywords}</div>}
              {/* 预留扩展空间 */}
              <div style={{marginTop: 32}}>
                <h3 style={{color: "#fff"}}>更多AI功能</h3>
                <div style={{color: "#aaa", fontSize: 13}}>更多智能功能正在开发中...</div>
              </div>
            </div>
          ) : (
            <div style={{color: "#aaa", fontSize: 18, textAlign: "center", marginTop: 100}}>点击左侧笔记，体验AI智能功能</div>
          )}
        </div>
      </div>
      
      {/* 文件夹模态框 */}
      {showFolderModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            padding: 24,
            borderRadius: 8,
            width: 400,
            maxWidth: "90vw"
          }}>
            <h3 style={{margin: "0 0 16px 0", color: "#222"}}>
              {editingFolder ? "编辑文件夹" : "新建文件夹"}
            </h3>
            <div style={{marginBottom: 16}}>
              <label style={{display: "block", marginBottom: 8, color: "#666"}}>文件夹名称</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="请输入文件夹名称"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14
                }}
              />
            </div>
            <div style={{marginBottom: 24}}>
              <label style={{display: "block", marginBottom: 8, color: "#666"}}>文件夹颜色</label>
              <input
                type="color"
                value={newFolderColor}
                onChange={(e) => setNewFolderColor(e.target.value)}
                style={{
                  width: 60,
                  height: 40,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              />
            </div>
            <div style={{display: "flex", gap: 12, justifyContent: "flex-end"}}>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setEditingFolder(null);
                  setNewFolderName("");
                  setNewFolderColor("#67c23a");
                }}
                style={{
                  padding: "8px 16px",
                  background: "#f5f5f5",
                  color: "#666",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                取消
              </button>
              <button
                onClick={editingFolder ? updateFolder : createFolder}
                style={{
                  padding: "8px 16px",
                  background: "#67c23a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                {editingFolder ? "更新" : "创建"}
        </button>
            </div>
          </div>
      </div>
      )}

      {/* 修改密码模态框（提升到最外层） */}
      {showChangePwd && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 32, minWidth: 320, boxShadow: "0 4px 24px rgba(0,0,0,0.12)"
          }}>
            <h3 style={{ marginBottom: 20, color: "#222" }}>修改密码</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setPwdMsg(""); setPwdMsgType("");
              if (!oldPwd || !newPwd || !confirmPwd || (!currentUser && !username)) {
                setPwdMsg("请填写所有字段"); setPwdMsgType("error"); return;
              }
              if (newPwd !== confirmPwd) {
                setPwdMsg("两次新密码不一致"); setPwdMsgType("error"); return;
              }
              try {
                const res = await fetch("http://127.0.0.1:8000/change_password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    username: currentUser || username,
                    old_password: oldPwd,
                    new_password: newPwd
                  })
                });
                const data = await res.json();
                setPwdMsg(data.msg || "未知错误");
                setPwdMsgType(data.msgType || "error");
                if (data.msgType === "success") {
                  setTimeout(() => {
                    setShowChangePwd(false);
                    setCurrentUser(""); // 自动登出
                    setUsername(""); setPassword("");
                    setNotes([]); setMsg("密码修改成功，请重新登录"); setMsgType("success");
                  }, 1500);
                }
              } catch {
                setPwdMsg("网络错误，请重试"); setPwdMsgType("error");
              }
            }}>
              {!currentUser && (
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                />
              )}
              <input
                type="password"
                placeholder="旧密码"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
              />
              <input
                type="password"
                placeholder="新密码"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
              />
              <input
                type="password"
                placeholder="确认新密码"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
              />
              <div style={{
                marginBottom: 12, color: pwdMsgType === "success" ? "#67c23a" : "#f56c6c", minHeight: 20, textAlign: "center"
              }}>{pwdMsg}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="submit" style={{
                  padding: "8px 24px", background: "#409eff", color: "#fff", border: "none", borderRadius: 8
                }}>提交</button>
                <button type="button" onClick={() => setShowChangePwd(false)} style={{
                  padding: "8px 24px", background: "#888", color: "#fff", border: "none", borderRadius: 8
                }}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
    );
  }
}

export default App;
