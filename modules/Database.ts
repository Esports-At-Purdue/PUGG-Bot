import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    storage: 'database.sqlite',
    logging: false,
    dialect: 'sqlite'
});

async function synchronize() {
    await sequelize.sync();
}

export {
    sequelize,
    synchronize
};