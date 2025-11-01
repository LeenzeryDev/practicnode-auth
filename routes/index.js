const express = require('express');
const path = require('path');
const { User, Role, Product, Cart, CartItem, sequelize } = require('../db');
const bcrypt = require("bcrypt");
const { isAuthorized, hasRole } = require('../auth');

const router = express.Router();

async function getCartItemsCount(userId) {
  if (!userId) return 0;
  try {
    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) return 0;
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch (err) {
    return 0;
  }
}

router.get('/', (req, res) => {
  res.redirect('/home');
});

router.get('/home', async (req, res) => {
  const user = req.session.user || null;
  const cartItemsCount = user ? await getCartItemsCount(user.id) : 0;
  res.render('home', { user, cartItemsCount });
});

router.get('/catalog', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['name', 'ASC']] });
    const user = req.session.user || null;
    const cartItemsCount = user ? await getCartItemsCount(user.id) : 0;
    res.render('catalog', { products, user, cartItemsCount });
  } catch (err) {
    res.status(500).send('Ошибка загрузки каталога: ' + err.message);
  }
});

router.get('/cart', isAuthorized, async (req, res) => {
  try {
    const user = req.session.user;
    let cart = await Cart.findOne({ where: { userId: user.id } });
    
    if (!cart) {
      cart = await Cart.create({ userId: user.id });
    }

    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{ model: Product }]
    });

    const totalPrice = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.Product.price) * item.quantity);
    }, 0);

    const cartItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.render('cart', { 
      cartItems, 
      totalPrice, 
      user, 
      cartItemsCount 
    });
  } catch (err) {
    res.status(500).send('Ошибка загрузки корзины: ' + err.message);
  }
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register',
    async (req,
           res) => {
  const { username, password } = req.body;
  try {
    const role = await Role.findOne({ where: { name: 'Пользователь' } });
    if (!role) {
      return res.status(400).send('Role not found');
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.send('Пользователь с таким именем уже существует');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, roleId: role.id });
    res.redirect('/login');
  } catch (err) {
    res.status(400).send('Ошибка регистрации: ' + err.message);
  }
});

router.get('/login', (req, res) => {
  res.render('login', { layout: false });
});

router.post(
    '/login',
    async (req,
     res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({where: {username}, include: Role});
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        req.session.user =
            { id: user.id, username: username, password: password, role: user.Role.name };
        if (user.Role.name === 'Администратор') {
          res.redirect('/admin/panel');
        } else {
          res.redirect('/home');
        }
      } else {
        res.status(401).send('Неверное имя пользователя или пароль');
      }
    } else {
      res.status(401).send('Неверное имя пользователя или пароль');
    }
  }
  catch (err) {
    res.status(500).send('Ошибка сервера: ' + err.message);
  }
});

router.get(
    '/profile', isAuthorized,
    hasRole('Пользователь'),
    async (req, res) => {
  const user = req.session.user;
  const cartItemsCount = await getCartItemsCount(user.id);
  res.render('profile', { user, cartItemsCount });
});

router.post('/profileUpdate', isAuthorized, hasRole('Пользователь'), async (req, res) => {
  const { username, password } = req.body;
  const currentUser = req.session.user;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser && existingUser.id !== currentUser.id) {
    return res.send('Пользователь с таким именем уже существует');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.update({ username, password: hashedPassword }, { where: { id: currentUser.id } });
  const updatedUser = await User.findByPk(currentUser.id);
  req.session.user = updatedUser.toJSON();

  res.redirect('/profile');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
