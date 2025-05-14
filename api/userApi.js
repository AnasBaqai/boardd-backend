'use strict';

const { Router } = require('express')
const { createUser } = require('../controller/user.controller');

class UserAPI {
    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    setupRoutes() {
        let router = this.router;
        router.post('/signup', createUser);
    }

    getRouter() {
        return this.router;
    }

    getRouterGroup() {
        return '/users';
    }
}

module.exports = UserAPI;