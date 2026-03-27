from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: Optional[str] = "student"
    grade: Optional[str] = None
    class_name: Optional[str] = None
    email: Optional[str] = None
    school: Optional[str] = None
    phone: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_url: Optional[str] = None
    ai_api_key: Optional[str] = None
    post_prompt_template: Optional[str] = None
    analysis_prompt_template: Optional[str] = None
    dashboard_prompt_template: Optional[str] = None

class UserCreate(UserBase):
    password: str

class BatchRegisterItem(BaseModel):
    username: str
    password: str
    grade: Optional[str] = None
    class_name: Optional[str] = None
    email: Optional[str] = None
    school: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "student"

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    uuid: str
    html_content: Optional[str] = None
    html_file_path: Optional[str] = None
    html_summary: Optional[str] = None
    analysis_result: Optional[str] = None
    analysis_status: Optional[str] = "idle"
    html_summary_status: Optional[str] = "idle"
    dashboard_file_path: Optional[str] = None
    dashboard_status: Optional[str] = "idle"
    created_at: datetime
    owner_id: int
    submission_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class TaskAnalysisUpdate(BaseModel):
    analysis_result: Optional[str] = None
    analysis_status: Optional[str] = None

class TaskDashboardUpdate(BaseModel):
    dashboard_html: Optional[str] = None
    dashboard_status: Optional[str] = None

class SubmissionBase(BaseModel):
    data: str

class Submission(SubmissionBase):
    id: int
    task_id: int
    submitted_at: datetime
    owner_id: Optional[int] = None
    analysis_result: Optional[str] = None
    score: Optional[int] = None
    task: Optional[Task] = None
    
    class Config:
        from_attributes = True

class AnalysisRequest(BaseModel):
    data: Optional[List[dict]] = None
    prompt: str
    model: Optional[str] = "deepseek-chat"
    api_url: Optional[str] = "https://api.deepseek.com/v1/chat/completions"
    api_key: Optional[str] = None

class SiteSettingsBase(BaseModel):
    site_name: Optional[str] = "LiveForm"
    logo_url: Optional[str] = None
    background_image_url: Optional[str] = None

class SiteSettings(SiteSettingsBase):
    id: int
    class Config:
        from_attributes = True
