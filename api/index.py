import sys
import os

# 将 backend 目录添加到环境变量，以避免一些相对导入的问题（可选）
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.main import app
