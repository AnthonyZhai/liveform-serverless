import requests
import json
import os
import logging
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models

logger = logging.getLogger(__name__)

def generate_ai_summary_async(task_uuid: str, user_id: int):
    """
    Background task to generate AI summary for HTML content.
    """
    logger.info(f"Starting async AI summary generation for task {task_uuid}")
    db = SessionLocal()
    try:
        # Get task and user
        task = db.query(models.Task).filter(models.Task.uuid == task_uuid).first()
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not task or not user:
            logger.warning(f"Task or User not found for {task_uuid}")
            return

        # Get HTML content from DB
        content = task.html_content
        if not content:
            logger.warning("No HTML content found in task")
            task.html_summary_status = "failed"
            db.commit()
            return
            
        # Prepare prompt
        prompt = f"""你是一个智能助手。请仔细阅读以下HTML内容（可能包含试卷、问卷或表单题目），并用不超过300字简要概述其中的内容。

**重要要求：**
1. 如果HTML中包含题目，请列出每道题目的内容
2. 如果HTML中包含答案信息（例如：value属性、data-correct属性、checked属性、或注释中的答案），请务必提取并标注每道题的正确答案
3. 如果是选择题，请列出所有选项及正确答案
4. 如果是填空题或简答题，请说明题目要求
5. 概述格式应清晰，便于后续进行数据分析（如计算正确率）

HTML内容：
{content[:20000]}"""

        # Call AI API
        api_url = user.ai_api_url
        if api_url and not api_url.endswith("/chat/completions"):
             if api_url.endswith("/"):
                api_url += "chat/completions"
             else:
                api_url += "/chat/completions"
                
        # Default fallback for URL if not set on user but might be set globally or not at all (using deepseek default mainly if user has key)
        # Assuming user config is the source of truth as per current frontend logic
        
        headers = {
            "Authorization": f"Bearer {user.ai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": user.ai_model or "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            "stream": False # No need for stream in backend background task
        }
        
        try:
            logger.info(f"Calling AI API: {api_url}")
            response = requests.post(api_url, json=payload, headers=headers, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                summary = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                if summary:
                    task.html_summary = summary
                    task.html_summary_status = "completed"
                    logger.info(f"AI summary generated for task {task_uuid}")
                else:
                    task.html_summary_status = "failed"
                    logger.warning("Empty response from AI")
            else:
                task.html_summary_status = "failed"
                logger.error(f"AI API failed with status {response.status_code}: {response.text}")
                
        except Exception as e:
            task.html_summary_status = "failed"
            logger.error(f"Exception calling AI: {e}")
            
        db.commit()
        
    except Exception as e:
        logger.error(f"Unexpected error in background task: {e}")
    finally:
        db.close()
