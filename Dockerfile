# Dockerfile

# 1. 기본이 될 이미지 선택 (Node.js 버전 18 사용)
FROM node:18-alpine

# 2. 컨테이너 내부에 앱을 위한 작업 폴더 생성
WORKDIR /app

# 3. package.json과 package-lock.json을 먼저 복사
# (이 파일들이 변경되지 않으면, 다음 단계의 npm install을 캐시하여 빌드 속도 향상)
COPY package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 나머지 모든 프로젝트 파일을 작업 폴더로 복사
COPY . .

# 6. 앱이 3000번 포트를 사용함을 명시
EXPOSE 3000

# 7. 컨테이너가 시작될 때 실행할 명령어 (package.json의 "start" 스크립트 실행)
CMD [ "npm", "start" ]