const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
});

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
})

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roleId: {
        type: DataTypes.INTEGER,
        references: {
            model: Role,
            key: 'id'
        },
        allowNull: false
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    }
});

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    }
});

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    }
});

Role.hasMany(User, {foreignKey: 'roleId'} );
User.belongsTo(Role, {foreignKey: 'roleId'} );

User.hasOne(Cart, {foreignKey: 'userId'});
Cart.belongsTo(User, {foreignKey: 'userId'});

Cart.hasMany(CartItem, {foreignKey: 'cartId'});
CartItem.belongsTo(Cart, {foreignKey: 'cartId'});

Product.hasMany(CartItem, {foreignKey: 'productId'});
CartItem.belongsTo(Product, {foreignKey: 'productId'});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Соединение с БД установлено.');
        await sequelize.sync();

        if(!await Role.findOne({ where: { name: 'Администратор'}})){
            await Role.create({ name: 'Администратор'});
        }
        if(!await Role.findOne({ where: { name: 'Пользователь'}})){
            await Role.create({ name: 'Пользователь'});
        }

        const productCount = await Product.count();
        if (productCount === 0) {
            const books = [
                { name: 'Война и мир', description: 'Эпический роман Льва Толстого о войне 1812 года', price: 899, category: 'Классика', stock: 15 },
                { name: 'Преступление и наказание', description: 'Философский роман Ф.М. Достоевского', price: 799, category: 'Классика', stock: 12 },
                { name: 'Мастер и Маргарита', description: 'Мистический роман Михаила Булгакова', price: 850, category: 'Фантастика', stock: 18 },
                { name: 'Гарри Поттер и философский камень', description: 'Первая книга о юном волшебнике', price: 650, category: 'Фэнтези', stock: 25 },
                { name: '1984', description: 'Антиутопия Джорджа Оруэлла', price: 720, category: 'Научная фантастика', stock: 10 },
                { name: 'Алиса в Стране чудес', description: 'Сказка Льюиса Кэрролла', price: 550, category: 'Детская литература', stock: 20 }
            ];
            await Product.bulkCreate(books);
        }
    } catch (err) {
        console.error('Ошибка подключения к БД:', err);
    }
})();

module.exports = {
    sequelize,
    Role,
    User,
    Product,
    Cart,
    CartItem
}