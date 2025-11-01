const express = require('express');
const {isAuthorized, hasRole} = require("../auth");
const path = require("path");
const {User, Role, Product, Cart, CartItem, sequelize} = require('../db');
const router = express.Router();

router.post('/cart/add', isAuthorized, async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.session.user;

    if (!productId) {
      return res.json({ success: false, message: 'Не указан ID товара' });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.json({ success: false, message: 'Товар не найден' });
    }

    if (product.stock <= 0) {
      return res.json({ success: false, message: 'Товар отсутствует на складе' });
    }

    let cart = await Cart.findOne({ where: { userId: user.id } });
    if (!cart) {
      cart = await Cart.create({ userId: user.id });
    }

    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId: productId }
    });

    if (cartItem) {
      if (cartItem.quantity < product.stock) {
        cartItem.quantity += 1;
        await cartItem.save();
      } else {
        return res.json({ success: false, message: 'Максимальное количество товара достигнуто' });
      }
    } else {
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId: productId,
        quantity: 1
      });
    }

    res.json({ success: true, message: 'Товар добавлен в корзину' });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.json({ success: false, message: 'Ошибка при добавлении товара: ' + err.message });
  }
});

router.post('/cart/update', isAuthorized, async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const user = req.session.user;

    if (!itemId || !quantity || quantity < 1) {
      return res.json({ success: false, message: 'Неверные параметры' });
    }

    const cartItem = await CartItem.findByPk(itemId, {
      include: [{ model: Product }, { model: Cart }]
    });

    if (!cartItem) {
      return res.json({ success: false, message: 'Элемент корзины не найден' });
    }

    if (cartItem.Cart.userId !== user.id) {
      return res.json({ success: false, message: 'Доступ запрещен' });
    }

    if (quantity > cartItem.Product.stock) {
      return res.json({ success: false, message: `Максимальное количество: ${cartItem.Product.stock}` });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({ success: true, message: 'Количество обновлено' });
  } catch (err) {
    console.error('Error updating cart:', err);
    res.json({ success: false, message: 'Ошибка при обновлении: ' + err.message });
  }
});

router.post('/cart/remove', isAuthorized, async (req, res) => {
  try {
    const { itemId } = req.body;
    const user = req.session.user;

    if (!itemId) {
      return res.json({ success: false, message: 'Не указан ID элемента' });
    }

    const cartItem = await CartItem.findByPk(itemId, {
      include: [{ model: Cart }]
    });

    if (!cartItem) {
      return res.json({ success: false, message: 'Элемент корзины не найден' });
    }
    
    if (cartItem.Cart.userId !== user.id) {
      return res.json({ success: false, message: 'Доступ запрещен' });
    }

    await cartItem.destroy();

    res.json({ success: true, message: 'Товар удален из корзины' });
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.json({ success: false, message: 'Ошибка при удалении: ' + err.message });
  }
});

module.exports = router;
