from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
from passlib.context import CryptContext
import uuid
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

from .utils import get_password_hash, verify_password

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, 
        hashed_password=hashed_password,
        role=user.role,
        grade=user.grade,
        class_name=user.class_name,
        email=user.email,
        school=user.school,
        phone=user.phone,
        ai_model=user.ai_model,
        ai_api_url=user.ai_api_url,
        ai_api_key=user.ai_api_key
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_data: schemas.UserBase):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    
    # Update fields
    if user_data.email is not None: db_user.email = user_data.email
    if user_data.school is not None: db_user.school = user_data.school
    if user_data.phone is not None: db_user.phone = user_data.phone
    
    if user_data.ai_model is not None: db_user.ai_model = user_data.ai_model
    if user_data.ai_api_url is not None: db_user.ai_api_url = user_data.ai_api_url
    if user_data.ai_api_key is not None: db_user.ai_api_key = user_data.ai_api_key
    
    if user_data.post_prompt_template is not None: db_user.post_prompt_template = user_data.post_prompt_template
    if user_data.analysis_prompt_template is not None: db_user.analysis_prompt_template = user_data.analysis_prompt_template
    if user_data.dashboard_prompt_template is not None: db_user.dashboard_prompt_template = user_data.dashboard_prompt_template

    db.commit()
    db.refresh(db_user)
    return db_user

def create_task(db: Session, task: schemas.TaskCreate, user_id: int, html_path: str = None):
    # Generate short UUID
    task_uuid = str(uuid.uuid4())[:8] # Simplified short UUID
    db_task = models.Task(
        uuid=task_uuid,
        title=task.title,
        description=task.description,
        html_file_path=html_path,
        owner_id=user_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task_analysis(db: Session, task_id: int, analysis_result: str = None, analysis_status: str = None):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        if analysis_result is not None:
            db_task.analysis_result = analysis_result
        if analysis_status is not None:
            db_task.analysis_status = analysis_status
        db.commit()
        db.refresh(db_task)
    return db_task

def update_task_dashboard(db: Session, task_id: int, dashboard_path: str = None, dashboard_status: str = None):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        if dashboard_path is not None:
            db_task.dashboard_file_path = dashboard_path
        if dashboard_status is not None:
            db_task.dashboard_status = dashboard_status
        db.commit()
        db.refresh(db_task)
    return db_task

def get_tasks(db: Session, user_id: int):
    try:
        # Aggregate submission counts
        logger.debug(f"Querying tasks for user {user_id}")
        results = db.query(models.Task, func.count(models.Submission.id).label("total_submissions"))\
            .outerjoin(models.Submission, models.Task.id == models.Submission.task_id)\
            .filter(models.Task.owner_id == user_id)\
            .group_by(models.Task.id)\
            .all()
        
        logger.debug(f"Found {len(results)} tasks")
        
        tasks = []
        for task, count in results:
            task.submission_count = count
            tasks.append(task)
        return tasks
    except Exception as e:
        logger.error(f"Error in get_tasks: {e}")
        import traceback
        traceback.print_exc()
        raise e

def get_task_by_uuid(db: Session, task_uuid: str):
    return db.query(models.Task).filter(models.Task.uuid == task_uuid).first()

def delete_task(db: Session, task_uuid: str):
    task = db.query(models.Task).filter(models.Task.uuid == task_uuid).first()
    if task:
        # Manually delete submissions if cascade is not set, or let DB handle it. 
        # Safer to just delete task and let SQLA handle it if relationship is set up, 
        # or we might get integrity error.
        # Let's check models.py first? No, let's just try delete.
        # Actually, let's delete submissions first to be safe.
        db.query(models.Submission).filter(models.Submission.task_id == task.id).delete()
        db.delete(task)
        db.commit()
    return task

def create_submission(db: Session, task_id: int, data: str, owner_id: int = None):
    db_submission = models.Submission(task_id=task_id, data=data, owner_id=owner_id)
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def get_submissions(db: Session, task_id: int):
    return db.query(models.Submission).filter(models.Submission.task_id == task_id).all()

def get_my_submissions(db: Session, user_id: int):
    return db.query(models.Submission).filter(models.Submission.owner_id == user_id).order_by(models.Submission.submitted_at.desc()).all()

def update_submission_analysis(db: Session, submission_id: int, analysis_result: str = None, score: int = None):
    db_sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if db_sub:
        if analysis_result is not None:
            db_sub.analysis_result = analysis_result
        if score is not None:
            db_sub.score = score
        db.commit()
        db.refresh(db_sub)
    return db_sub

def get_site_settings(db: Session):
    settings = db.query(models.SiteSettings).first()
    if not settings:
        settings = models.SiteSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_site_settings(db: Session, settings_data: schemas.SiteSettingsBase):
    settings = get_site_settings(db)
    if settings_data.site_name is not None: settings.site_name = settings_data.site_name
    if settings_data.logo_url is not None: settings.logo_url = settings_data.logo_url
    if settings_data.background_image_url is not None: settings.background_image_url = settings_data.background_image_url
    
    db.commit()
    db.refresh(settings)
    return settings

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        # Manually delete submissions and tasks to ensure cleanup if cascade isn't set, 
        # though models usually should handle this. 
        # For safety/clarity in this specific codebase:
        db.query(models.Submission).filter(models.Submission.owner_id == user.id).delete()
        db.query(models.Task).filter(models.Task.owner_id == user.id).delete()
        db.delete(user)
        db.commit()
    return user

def reset_password(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.hashed_password = get_password_hash("123456")
        db.commit()
        db.refresh(user)
    return user
