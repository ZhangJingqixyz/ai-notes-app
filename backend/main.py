# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from models import User, Note, Tag, Folder, SessionLocal, init_db, Base, calculate_similarity
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from sqlalchemy import or_
import jieba
from difflib import SequenceMatcher
# import librosa
# import soundfile as sf
# import numpy as np
# from transformers import pipeline
# import pytz

app = FastAPI()

# CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 添加缺失的 get_db 函数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 移除全局import和全局模型加载
# import librosa
# import soundfile as sf
# import numpy as np
# from transformers import pipeline
# import pytz
# summarizer = None
# kw_model = None
# asr_pipeline = None

# Pydantic模型
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class NoteCreate(BaseModel):
    title: str
    content: str
    username: str
    folder_id: Optional[int] = None  # 修正

class NoteUpdate(BaseModel):
    title: str
    content: str
    username: str
    folder_id: Optional[int] = None  # 修正

class ContentRequest(BaseModel):
    content: str
    top_n: int = 5
    max_length: int = 150
    min_length: int = 30

class TagCreate(BaseModel):
    name: str
    color: str = "#409eff"

class FolderCreate(BaseModel):
    name: str
    color: str = "#67c23a"
    parent_id: Optional[int] = None  # 修正

class FolderUpdate(BaseModel):
    name: str
    color: str = "#67c23a"
    parent_id: Optional[int] = None  # 修正

class NoteWithTags(BaseModel):
    id: int
    title: str
    content: str
    updated_at: datetime
    folder_id: Optional[int] = None  # 修正
    folder_name: Optional[str] = None  # 修正
    tags: List[str] = []
    
    class Config:
        from_attributes = True

class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

# 用户注册
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    hashed_password = pwd_context.hash(user.password)
    new_user = User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "注册成功"}

# 用户登录
@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    return {"message": "登录成功"}

# 创建笔记
@app.post("/notes/")
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == note.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查文件夹是否存在
    folder_id = note.folder_id
    if folder_id:
        folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="文件夹不存在")
    
    db_note = Note(
        title=note.title, 
        content=note.content, 
        user_id=user.id,
        folder_id=folder_id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # 获取文件夹名称
    folder_name = None
    if folder_id:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        folder_name = folder.name if folder else None
    
    return {
        "id": db_note.id,
        "title": db_note.title,
        "content": db_note.content,
        "updated_at": db_note.updated_at,
        "folder_id": folder_id,
        "folder_name": folder_name,
        "tags": []
    }

# 获取笔记
@app.get("/notes/{username}")
def get_notes(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    notes = db.query(Note).filter(Note.user_id == user.id).all()
    result = []
    for note in notes:
        # 获取文件夹信息
        folder_name = None
        if note.folder_id:
            folder = db.query(Folder).filter(Folder.id == note.folder_id).first()
            folder_name = folder.name if folder else None
        
        note_data = {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "updated_at": note.updated_at,
            "folder_id": note.folder_id,
            "folder_name": folder_name,
            "tags": [tag.name for tag in note.tags] if note.tags else []
        }
        result.append(note_data)
    return result

# 删除笔记
@app.delete("/notes/{note_id}")
def delete_note(note_id: int, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在或无权限删除")
    db.delete(note)
    db.commit()
    return {"message": "笔记已删除"}

# 更新笔记
@app.put("/notes/{note_id}")
def update_note(note_id: int, note: NoteUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == note.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="笔记不存在或无权限编辑")
    
    # 检查文件夹是否存在
    folder_id = note.folder_id
    if folder_id:
        folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="文件夹不存在")
    
    db_note.title = note.title
    db_note.content = note.content
    db_note.folder_id = folder_id
    db_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_note)
    return {"message": "更新成功", "updated_at": db_note.updated_at}

# AI摘要
@app.post("/summarize/")
def summarize_note(req: ContentRequest):
    # 延迟导入和加载summarizer
    from transformers import pipeline
    global summarizer
    if 'summarizer' not in globals() or summarizer is None:
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    content = req.content
    max_length = req.max_length
    min_length = req.min_length
    # facebook/bart-large-cnn最大输入token约1024，保险起见按1000字符截断
    if not content or len(content) < 20:
        return {"summary": "内容太短，无需摘要"}
    if len(content) > 1000:
        content = content[:1000]
    summary = summarizer(content, max_length=max_length, min_length=min_length, do_sample=False)[0]['summary_text']
    return {"summary": summary}

# 关键词提取
@app.post("/extract_keywords/")
def extract_keywords(req: ContentRequest):
    # 延迟导入和加载KeyBERT
    global kw_model
    if 'kw_model' not in globals() or kw_model is None:
        from keybert import KeyBERT
        kw_model = KeyBERT()
    content = req.content
    top_n = req.top_n
    if not content or len(content) < 10:
        return {"keywords": []}
    keywords = kw_model.extract_keywords(content, top_n=top_n)
    return {"keywords": [kw[0] for kw in keywords]}

# 智能搜索
@app.get("/search/{username}")
def search_notes(username: str, query: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    notes = db.query(Note).filter(
        Note.user_id == user.id,
        or_(
            Note.title.contains(query),
            Note.content.contains(query)
        )
    ).all()
    
    results = []
    for note in notes:
        title_score = calculate_similarity(query, note.title) * 2
        content_score = calculate_similarity(query, note.content)
        total_score = title_score + content_score
        
        results.append({
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "score": total_score,
            "updated_at": note.updated_at
        })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"results": results, "query": query, "count": len(results)}

# 创建标签
@app.post("/tags/")
def create_tag(tag: TagCreate, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    existing_tag = db.query(Tag).filter(Tag.name == tag.name, Tag.user_id == user.id).first()
    if existing_tag:
        return existing_tag
    
    new_tag = Tag(name=tag.name, color=tag.color, user_id=user.id)
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    return new_tag

# 为笔记添加标签
@app.post("/notes/{note_id}/tags")
def add_tags_to_note(note_id: int, tag_names: List[str], username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    
    tags = []
    for tag_name in tag_names:
        tag = db.query(Tag).filter(Tag.name == tag_name, Tag.user_id == user.id).first()
        if not tag:
            tag = Tag(name=tag_name, user_id=user.id)
            db.add(tag)
            db.commit()
            db.refresh(tag)
        tags.append(tag)
    
    note.tags.extend(tags)
    db.commit()
    return {"message": "标签添加成功"}

# 获取用户所有标签
@app.get("/tags/{username}")
def get_user_tags(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    tags = db.query(Tag).filter(Tag.user_id == user.id).all()
    return tags

# 删除/融合原有关键词提取、自动标签API，统一为AI标签API
@app.post("/notes/{note_id}/ai_tags")
def generate_ai_tags(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    user = db.query(User).filter(User.id == note.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    try:
        from keybert import KeyBERT
        global kw_model
        if 'kw_model' not in globals() or kw_model is None:
            kw_model = KeyBERT()
        keywords = kw_model.extract_keywords(note.content, top_n=5)
        tag_names = [kw[0] for kw in keywords]
        # 清空现有标签，避免重复
        note.tags.clear()
        tags = []
        for tag_name in tag_names:
            tag = db.query(Tag).filter(Tag.name == tag_name, Tag.user_id == user.id).first()
            if not tag:
                tag = Tag(name=tag_name, user_id=user.id)
                db.add(tag)
                db.commit()
                db.refresh(tag)
            tags.append(tag)
        note.tags.extend(tags)
        db.commit()
        return {"tags": tag_names}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI标签生成失败: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Hello, AI Notes App!"}

# ========== 文件夹管理API ==========

# 创建文件夹
@app.post("/folders/")
def create_folder(folder: FolderCreate, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查父文件夹是否存在
    if folder.parent_id:
        parent_folder = db.query(Folder).filter(Folder.id == folder.parent_id, Folder.user_id == user.id).first()
        if not parent_folder:
            raise HTTPException(status_code=404, detail="父文件夹不存在")
    
    new_folder = Folder(
        name=folder.name,
        color=folder.color,
        user_id=user.id,
        parent_id=folder.parent_id
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

# 获取用户所有文件夹
@app.get("/folders/{username}")
def get_folders(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    folders = db.query(Folder).filter(Folder.user_id == user.id).all()
    return folders

# 获取文件夹树结构
@app.get("/folders/{username}/tree")
def get_folder_tree(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    def build_tree(parent_id=None):
        folders = db.query(Folder).filter(Folder.user_id == user.id, Folder.parent_id == parent_id).all()
        tree = []
        for folder in folders:
            folder_data = {
                "id": folder.id,
                "name": folder.name,
                "color": folder.color,
                "created_at": folder.created_at,
                "children": build_tree(folder.id)
            }
            tree.append(folder_data)
        return tree
    
    return build_tree()

# 更新文件夹
@app.put("/folders/{folder_id}")
def update_folder(folder_id: int, folder: FolderUpdate, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    db_folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")
    
    # 检查父文件夹是否存在
    if folder.parent_id:
        parent_folder = db.query(Folder).filter(Folder.id == folder.parent_id, Folder.user_id == user.id).first()
        if not parent_folder:
            raise HTTPException(status_code=404, detail="父文件夹不存在")
        # 防止循环引用
        if folder.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="不能将文件夹设为自己的父文件夹")
    
    db_folder.name = folder.name
    db_folder.color = folder.color
    db_folder.parent_id = folder.parent_id
    db.commit()
    db.refresh(db_folder)
    return db_folder

# 删除文件夹
@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")
    
    # 检查是否有子文件夹
    children = db.query(Folder).filter(Folder.parent_id == folder_id).all()
    if children:
        raise HTTPException(status_code=400, detail="请先删除子文件夹")
    
    # 将文件夹中的笔记移到根目录
    notes = db.query(Note).filter(Note.folder_id == folder_id).all()
    for note in notes:
        note.folder_id = None
    
    db.delete(folder)
    db.commit()
    return {"message": "文件夹已删除"}

# 获取文件夹中的笔记
@app.get("/folders/{folder_id}/notes")
def get_folder_notes(folder_id: int, username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    folder = db.query(Folder).filter(Folder.id == folder_id, Folder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="文件夹不存在")
    
    notes = db.query(Note).filter(Note.folder_id == folder_id, Note.user_id == user.id).all()
    result = []
    for note in notes:
        note_data = {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "updated_at": note.updated_at,
            "folder_id": note.folder_id,
            "folder_name": folder.name,
            "tags": [tag.name for tag in note.tags] if note.tags else []
        }
        result.append(note_data)
    return result

@app.post("/change_password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not pwd_context.verify(req.old_password, user.hashed_password):
        return {"msg": "旧密码错误", "msgType": "error"}
    user.hashed_password = pwd_context.hash(req.new_password)
    db.commit()
    return {"msg": "密码修改成功", "msgType": "success"}

def to_shanghai_time(dt: datetime):
    shanghai = pytz.timezone("Asia/Shanghai")
    return dt.astimezone(shanghai)