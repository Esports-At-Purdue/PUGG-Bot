"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const Database_1 = require("./Database");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    username: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: sequelize_1.DataTypes.STRING
    },
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    code: {
        type: sequelize_1.DataTypes.INTEGER,
    }
}, {
    sequelize: Database_1.sequelize,
    modelName: 'User' // Model Name
});
