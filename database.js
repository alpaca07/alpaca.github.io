// database.js (최종 완성본)

import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config'; // 로컬에서 .env 파일을 사용하기 위해 필요

// Railway나 Docker Compose 같은 배포 환경에서는 DATABASE_URL 환경변수가 필수로 제공되어야 함
if (!process.env.DATABASE_URL) {
  // .env 파일이 없거나 DATABASE_URL이 설정되지 않은 경우 에러 발생
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    dialectOptions: {
      // Railway 같은 클라우드 DB는 보안 연결(SSL)을 필수로 요구하는 경우가 많습니다.
      // 로컬 Docker MySQL에 연결할 때는 이 옵션이 무시될 수 있으므로 호환성을 위해 유지합니다.
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    // 연결 풀링 설정 (안정성 향상)
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
});

// 'User' 모델 (테이블) 정의
const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    // 타임스탬프를 사용하지 않으려면 주석 해제
    // timestamps: false
});

// 'Server' 모델 (테이블) 정의
const Server = sequelize.define('Server', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 25565
    },
    description: {
        type: DataTypes.STRING
    }
});

// User와 Server 모델 간의 관계 설정 (1:N)
User.hasMany(Server, {
    onDelete: 'CASCADE', // 유저가 삭제되면 관련 서버도 삭제
    foreignKey: {
        allowNull: false
    }
});
Server.belongsTo(User);

export { sequelize, User, Server };