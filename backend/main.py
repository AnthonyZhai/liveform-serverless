import logging
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body, BackgroundTasks
from . import ai_service
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import shutil
import json
import requests
from typing import List, Optional
from jose import JWTError, jwt
import pandas as pd
from io import BytesIO
from fastapi.responses import HTMLResponse, StreamingResponse
import types

from . import models, schemas, crud, database, utils, schemas_password

# Create DB tables (try-except 处理多 worker 同时创建表的竞争问题)
try:
    models.Base.metadata.create_all(bind=database.engine)
except Exception as e:
    logging.warning(f"Table creation skipped (likely already exists): {e}")

# 首次启动时自动创建默认管理员账号
try:
    db = database.SessionLocal()
    existing_admin = db.query(models.User).filter(models.User.role == "admin").first()
    if not existing_admin:
        default_admin = models.User(
            username="admin",
            hashed_password=utils.get_password_hash("admin123"),
            role="admin",
        )
        db.add(default_admin)
        db.commit()
        logging.info("✅ Default admin user created (username: admin, password: admin123)")
    db.close()
except Exception as e:
    logging.warning(f"Admin seeding skipped: {e}")

app = FastAPI()

# CORS - 从环境变量读取允许的域名
CORS_ORIGINS_STR = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# UPLOAD_DIR completely removed for Vercel Serverless compatibility
# app.mount("/view", StaticFiles(...)) removed, using dynamic route instead

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, utils.SECRET_KEY, algorithms=[utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user(db, username=username)
    if user is None:
        raise credentials_exception
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, utils.SECRET_KEY, algorithms=[utils.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None
    user = crud.get_user(db, username=username)
    return user

# Auth Endpoints
@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users", response_model=List[schemas.User])
def read_all_users(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).offset(skip).limit(limit).all()

@app.put("/users/me", response_model=schemas.User)
async def update_user_me(user_update: schemas.UserBase, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # We only update profile fields, not username/password/role here for simplicity
    return crud.update_user(db, current_user.id, user_update)

@app.put("/users/me/password")
async def change_password(
    password_data: schemas_password.PasswordChange, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    if not utils.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    
    # Update password
    current_user.hashed_password = utils.get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/auth/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user(db, form_data.username)
    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@app.post("/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=403, detail="Registration is disabled by administrator")
    # db_user = crud.get_user(db, username=user.username)
    # if db_user:
    #     raise HTTPException(status_code=400, detail="Username already registered")
    # return crud.create_user(db=db, user=user)

@app.delete("/users/{user_id}")
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.delete_user(db, user_id)
    return {"message": "User deleted successfully"}

@app.post("/users/{user_id}/reset-password")
def reset_user_password_endpoint(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    crud.reset_password(db, user_id)
    return {"message": "Password reset to 123456"}

@app.post("/auth/batch-register")
def batch_register_users(users: List[schemas.BatchRegisterItem], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Optional: Check if current_user is admin/teacher
    created_count = 0
    errors = []
    for user_data in users:
        try:
            db_user = crud.get_user(db, username=user_data.username)
            if not db_user:
                # Use the role provided in user_data, defaulting to "student" if not present
                role = user_data.role if user_data.role else "student"
                user_create = schemas.UserCreate(**user_data.dict(exclude={'role'}), role=role)
                crud.create_user(db=db, user=user_create)
                created_count += 1
        except Exception as e:
            errors.append(f"Error creating {user_data.username}: {str(e)}")
    
    return {"message": f"成功创建 {created_count} 个用户", "errors": errors}

# Task Endpoints
from fastapi import BackgroundTasks
from . import ai_service

# ... (rest of imports)

# ... (create_task function)
@app.post("/tasks", response_model=schemas.Task)
async def create_task(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    html_summary: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task_create = schemas.TaskCreate(title=title, description=description)
    
    import uuid
    task_uuid = str(uuid.uuid4())[:11] # Short UUID like '7UFmOAl7W9M'
    
    html_path = None
    file_path = None
    trigger_ai = False

    if file:
        content_bytes = await file.read()
        try:
            html_content_str = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            html_content_str = content_bytes.decode('gbk', errors='ignore')
            
        html_path = f"view/{task_uuid}/index.html"
        trigger_ai = True
    
    # Custom CRUD call to pass UUID
    db_task = models.Task(
        uuid=task_uuid,
        title=title,
        description=description,
        html_file_path=html_path,
        html_content=html_content_str if trigger_ai else None,
        html_summary=html_summary,
        html_summary_status="processing" if trigger_ai else "idle",
        owner_id=current_user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # AI analysis is now handled by Supabase Edge Functions via Webhook
    # so we just return the task immediately with status="processing"

    return db_task

@app.get("/tasks", response_model=List[schemas.Task])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_tasks(db, user_id=current_user.id)

@app.get("/tasks/{task_uuid}", response_model=schemas.Task)
def read_task(task_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return task

# ... 

@app.put("/tasks/{task_uuid}", response_model=schemas.Task)
async def update_task(
    task_uuid: str,
    background_tasks: BackgroundTasks,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    html_summary: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    if html_summary is not None:
        task.html_summary = html_summary
    
    if file:
        content_bytes = await file.read()
        try:
            html_content_str = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            html_content_str = content_bytes.decode('gbk', errors='ignore')

        task.html_content = html_content_str
        task.html_file_path = f"view/{task_uuid}/index.html"
        task.html_summary_status = "processing"
        
        # AI analysis is now handled by Supabase Edge Functions via Webhook
    
    db.commit()
    db.refresh(task)
    return task

@app.delete("/tasks/{task_uuid}")
def delete_task_endpoint(task_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    crud.delete_task(db, task_uuid)
    return {"message": "Task deleted successfully"}

@app.put("/tasks/{task_uuid}/analysis", response_model=schemas.Task)
async def update_task_analysis(
    task_uuid: str, 
    update_data: schemas.TaskAnalysisUpdate,
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return crud.update_task_analysis(db, task.id, update_data.analysis_result, update_data.analysis_status)

@app.put("/tasks/{task_uuid}/dashboard", response_model=schemas.Task)
async def update_task_dashboard(
    task_uuid: str, 
    update_data: schemas.TaskDashboardUpdate,
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    dashboard_path = None
    if update_data.dashboard_html is not None:
        # Avoid file writing, save to db
        dashboard_path = f"view/{task_uuid}/dashboard.html"
        task.dashboard_content = update_data.dashboard_html # Make sure we save it to Task
        
    return crud.update_task_dashboard(db, task.id, dashboard_path, update_data.dashboard_status)

# Dynamic Serverless File Service
@app.get("/view/{task_uuid}/{filename}")
def view_generated_html(task_uuid: str, filename: str, db: Session = Depends(get_db)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Return index.html
    if filename == "index.html" and task.html_content:
        return HTMLResponse(content=task.html_content)
        
    # Return dashboard data
    if "dashboard" in filename and getattr(task, "dashboard_content", None):
        return HTMLResponse(content=task.dashboard_content)
        
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/tasks/{task_uuid}/export")
def export_task_data(task_uuid: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    submissions = crud.get_submissions(db, task_id=task.id)
    
    # Convert submissions to list of dicts
    data_list = []
    for sub in submissions:
        try:
            # Parse JSON data
            item = json.loads(sub.data)
            # Add metadata
            item['Submission ID'] = sub.id
            item['Submitted At'] = sub.submitted_at.strftime("%Y-%m-%d %H:%M:%S")
            data_list.append(item)
        except:
            continue
            
    if not data_list:
         raise HTTPException(status_code=400, detail="No data to export")

    # Create DataFrame
    df = pd.DataFrame(data_list)
    
    # Reorder columns to put ID and Date first if they exist
    cols = list(df.columns)
    if 'Submission ID' in cols: cols.insert(0, cols.pop(cols.index('Submission ID')))
    if 'Submitted At' in cols: cols.insert(1, cols.pop(cols.index('Submitted At')))
    df = df[cols]

    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Submissions')
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="task_{task_uuid}_data.xlsx"'
    }
    
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# Submission Endpoints
@app.post("/api/submit/{task_uuid}")
async def submit_data(task_uuid: str, request: dict = Body(...), db: Session = Depends(get_db), current_user: Optional[models.User] = Depends(get_current_user_optional)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    logging.info(f"Received submission for task {task_uuid}")
    data_str = json.dumps(request, ensure_ascii=False)
    
    owner_id = current_user.id if current_user else None
    crud.create_submission(db, task_id=task.id, data=data_str, owner_id=owner_id)
    return {"message": "Submission successful"}

@app.get("/api/my-submissions", response_model=List[schemas.Submission])
def read_my_submissions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_my_submissions(db, user_id=current_user.id)

@app.put("/api/submissions/{submission_id}/analysis")
def update_submission_analysis(
    submission_id: int, 
    update_data: schemas.TaskAnalysisUpdate, # Reusing schema or create new one? TaskAnalysisUpdate has analysis_result.
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Teacher or Admin or Owner?
    # Usually Teacher analyzes. Student might view.
    # For now, allow Teacher/Admin.
    if current_user.role not in ["admin", "teacher"]:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    return crud.update_submission_analysis(db, submission_id, update_data.analysis_result)

@app.get("/api/submit/{task_uuid}")
def get_task_submissions(task_uuid: str, db: Session = Depends(get_db)):
    task = crud.get_task_by_uuid(db, task_uuid)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Optional: Verify ownership via token if needed, but requirements said "GET returns all data" implies it might be public or protected.
    # Usually this should be protected. I'll leave it open for now or check header if provided.
    # For MVP, let's keep it simple. But ideally:
    # current_user = Depends(get_current_user) -> check owner.
    # The requirement said "post... submit data, get... obtain all data". It didn't explicitly say "only owner".
    # But strictly speaking, it should be protected.
    # I will allow it without auth for the API requirement, but in the Dashboard we use a different internal API or this one with auth.
    # Let's assume this is the public API.
    submissions = crud.get_submissions(db, task_id=task.id)
    return {"submissions": submissions, "task_title": task.title}

# Analysis Endpoint
@app.post("/api/analyze")
def analyze_data(request: schemas.AnalysisRequest):
    # This acts as a proxy to the AI provider
    if not request.api_key:
        return {"error": "API Key is required"}
    
    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json"
    }
    
    # Auto-fix URL
    target_url = request.api_url
    if target_url and not target_url.endswith("/chat/completions"):
        if target_url.endswith("/"):
            target_url = target_url + "chat/completions"
        else:
            target_url = target_url + "/chat/completions"
    
    payload = {
        "model": request.model or "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a data analyst."},
            {"role": "user", "content": request.prompt}
        ],
        "stream": True 
    }
    
    try:
        # Use a generator to stream the response
        def generate():
            with requests.post(target_url, json=payload, headers=headers, stream=True, timeout=60) as response:
                if response.status_code != 200:
                    # If error, yield error message
                    if response.status_code == 402:
                        yield json.dumps({"error": "API 余额不足 (Insufficient Balance)", "details": "您的 AI 服务商账户余额不足..."})
                    elif response.status_code == 401:
                        yield json.dumps({"error": "API Key 无效 (Unauthorized)", "details": "提供的 API Key 无效..."})
                    else:
                        yield json.dumps({"error": f"AI Provider returned {response.status_code}", "details": response.text})
                    return

                for line in response.iter_lines():
                    if line:
                        decoded_line = line.decode('utf-8')
                        # Check for data: prefix
                        if decoded_line.startswith('data: '):
                            data_str = decoded_line[6:]
                            if data_str.strip() == '[DONE]':
                                break
                            try:
                                data_json = json.loads(data_str)
                                # Extract content delta
                                content = data_json.get('choices', [{}])[0].get('delta', {}).get('content', '')
                                if content:
                                    yield content
                            except:
                                pass
        
        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        return {"error": f"Failed to call AI: {str(e)}"}

# Site Settings
@app.get("/api/settings", response_model=schemas.SiteSettings)
def read_settings(db: Session = Depends(get_db)):
    return crud.get_site_settings(db)

@app.put("/api/settings", response_model=schemas.SiteSettings)
def update_settings(settings: schemas.SiteSettingsBase, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update settings")
    return crud.update_site_settings(db, settings)
