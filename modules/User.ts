import {DataTypes, Model} from "sequelize";
import {sequelize} from "./Database";

class User extends Model {}

User.init({
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING
    },
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    code : {
        type: DataTypes.INTEGER,
    }
}, {
    sequelize, // Connection Instance
    modelName: 'User' // Model Name
});

export {
    User
}