// database.js (최종 완성본 - 개별 환경변수 사용)

import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config';

// 개별 환경 변수를 사용하여 Sequelize 인스턴스 생성
const sequelize = new Sequelize(
  process.env.MYSQLDATABASE, // 1. 데이터베이스 이름
  process.env.MYSQLUSER,     // 2. 사용자 이름
  process.env.MYSQLPASSWORD, // 3. 비밀번호
  {
    host: process.env.MYSQLHOST, // 4. 호스트 주소
    port: process.env.MYSQLPORT, // 5. 포트 번호
    dialect: 'mysql',
    dialectOptions: {
      // Railway 같은 클라우드 DB는 보안 연결(SSL)을 필수로 요구하는 경우가 많습니다.
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

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
