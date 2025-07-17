# backend/models.py
from sqlalchemy import Column, Integer, String, create_engine, ForeignKey, DateTime, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from typing import List
from pydantic import BaseModel
from difflib import SequenceMatcher
import jieba

DATABASE_URL = "sqlite:///./test.db"

Base = declarative_base()

# 中间表：笔记-标签关联
note_tags = Table(
    'note_tags',
    Base.metadata,
    Column('note_id', Integer, ForeignKey('notes.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    color = Column(String, default="#67c23a")
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)  # 支持嵌套文件夹
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="folders")
    parent = relationship("Folder", remote_side=[id], back_populates="children")
    children = relationship("Folder", back_populates="parent")
    notes = relationship("Note", back_populates="folder")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String, default="#409eff")
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="tags")
    notes = relationship("Note", secondary=note_tags, back_populates="tags")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)  # 新增：文件夹ID
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="notes")
    folder = relationship("Folder", back_populates="notes")
    tags = relationship("Tag", secondary=note_tags, back_populates="notes")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    notes = relationship("Note", back_populates="user")
    tags = relationship("Tag", back_populates="user")
    folders = relationship("Folder", back_populates="user")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def calculate_similarity(query: str, text: str) -> float:
    if not query or not text:
        return 0.0
    
    query_lower = query.lower()
    text_lower = text.lower()
    
    if query_lower in text_lower:
        return 1.0
    
    similarity = SequenceMatcher(None, query_lower, text_lower).ratio()
    
    query_words = set()
    text_words = set()
    
    try:
        query_words.update(jieba.cut(query))
        text_words.update(jieba.cut(text))
    except:
        query_words.update(query_lower.split())
        text_words.update(text_lower.split())
    
    query_words.update(query_lower.split())
    text_words.update(text_lower.split())
    
    if query_words:
        keyword_match = len(query_words & text_words) / len(query_words)
    else:
        keyword_match = 0
    
    return max(similarity, keyword_match)