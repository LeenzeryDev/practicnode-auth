const express = require('express');
const {isAuthorized, hasRole} = require("../auth");
const path = require("path");
const {User, Role, Product, sequelize} = require('../db');
const router = express.Router();
const bcrypt = require("bcrypt");

router.get('/panel', isAuthorized, hasRole('Администратор'), async (req, res) => {
  const users = await User.findAll({include: [Role]});
  res.render('admin', {users});
});

router.get('/create-user', async (req, res) => {
    try {
        const Roles = await Role.findAll();
        res.render('create-user', {roles: Roles});
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/edit-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId, {include: [Role]});
        const roles = await Role.findAll();
        res.render('edit-user', {user, roles});
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/create-user', express.urlencoded({extended: true}), async (req, res) => {
    const {username, password, roleId} = req.body;
    if (username && password && roleId) {
        try {
            const role = await Role.findByPk(roleId);
            if (!role) {
                return res.status(400).send('Role not found');
            }
            const existingUser = await User.findOne({where: {username}});
            if (existingUser) {
                return res.send('Пользователь с таким именем уже существует');
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({username, password: hashedPassword, roleId: roleId});
            res.redirect('/admin/panel');
        } catch (err) {
            res.status(400).send('Ошибка регистрации: ' + err.message);
        }
    }
});

router.post('/delete-user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        await User.destroy({where: {id: userId}});
        res.redirect('/admin/panel');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/edit-user/:id', express.urlencoded({extended: true}), async (req, res) => {
    try {
        const userId = req.params.id;
        const {username, password, roleId, avatar} = req.body;
        
        const updateData = {
            username: username, 
            password: password, 
            roleId: roleId
        };
        
        if (avatar && avatar.trim() !== '') {
            updateData.avatar = avatar;
        }
        
        await User.update(updateData, {where: {id: userId}});
        res.redirect('/admin/panel');
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
});

router.get('/products', isAuthorized, hasRole('Администратор'), async (req, res) => {
    try {
        const products = await Product.findAll();
        res.render('admin-products', { products });
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/create-product', isAuthorized, hasRole('Администратор'), async (req, res) => {
    res.render('create-product');
});

router.post('/create-product', express.urlencoded({extended: true}), isAuthorized, hasRole('Администратор'), async (req, res) => {
    try {
        const { name, description, price, category, stock, image } = req.body;
        
        const productData = {
            name,
            description,
            price: parseFloat(price),
            category,
            stock: parseInt(stock),
        };

        if (image && image.trim() !== '') {
            productData.image = image;
        }

        await Product.create(productData);
        res.redirect('/admin/products');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error: ' + err.message);
    }
});

router.get('/edit-product/:id', isAuthorized, hasRole('Администратор'), async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        res.render('edit-product', { product });
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/edit-product/:id', express.urlencoded({extended: true}), isAuthorized, hasRole('Администратор'), async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, description, price, category, stock, image } = req.body;
        
        const updateData = {
            name,
            description,
            price: parseFloat(price),
            category,
            stock: parseInt(stock)
        };

        if (image && image.trim() !== '') {
            updateData.image = image;
        }

        await Product.update(updateData, { where: { id: productId }});
        res.redirect('/admin/products');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/delete-product/:id', isAuthorized, hasRole('Администратор'), async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.destroy({ where: { id: productId }});
        res.redirect('/admin/products');
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
