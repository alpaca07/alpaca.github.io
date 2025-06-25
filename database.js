// database.js (최종 완성본)

import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config'; // 로컬에서 .env 파일을 사용하기 위해 필요

// Railway 같은 배포 환경에서는 DATABASE_URL 환경변수가 필수로 제공되어야 함
if (!process.env.DATABASE_URL) {
  // 로컬 개발 환경을 위한 대체 URL을 제공하거나, 에러를 발생시킬 수 있습니다.
  // 여기서는 배포 환경을 가정하고 에러를 발생시킵니다.
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    dialectOptions: {
      // Railway 같은 클라우드 DB는 보안 연결(SSL)을 필수로 요구하는 경우가 많습니다.
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    // 연결 풀링 설정 (선택 사항이지만, 안정성에 좋음)
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
        allowNull: false
    },
    description: {
        type: DataTypes.STRING
    }
});

// User와 Server 모델 간의 관계 설정 (1:N)
User.hasMany(Server);
Server.belongsTo(User);

export { sequelize, User, Server };
