// database.js (수정본)
import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config'; // dotenv를 불러옵니다.

// ✨ 이 부분이 수정되었습니다.
// Railway 같은 서비스에서 제공하는 DATABASE_URL 환경변수를 사용합니다.
// 만약 환경변수가 없다면, 로컬 개발을 위해 기본값을 사용합니다.
const connectionString = process.env.DATABASE_URL || `mysql://root:qwer1234@#@192.168.10.103:3306/mc_community`;

const sequelize = new Sequelize(connectionString, {
    dialect: 'mysql',
    dialectOptions: {
      // SSL 연결이 필요할 경우를 대비한 옵션 (Railway는 종종 필요함)
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
});

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
});

const Server = sequelize.define('Server', {
    name: { type: DataTypes.STRING, allowNull: false },
    host: { type: DataTypes.STRING, allowNull: false },
    port: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING }
});

User.hasMany(Server);
Server.belongsTo(User);

export { sequelize, User, Server };