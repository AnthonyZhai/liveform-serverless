from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student") # admin, teacher, student
    grade = Column(String, nullable=True)
    class_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    school = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # AI Config
    ai_model = Column(String, default="deepseek-chat")
    ai_api_url = Column(String, nullable=True)
    ai_api_key = Column(String, nullable=True)

    # Prompt Templates
    post_prompt_template = Column(Text, nullable=True) # Template for POST prompt in Task Details
    analysis_prompt_template = Column(Text, nullable=True) # Template for Data Analysis prompt
    dashboard_prompt_template = Column(Text, nullable=True) # Template for Data Dashboard prompt

    tasks = relationship("Task", back_populates="owner")
    submissions = relationship("Submission", back_populates="owner")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String, nullable=True)
    html_content = Column(Text, nullable=True) # Optional: Store content directly
    html_file_path = Column(String, nullable=True) # Store path to uploaded file
    html_summary = Column(Text, nullable=True) # AI Summary of the HTML
    analysis_result = Column(Text, nullable=True) # Store AI analysis result
    analysis_status = Column(String, default="idle") # idle, processing, completed, failed
    html_summary_status = Column(String, default="idle") # idle, processing, completed, failed
    dashboard_file_path = Column(String, nullable=True) # Store path to generated dashboard html
    dashboard_content = Column(Text, nullable=True) # Store dashboard HTML content
    dashboard_status = Column(String, default="idle") # idle, processing, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="tasks")
    submissions = relationship("Submission", back_populates="task")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    data = Column(Text) # JSON string
    submitted_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    analysis_result = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)

    task = relationship("Task", back_populates="submissions")
    owner = relationship("User", back_populates="submissions")

class SiteSettings(Base):
    # Not using SQLAlchemy for this one might be simpler if we just want key-value, 
    # but let's stick to SQL for consistency.
    # Actually, a single row table is fine.
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, index=True)
    site_name = Column(String, default="LiveForm")
    logo_url = Column(String, nullable=True)
    background_image_url = Column(String, nullable=True)
    
    # We will enforce only one row exists
