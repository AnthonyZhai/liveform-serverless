import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# 从环境变量读取密钥，生产环境必须设置！
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-supersecretkey-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 默认 24 小时

# 启动时检查是否使用了默认密钥
if SECRET_KEY == "dev-only-supersecretkey-change-in-production":
    import warnings
    warnings.warn(
        "⚠️  使用了默认 SECRET_KEY！生产环境请设置环境变量 SECRET_KEY 为一个随机字符串。",
        UserWarning,
        stacklevel=2
    )

# Switched to argon2 because bcrypt has a 72-byte limit and strict backend issues on Windows
# SHA256 hex is 64 bytes, which fits bcrypt, but passlib+bcrypt interaction seems buggy in this env.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
